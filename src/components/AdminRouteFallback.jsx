import { useEffect, useState } from 'react'
import '../styles/layout/loading.css'

export default function AdminRouteFallback({
  compact = false,
  message = "Chargement de l'espace admin...",
  progressValue = null,
}) {
  const [progress, setProgress] = useState(0)
  const hasExternalProgress = Number.isFinite(Number(progressValue))
  const displayedProgress = hasExternalProgress
    ? Math.max(0, Math.min(100, Number(progressValue)))
    : progress

  useEffect(() => {
    if (hasExternalProgress) return undefined

    let frameId = 0
    let startTime = 0
    const duration = 2800

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const elapsed = Math.min(timestamp - startTime, duration)
      const ratio = elapsed / duration
      const easedProgress = 1 - ((1 - ratio) * (1 - ratio) * (1 - ratio))
      setProgress(Math.round(easedProgress * 100))

      if (elapsed < duration) {
        frameId = window.requestAnimationFrame(animate)
      }
    }

    frameId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frameId)
  }, [hasExternalProgress])

  return (
    <div className={`admin-loading-shell ${compact ? 'admin-loading-shell-compact' : ''}`}>
      <div className="admin-loading-shell-inner">
        <section className="admin-loading-card" role="status" aria-live="polite">
          <p className="admin-auth-card-kicker">Espace admin</p>
          <div className="admin-loading-progress" aria-hidden="true">
            <div className="admin-loading-progress-track">
              <div
                className="admin-loading-progress-bar"
                style={{ width: `${displayedProgress}%` }}
              />
            </div>
            <span className="admin-loading-progress-value">{displayedProgress}%</span>
          </div>
          <p className="admin-loading-message">{message}</p>
        </section>
      </div>
    </div>
  )
}
