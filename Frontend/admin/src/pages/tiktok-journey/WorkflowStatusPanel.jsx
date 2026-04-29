function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return '-'
  if (durationMs < 1000) return `${durationMs} ms`
  const seconds = Math.round(durationMs / 1000)
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes} min ${remainingSeconds}s`
}

export default function WorkflowStatusPanel({ status }) {
  if (!status || status.state === 'idle') return null

  return (
    <section className={`tiktok-workflow-status is-${status.state}`} aria-live="polite">
      <div className="tiktok-workflow-status-copy">
        <strong>Workflow status</strong>
        <p>{status.message || 'Workflow en attente de mise a jour.'}</p>
      </div>
      <dl className="tiktok-workflow-status-meta">
        <div>
          <dt>Run</dt>
          <dd>{status.runId || '-'}</dd>
        </div>
        <div>
          <dt>Etat</dt>
          <dd>{status.state || '-'}</dd>
        </div>
        <div>
          <dt>Workflow</dt>
          <dd>{status.workflowType || '-'}</dd>
        </div>
        <div>
          <dt>Duree</dt>
          <dd>{formatDuration(status.durationMs)}</dd>
        </div>
      </dl>
    </section>
  )
}
