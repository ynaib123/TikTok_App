import { useEffect, useRef } from 'react'
import type { AgentEvent } from '../AIAgentsPage'

interface LogTerminalProps {
  events: AgentEvent[]
}

const COLORS: Record<AgentEvent['type'], string> = {
  agent_run_started: '#a855f7',
  agent_tool_call: '#22d3ee',
  agent_run_finished: '#22c55e',
  connected: '#94a3b8',
}

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

function formatPayload(payload: Record<string, unknown>): string {
  const entries = Object.entries(payload).filter(
    ([, v]) => v !== '' && v !== null && v !== undefined,
  )
  if (entries.length === 0) return ''
  return entries.map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`).join(' ')
}

export default function LogTerminal({ events }: LogTerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [events.length])

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>$ tail -f /var/log/agents/anthropic.log</div>
      <div ref={containerRef} style={bodyStyle} role="log" aria-live="polite">
        {events.length === 0 ? (
          <div style={{ opacity: 0.7, padding: '8px 0', lineHeight: 1.6 }}>
            <div style={{ color: '#475569', marginBottom: 6 }}>// awaiting first agent run…</div>
            <div style={{ color: 'rgba(34, 211, 238, 0.7)' }}>
              {'>'} Lance un agent depuis le panneau violet à gauche.
            </div>
            <div style={{ color: 'rgba(34, 211, 238, 0.7)', marginTop: 4 }}>
              {'>'} Chaque ligne ici correspondra à un événement live :
            </div>
            <ul style={{ listStyle: 'none', padding: '4px 0 0 14px', margin: 0 }}>
              <li>
                <span style={{ color: '#a855f7' }}>agent_run_started</span>
                <span style={{ color: '#475569' }}> = l'agent commence à réfléchir</span>
              </li>
              <li>
                <span style={{ color: '#22d3ee' }}>agent_tool_call</span>
                <span style={{ color: '#475569' }}> = il interroge la BD</span>
              </li>
              <li>
                <span style={{ color: '#22c55e' }}>agent_run_finished</span>
                <span style={{ color: '#475569' }}> = il a terminé (status + tokens)</span>
              </li>
            </ul>
            <div style={{ color: '#475569', marginTop: 8 }}>
              // Sans clé Anthropic, le bouton Run renverra 501 et rien
              <br />
              // ne s'affichera ici. Configure ANTHROPIC_API_KEY pour activer.
            </div>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} style={lineStyle}>
              <span style={{ color: '#475569' }}>{formatTime(event.ts)}</span>
              <span style={{ color: COLORS[event.type] || '#cbd5e1', marginLeft: 6 }}>
                {event.type}
              </span>
              <span style={{ color: '#cbd5e1', marginLeft: 8 }}>
                {formatPayload(event.payload)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  fontFamily: '"Fira Code", "Consolas", monospace',
  background: '#000',
  color: '#22d3ee',
  fontSize: 12,
  lineHeight: 1.5,
}
const headerStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'rgba(34, 211, 238, 0.06)',
  borderBottom: '1px solid rgba(34, 211, 238, 0.18)',
  color: '#22d3ee',
  letterSpacing: 0.4,
}
const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 12,
  fontVariantNumeric: 'tabular-nums',
}
const lineStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  paddingBottom: 2,
}
