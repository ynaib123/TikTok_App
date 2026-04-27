import AdminShell from '../components/AdminShell'
import { manualActions } from '../services/videoOpsData'

function CopyButton({ value, label }) {
  const handleCopy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Clipboard support is optional for local preview.
    }
  }

  return (
    <button type="button" className="video-inline-action" onClick={handleCopy}>
      {label}
    </button>
  )
}

export default function ManualActionsPage() {
  return (
    <div className="admin-page video-ops-page">
      <AdminShell activeNavId="manual-actions">
        <div className="video-ops-shell">
          <section className="video-page-heading">
            <div>
              <p className="video-ops-kicker">Manual Publish Actions</p>
              <h1>Actions semi-automatiques pour l upload et la publication finale.</h1>
            </div>
          </section>

          <section className="video-panel-grid single-column">
            {manualActions.map((item) => (
              <article key={item.id} className="video-panel-card">
                <div className="video-panel-head">
                  <h2>Row #{item.id}</h2>
                  <span>{item.publishStatus}</span>
                </div>
                <div className="video-action-grid">
                  <div className="video-preview-block">
                    <span>Topic</span>
                    <p>{item.topic}</p>
                  </div>
                  <div className="video-preview-block">
                    <span>Shotstack URL</span>
                    <p>{item.shotstackUrl}</p>
                    <CopyButton value={item.shotstackUrl} label="Copier shotstack_url" />
                  </div>
                  <div className="video-preview-block">
                    <span>Upload URL</span>
                    <p>{item.uploadUrl}</p>
                    <CopyButton value={item.uploadUrl} label="Copier upload_url" />
                  </div>
                  <div className="video-preview-block">
                    <span>Upload status</span>
                    <p>{item.uploadStatus}</p>
                    <div className="video-action-row">
                      <button type="button" className="video-action-btn">Marquer upload fait</button>
                      <button type="button" className="video-action-btn ghost">Marquer publie</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </AdminShell>
    </div>
  )
}
