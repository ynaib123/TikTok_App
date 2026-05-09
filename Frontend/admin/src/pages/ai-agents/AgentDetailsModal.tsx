import { useEffect } from 'react'
import type { SceneNode } from './agentNodes'

interface AgentDetailsModalProps {
  node: SceneNode | null
  onClose: () => void
}

const NODE_DETAILS: Record<
  SceneNode['id'],
  { role: string; runtime: string; protocol: string; tags: string[] }
> = {
  user: {
    role: 'Admin operator',
    runtime: 'Browser session (cookie JWT)',
    protocol: 'HTTPS / SSE',
    tags: ['Auth: cookie', 'Frontend React 19'],
  },
  agent: {
    role: 'Agent IA',
    runtime: 'Anthropic Messages API',
    protocol: 'tool_use loop',
    tags: ['Claude', 'tool_use', 'streaming events'],
  },
  backend: {
    role: 'Service orchestrateur',
    runtime: 'Spring Boot 3 / Java 21',
    protocol: 'REST + SSE',
    tags: ['/api/ai/agents/**', 'JdbcTemplate', 'Resilience4j'],
  },
  postgres: {
    role: 'Stockage canonique',
    runtime: 'Postgres 16',
    protocol: 'JDBC pool (HikariCP)',
    tags: ['content_ideas', 'agent_runs', 'audio_assets'],
  },
}

export default function AgentDetailsModal({ node, onClose }: AgentDetailsModalProps) {
  useEffect(() => {
    if (!node) return undefined
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [node, onClose])

  if (!node) return null
  const details = NODE_DETAILS[node.id]

  return (
    <div className="ai-modal-backdrop" role="dialog" aria-modal="true" aria-label={node.label}>
      <button
        type="button"
        className="ai-modal-backdrop-dismiss"
        onClick={onClose}
        aria-label="Fermer la modale"
        tabIndex={-1}
      />
      <div className="ai-modal" role="document">
        <header className="ai-modal-header">
          <div className="ai-modal-header-copy">
            <span className="ai-modal-kicker">{details.role}</span>
            <h2>{node.label}</h2>
          </div>
          <button type="button" className="ai-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </header>
        <div className="ai-modal-body">
          <p className="ai-modal-description">{node.description}</p>
          <dl className="ai-modal-grid">
            <div>
              <dt>Runtime</dt>
              <dd>{details.runtime}</dd>
            </div>
            <div>
              <dt>Protocole</dt>
              <dd>{details.protocol}</dd>
            </div>
          </dl>
          <div className="ai-modal-tags">
            {details.tags.map((tag) => (
              <span key={tag} className="ai-modal-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
