import { useEffect, useRef, useState } from 'react'
import type { AgentEvent } from '../AIAgentsPage'

interface AgentDefinition {
  agentId: string
  displayName: string
  description: string
  modelId: string
  scope: string
  allowedToolNames: string[]
}

interface AgentRunResponse {
  runId: number
  status: string
  output: { text?: string } | null
  errorMessage: string | null
}

interface ActivityToolbarProps {
  events: AgentEvent[]
  streamLabel: string
  streamColor: string
}

const DEFAULT_PROMPT = "Que faire en priorité aujourd'hui pour faire avancer la pipeline TikTok ?"

const EVENT_LABEL: Record<AgentEvent['type'], string> = {
  agent_run_started: 'start',
  agent_tool_call: 'tool',
  agent_run_finished: 'end',
  connected: 'sse',
}

const EVENT_COLOR: Record<AgentEvent['type'], string> = {
  agent_run_started: '#ffc36f',
  agent_tool_call: '#22d3ee',
  agent_run_finished: '#12b76a',
  connected: '#9c9c9c',
}

export default function ActivityToolbar({
  events,
  streamLabel,
  streamColor,
}: ActivityToolbarProps) {
  const [agents, setAgents] = useState<AgentDefinition[] | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string>('strategist')
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT)
  const [running, setRunning] = useState<boolean>(false)
  const [lastResponse, setLastResponse] = useState<AgentRunResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activityRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/ai/agents', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: AgentDefinition[]) => {
        if (cancelled) return
        setAgents(data)
        if (data.length > 0 && !data.some((a) => a.agentId === 'strategist')) {
          setSelectedAgent(data[0].agentId)
        }
      })
      .catch((e: Error) => !cancelled && setError(`Liste agents indisponible : ${e.message}`))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (activityRef.current) activityRef.current.scrollTop = activityRef.current.scrollHeight
  }, [events.length])

  const runAgent = async () => {
    if (!selectedAgent || running) return
    setRunning(true)
    setError(null)
    try {
      const response = await fetch(`/api/ai/agents/${selectedAgent}/run`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { text: prompt } }),
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status} ${text.slice(0, 200)}`)
      }
      const data: AgentRunResponse = await response.json()
      setLastResponse(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const selectedDef = agents?.find((a) => a.agentId === selectedAgent) ?? null

  return (
    <aside className="ai-toolbar" aria-label="Outils et activité">
      <header className="ai-toolbar-header">
        <div>
          <p className="ai-toolbar-kicker">AI Agents</p>
          <h2>Console</h2>
        </div>
        <div className="ai-toolbar-status">
          <span className="ai-toolbar-status-dot" style={{ background: streamColor }} />
          <span>{streamLabel}</span>
        </div>
      </header>

      <section className="ai-toolbar-section" aria-label="Lancer un agent">
        <h3>Lancer un agent</h3>
        <label className="ai-field">
          <span className="ai-field-label">Agent</span>
          <select
            className="ai-input"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            disabled={!agents}
          >
            {agents === null ? (
              <option>Chargement…</option>
            ) : (
              agents.map((a) => (
                <option key={a.agentId} value={a.agentId}>
                  {a.displayName}
                </option>
              ))
            )}
          </select>
        </label>

        {selectedDef ? (
          <p className="ai-toolbar-helper">
            <strong>{selectedDef.modelId}</strong>
            <br />
            {selectedDef.description}
            {selectedDef.allowedToolNames.length > 0 ? (
              <>
                <br />
                <span className="ai-toolbar-helper-muted">
                  Outils : {selectedDef.allowedToolNames.join(', ')}
                </span>
              </>
            ) : null}
          </p>
        ) : null}

        <label className="ai-field">
          <span className="ai-field-label">Prompt</span>
          <textarea
            className="ai-input ai-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
        </label>

        <button
          type="button"
          className="ai-button"
          onClick={runAgent}
          disabled={running || !selectedAgent || !agents}
        >
          {running ? 'Run en cours…' : 'Run agent'}
        </button>

        {error ? <div className="ai-alert">{error}</div> : null}

        {lastResponse ? (
          <div className="ai-response">
            <div className="ai-response-head">
              <span>Run #{lastResponse.runId}</span>
              <span className={`ai-response-status is-${lastResponse.status.toLowerCase()}`}>
                {lastResponse.status}
              </span>
            </div>
            <pre>{lastResponse.output?.text || lastResponse.errorMessage || '(no output)'}</pre>
          </div>
        ) : null}
      </section>

      <section className="ai-toolbar-section ai-toolbar-section-grow" aria-label="Activité live">
        <h3>Activité live</h3>
        <div className="ai-activity" ref={activityRef} role="log" aria-live="polite">
          {events.length === 0 ? (
            <div className="ai-activity-empty">
              <p>Aucun événement pour le moment.</p>
              <p className="ai-activity-empty-hint">
                Clique <strong>Run agent</strong> ci-dessus. Chaque ligne ici reflète un événement
                SSE du backend.
              </p>
            </div>
          ) : (
            events
              .slice()
              .reverse()
              .map((event) => (
                <div key={event.id} className="ai-activity-row">
                  <span className="ai-activity-time">{formatTime(event.ts)}</span>
                  <span
                    className="ai-activity-tag"
                    style={{ borderColor: EVENT_COLOR[event.type], color: EVENT_COLOR[event.type] }}
                  >
                    {EVENT_LABEL[event.type]}
                  </span>
                  <span className="ai-activity-payload">{formatPayload(event.payload)}</span>
                </div>
              ))
          )}
        </div>
      </section>
    </aside>
  )
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

function formatPayload(payload: Record<string, unknown>): string {
  const keep = ['agentId', 'tool', 'status', 'tokensIn', 'tokensOut', 'durationMs', 'runId']
  const entries = Object.entries(payload).filter(
    ([k, v]) => keep.includes(k) && v !== '' && v !== null && v !== undefined,
  )
  if (entries.length === 0) return ''
  return entries
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' · ')
}
