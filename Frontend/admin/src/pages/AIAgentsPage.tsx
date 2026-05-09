import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AdminShell from '../components/AdminShell'
import type { NodeId, SceneNode } from './ai-agents/agentNodes'
import '../styles/features/ai-agents.css'

const AgentsScene = lazy(() => import('./ai-agents/AgentsScene'))
const ActivityToolbar = lazy(() => import('./ai-agents/ActivityToolbar'))
const AgentDetailsModal = lazy(() => import('./ai-agents/AgentDetailsModal'))

export interface AgentEvent {
  id: number
  ts: number
  type: 'agent_run_started' | 'agent_tool_call' | 'agent_run_finished' | 'connected'
  payload: Record<string, unknown>
}

const MAX_EVENTS = 200
type StreamStatus = 'connecting' | 'live' | 'reconnecting' | 'closed'

/**
 * AI Agents supervision page — full redesign matching the OpenAI-flavoured
 * admin theme. Two-column layout : a 340px toolbar on the left (runner +
 * live activity), and a fully interactive 3D canvas on the right with
 * professional agent meshes (operator humanoid, brain orb, server rack,
 * Postgres disk stack). Clicking any node opens a details modal.
 */
export default function AIAgentsPage() {
  const { t } = useTranslation('common')
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('connecting')
  const [sidebarRightEdge, setSidebarRightEdge] = useState<number>(0)
  const [selectedNode, setSelectedNode] = useState<SceneNode | null>(null)
  const idCounterRef = useRef(0)

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
      setStreamStatus(source.readyState === EventSource.CLOSED ? 'closed' : 'reconnecting')
    }
    source.addEventListener('agent_run_started', onEvent('agent_run_started') as EventListener)
    source.addEventListener('agent_tool_call', onEvent('agent_tool_call') as EventListener)
    source.addEventListener('agent_run_finished', onEvent('agent_run_finished') as EventListener)
    return () => source.close()
  }, [])

  const statusColor: Record<StreamStatus, string> = {
    connecting: '#9c9c9c',
    live: '#12b76a',
    reconnecting: '#ffc36f',
    closed: '#ef4444',
  }
  const statusLabel: Record<StreamStatus, string> = {
    connecting: events.length === 0 ? "en attente d'un événement" : 'connecting…',
    live: 'live',
    reconnecting: 'reconnecting…',
    closed: t('errors.network'),
  }

  const selectedNodeId: NodeId | null = selectedNode?.id ?? null

  return (
    <AdminShell activeNavId="ai-agents">
      <div
        className="ai-agents-page"
        style={{
          position: 'fixed',
          top: 'var(--admin-nav-height, 78px)',
          left: sidebarRightEdge,
          right: 0,
          bottom: 0,
        }}
      >
        <div className="ai-agents-layout">
          <Suspense fallback={<ToolbarFallback />}>
            <ActivityToolbar
              events={events}
              streamLabel={statusLabel[streamStatus]}
              streamColor={statusColor[streamStatus]}
            />
          </Suspense>
          <div className="ai-agents-stage">
            <div className="ai-agents-stage-hud">
              <span>Cliquez un nœud pour voir ses détails</span>
              <span className="ai-agents-stage-hud-hint">drag = orbiter · scroll = zoom</span>
            </div>
            <Suspense fallback={<SceneFallback />}>
              <AgentsScene
                events={events}
                onSelectNode={setSelectedNode}
                selectedNodeId={selectedNodeId}
              />
            </Suspense>
          </div>
        </div>
        <Suspense fallback={null}>
          <AgentDetailsModal node={selectedNode} onClose={() => setSelectedNode(null)} />
        </Suspense>
      </div>
    </AdminShell>
  )
}

function SceneFallback() {
  return <div className="ai-agents-stage-loading">Chargement de la scène 3D…</div>
}

function ToolbarFallback() {
  return <div className="ai-toolbar ai-toolbar-loading">Chargement de la console…</div>
}
