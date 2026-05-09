import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AdminShell from '../components/AdminShell'
import '../styles/features/ai-agents.css'

const AgentsScene = lazy(() => import('./ai-agents/AgentsScene'))
const LogTerminal = lazy(() => import('./ai-agents/LogTerminal'))

export interface AgentEvent {
  id: number
  ts: number
  type: 'agent_run_started' | 'agent_tool_call' | 'agent_run_finished' | 'connected'
  payload: Record<string, unknown>
}

const MAX_EVENTS = 200

type StreamStatus = 'connecting' | 'live' | 'reconnecting' | 'closed'

/**
 * AI Agents supervision page — 3D flux + Matrix terminal driven by the
 * /api/ai/agents/stream SSE endpoint.
 *
 * The body is rendered via {@code position: fixed} so it spans the entire
 * viewport minus the AdminShell navbar (top) and sidebar (left). Both
 * offsets read CSS vars from foundation/core.css so they track sidebar
 * collapse via :has(.sidebar-collapsed) without extra wiring.
 */
export default function AIAgentsPage() {
  const { t } = useTranslation('common')
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('connecting')
  const [sidebarRightEdge, setSidebarRightEdge] = useState<number>(0)
  const idCounterRef = useRef(0)

  // Track the sidebar's actual right-edge in pixels so the AI Agents content
  // sits flush against it regardless of theme overrides, scrollbars or
  // border-right offsets. ResizeObserver fires on every collapse animation
  // frame so the page slides in lockstep with the sidebar.
  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>('.admin-context-sidebar')
    if (!sidebar) return undefined
    const update = () => {
      const rect = sidebar.getBoundingClientRect()
      setSidebarRightEdge(Math.round(rect.right))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(sidebar)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    const source = new EventSource('/api/ai/agents/stream', { withCredentials: true })
    const onEvent = (type: AgentEvent['type']) => (e: MessageEvent) => {
      let payload: Record<string, unknown> = {}
      try {
        payload = JSON.parse(e.data)
      } catch {
        /* keep empty payload */
      }
      idCounterRef.current += 1
      setEvents((prev) => {
        const next = [...prev, { id: idCounterRef.current, ts: Date.now(), type, payload }]
        return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
      })
    }
    source.onopen = () => setStreamStatus('live')
    source.onerror = () => {
      // EventSource auto-reconnects unless readyState is CLOSED. Mirror that
      // truth into the UI : we only flip to "closed" when the browser gave up.
      setStreamStatus(source.readyState === EventSource.CLOSED ? 'closed' : 'reconnecting')
    }
    source.addEventListener('agent_run_started', onEvent('agent_run_started') as EventListener)
    source.addEventListener('agent_tool_call', onEvent('agent_tool_call') as EventListener)
    source.addEventListener('agent_run_finished', onEvent('agent_run_finished') as EventListener)
    return () => source.close()
  }, [])

  const statusColor: Record<StreamStatus, string> = {
    connecting: '#94a3b8',
    live: '#22c55e',
    reconnecting: '#f59e0b',
    closed: '#ef4444',
  }
  const statusLabel: Record<StreamStatus, string> = {
    connecting: 'connecting…',
    live: 'live',
    reconnecting: 'reconnecting…',
    closed: t('errors.network'),
  }

  return (
    <AdminShell activeNavId="ai-agents">
      <div className="ai-agents-page" style={{ ...pageStyle, left: sidebarRightEdge }}>
        <header style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 22 }}>AI Agents Supervision</h1>
          <span style={{ ...statusDotStyle, background: statusColor[streamStatus] }} />
          <span style={{ fontSize: 12, opacity: 0.7 }}>{statusLabel[streamStatus]}</span>
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
    </AdminShell>
  )
}

function SceneFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 13,
      }}
    >
      Loading 3D scene…
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  position: 'fixed',
  top: 'var(--admin-nav-height, 78px)',
  // left + transition are set by ai-agents.css so they can react to the
  // .sidebar-collapsed class on the parent .admin-console-page.
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  background: '#000',
  color: '#fff',
  zIndex: 1,
}
const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 18px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  flex: '0 0 auto',
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
