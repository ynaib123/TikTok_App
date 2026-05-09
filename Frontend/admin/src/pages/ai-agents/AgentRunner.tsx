import { useEffect, useState } from 'react'

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

const DEFAULT_PROMPT = "Que faire en priorité aujourd'hui pour faire avancer la pipeline TikTok ?"

/**
 * Interactive launcher for the registered AI agents. Posts to
 * POST /api/ai/agents/{agentId}/run, displays the response, and lets the
 * SSE stream visualize the run on the 3D scene + Matrix terminal.
 */
export default function AgentRunner() {
  const [agents, setAgents] = useState<AgentDefinition[] | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string>('strategist')
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT)
  const [running, setRunning] = useState<boolean>(false)
  const [lastResponse, setLastResponse] = useState<AgentRunResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    <section
      aria-label="Lancer un agent"
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        width: 380,
        background: 'rgba(0, 0, 0, 0.78)',
        border: '1px solid rgba(168, 85, 247, 0.32)',
        borderRadius: 12,
        padding: 14,
        backdropFilter: 'blur(8px)',
        zIndex: 10,
        color: '#e2e8f0',
        fontSize: 13,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#a855f7',
            boxShadow: '0 0 8px #a855f7',
          }}
        />
        <strong style={{ fontSize: 13, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Lancer un agent
        </strong>
      </header>

      <label style={labelStyle}>
        Agent
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          style={inputStyle}
          disabled={!agents}
        >
          {agents === null ? (
            <option>Chargement…</option>
          ) : (
            agents.map((a) => (
              <option key={a.agentId} value={a.agentId}>
                {a.displayName} ({a.agentId})
              </option>
            ))
          )}
        </select>
      </label>

      {selectedDef ? (
        <p style={{ margin: '6px 0 10px', opacity: 0.7, fontSize: 12, lineHeight: 1.45 }}>
          {selectedDef.description}
          {selectedDef.allowedToolNames.length > 0 ? (
            <>
              <br />
              <span style={{ opacity: 0.6 }}>
                Outils : {selectedDef.allowedToolNames.join(', ')}
              </span>
            </>
          ) : null}
        </p>
      ) : null}

      <label style={labelStyle}>
        Prompt
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 64, fontFamily: 'inherit' }}
        />
      </label>

      <button
        type="button"
        onClick={runAgent}
        disabled={running || !selectedAgent || !agents}
        style={{
          width: '100%',
          marginTop: 10,
          padding: '8px 12px',
          background: running ? 'rgba(168, 85, 247, 0.4)' : '#a855f7',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 13,
          cursor: running ? 'progress' : 'pointer',
          letterSpacing: 0.3,
        }}
      >
        {running ? 'Run en cours…' : 'Run'}
      </button>

      {error ? (
        <p
          style={{
            margin: '10px 0 0',
            padding: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            color: '#fca5a5',
            fontSize: 12,
            wordBreak: 'break-word',
          }}
        >
          {error}
        </p>
      ) : null}

      {lastResponse ? (
        <div
          style={{
            marginTop: 10,
            padding: 8,
            background: 'rgba(34, 211, 238, 0.06)',
            border: '1px solid rgba(34, 211, 238, 0.25)',
            borderRadius: 6,
            fontSize: 12,
            maxHeight: 180,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Run #{lastResponse.runId} · {lastResponse.status}
          </div>
          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: 12,
              opacity: 0.9,
            }}
          >
            {lastResponse.output?.text || lastResponse.errorMessage || '(no output)'}
          </pre>
        </div>
      ) : null}
    </section>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  opacity: 0.75,
  marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 6,
  color: '#e2e8f0',
  padding: '6px 8px',
  fontSize: 13,
  outline: 'none',
  textTransform: 'none',
  letterSpacing: 0,
}
