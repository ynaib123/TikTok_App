import { useState } from 'react'

/**
 * Compact bottom-left legend explaining what every part of the
 * AI Agents Supervision page does. Collapsible so it doesn't take
 * up real estate once the operator knows the layout.
 */
export default function HelpLegend() {
  const [open, setOpen] = useState<boolean>(true)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={collapsedButtonStyle}
        aria-label="Afficher la légende"
      >
        ?
      </button>
    )
  }

  return (
    <aside aria-label="Légende" style={panelStyle}>
      <header style={headerStyle}>
        <strong style={{ fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Légende
        </strong>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={closeButtonStyle}
          aria-label="Masquer"
        >
          ×
        </button>
      </header>
      <ul style={listStyle}>
        <li>
          <Dot color="#22d3ee" /> <strong>User</strong> — c'est toi (l'admin qui clique “Run”).
        </li>
        <li>
          <Dot color="#a855f7" /> <strong>Agent</strong> — l'agent IA (Claude) qui réfléchit.
        </li>
        <li>
          <Dot color="#f59e0b" /> <strong>Backend</strong> — Spring Boot, exécute les outils DB.
        </li>
        <li>
          <Dot color="#22c55e" /> <strong>Postgres</strong> — la BD que les outils interrogent.
        </li>
      </ul>
      <p style={paragraphStyle}>
        Les <em>particules</em> qui glissent entre les nœuds sont les événements live d'un run
        d'agent. Elles partent de toi vers l'agent (<em>start</em>), reviennent vers Backend à
        chaque appel d'outil (<em>tool_call</em>), puis vers toi à la fin (<em>finish</em>).
      </p>
      <p style={paragraphStyle}>
        Le <strong>terminal Matrix</strong> à droite affiche le même flux en texte horodaté — utile
        pour copier un runId, debug, ou suivre les tokens.
      </p>
      <p style={{ ...paragraphStyle, marginBottom: 0, opacity: 0.6 }}>
        Tu lances un agent depuis le panneau violet en haut à gauche.
      </p>
    </aside>
  )
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        marginRight: 6,
        verticalAlign: 'middle',
      }}
    />
  )
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: 16,
  width: 320,
  background: 'rgba(0, 0, 0, 0.78)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  padding: 14,
  backdropFilter: 'blur(8px)',
  zIndex: 10,
  color: '#e2e8f0',
  fontSize: 12,
  lineHeight: 1.5,
}
const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
}
const closeButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.7)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
}
const collapsedButtonStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: 16,
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  background: 'rgba(0, 0, 0, 0.78)',
  color: '#e2e8f0',
  cursor: 'pointer',
  fontSize: 16,
  fontWeight: 600,
  zIndex: 10,
}
const listStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: '0 0 10px',
  display: 'grid',
  gap: 4,
}
const paragraphStyle: React.CSSProperties = {
  margin: '0 0 8px',
  opacity: 0.78,
}
