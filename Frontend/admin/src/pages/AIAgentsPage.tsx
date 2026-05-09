import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const AgentsScene = lazy(() => import('./ai-agents/AgentsScene'))
const LogTerminal = lazy(() => import('./ai-agents/LogTerminal'))

export interface AgentEvent {
  id: number
  ts: number
  type: 'agent_run_started' | 'agent_tool_call' | 'agent_run_finished' | 'connected'
  payload: Record<string, unknown>
}

const MAX_EVENTS = 200

/**
 * AI Agents supervision page — 3D flux + Matrix terminal driven by the
 * /api/ai/agents/stream SSE endpoint.
 */
export default function AIAgentsPage() {
  const { t } = useTranslation('common')
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [connected, setConnected] = useState(false)
  const idCounterRef = useRef(0)

  useEffect(() => {
    const source = new EventSource('/api/ai/agents/stream', { withCredentials: true })
    const onEvent = (type: AgentEvent['type']) => (e: MessageEvent) => {
      let payload: Record<string, unknown> = {}
      try { payload = JSON.parse(e.data) } catch { /* keep empty payload */ }
      idCounterRef.current += 1
      setEvents((prev) => {
        const next = [...prev, { id: idCounterRef.current, ts: Date.now(), type, payload }]
        return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
      })
    }
    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)
    source.addEventListener('agent_run_started', onEvent('agent_run_started') as EventListener)
    source.addEventListener('agent_tool_call', onEvent('agent_tool_call') as EventListener)
    source.addEventListener('agent_run_finished', onEvent('agent_run_finished') as EventListener)
    return () => source.close()
  }, [])

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: 22 }}>AI Agents Supervision</h1>
        <span style={{ ...statusDotStyle, background: connected ? '#22c55e' : '#ef4444' }} />
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {connected ? 'live' : t('errors.network')}
        </span>
      </header>
      <div style={mainStyle}>
        <div style={sceneStyle}>
          <Suspense fallback={<SceneFallback />}>
            <AgentsScene events={events} />
          </Suspense>
        </div>
        <aside style={asideStyle}>
          <Suspense fallback={<div style={{ padding: 12 }}>Loading terminal…</div>}>
            <LogTerminal events={events} />
          </Suspense>
        </aside>
      </div>
    </div>
  )
}

function SceneFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: 13,
    }}>Loading 3D scene…</div>
  )
}

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#000',
  color: '#fff',
}
const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 18px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
}
const statusDotStyle: React.CSSProperties = { width: 10, height: 10, borderRadius: '50%' }
const mainStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 360px',
  gap: 0,
  flex: 1,
  minHeight: 0,
}
const sceneStyle: React.CSSProperties = {
  position: 'relative',
  background: 'radial-gradient(circle at center, #0b1420 0%, #000 80%)',
  minHeight: 0,
}
const asideStyle: React.CSSProperties = {
  borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
  background: '#000',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
}
