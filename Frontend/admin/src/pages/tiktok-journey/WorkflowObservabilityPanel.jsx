function formatDateTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('fr-FR')
  } catch {
    return value
  }
}

function formatRunLabel(run) {
  return `${run?.workflowType || '-'} #${run?.id || '-'}`
}

export default function WorkflowObservabilityPanel({ observability }) {
  if (!observability) return null

  const recentRuns = Array.isArray(observability.recentRuns) ? observability.recentRuns : []
  const recentErrors = Array.isArray(observability.recentErrors) ? observability.recentErrors : []

  return (
    <section className="tiktok-observability-panel">
      <div className="video-panel-head">
        <h2>Observability</h2>
        <span>Runs & erreurs recentes</span>
      </div>

      <div className="tiktok-observability-grid">
        <div className="tiktok-observability-card">
          <strong>Derniers runs</strong>
          {recentRuns.length ? (
            <div className="tiktok-observability-list">
              {recentRuns.map((run) => (
                <article key={`${run.id}-${run.createdAt}`} className={`tiktok-observability-item is-${String(run.status || '').toLowerCase()}`}>
                  <div className="tiktok-observability-item-head">
                    <span>{formatRunLabel(run)}</span>
                    <strong>{run.status || '-'}</strong>
                  </div>
                  <p>Idea #{run.contentIdeaId || '-'}</p>
                  <small>{formatDateTime(run.createdAt)}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="video-inline-state">Aucun run recent.</p>
          )}
        </div>

        <div className="tiktok-observability-card">
          <strong>Erreurs recentes</strong>
          {recentErrors.length ? (
            <div className="tiktok-observability-list">
              {recentErrors.map((event, index) => (
                <article key={`${event.workflowRunId || 'event'}-${event.createdAt || index}`} className="tiktok-observability-item is-error">
                  <div className="tiktok-observability-item-head">
                    <span>{event.eventType || 'ERROR'}</span>
                    <strong>{event.severity || 'ERROR'}</strong>
                  </div>
                  <p>{event.message || '-'}</p>
                  <small>Run #{event.workflowRunId || '-'} · Idea #{event.contentIdeaId || '-'} · {formatDateTime(event.createdAt)}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="video-inline-state">Aucune erreur recente.</p>
          )}
        </div>
      </div>
    </section>
  )
}
