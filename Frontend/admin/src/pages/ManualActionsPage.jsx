import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminShell from '../components/AdminShell'
import {
  fetchManualActions,
  markPublishComplete,
  markUploadDone,
} from '../services/videoOpsSupabase'

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
  const queryClient = useQueryClient()
  const { data: manualActions = [], isLoading, error } = useQuery({
    queryKey: ['manual-actions'],
    queryFn: fetchManualActions,
  })
  const markUploadMutation = useMutation({
    mutationFn: markUploadDone,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['manual-actions'] }),
        queryClient.invalidateQueries({ queryKey: ['content-ideas'] }),
        queryClient.invalidateQueries({ queryKey: ['video-dashboard'] }),
      ])
    },
  })
  const markPublishMutation = useMutation({
    mutationFn: markPublishComplete,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['manual-actions'] }),
        queryClient.invalidateQueries({ queryKey: ['content-ideas'] }),
        queryClient.invalidateQueries({ queryKey: ['video-dashboard'] }),
      ])
    },
  })
  const feedbackMessage =
    error?.message
    || markUploadMutation.error?.message
    || markPublishMutation.error?.message
    || null

  return (
    <div className="admin-page video-ops-page">
      <AdminShell
        activeNavId="manual-actions"
        feedbackItems={[{ type: 'error', message: feedbackMessage }]}
      >
        <div className="video-ops-shell">
          <section className="video-page-heading">
            <div>
              <p className="video-ops-kicker">Manual Publish Actions</p>
              <h1>Actions semi-automatiques pour l upload et la publication finale.</h1>
            </div>
          </section>

          {isLoading ? <p className="video-inline-state">Chargement des actions manuelles...</p> : null}

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
                      <button
                        type="button"
                        className="video-action-btn"
                        onClick={() => markUploadMutation.mutate(item.id)}
                        disabled={markUploadMutation.isPending}
                      >
                        {markUploadMutation.isPending ? 'Mise a jour...' : 'Marquer upload fait'}
                      </button>
                      <button
                        type="button"
                        className="video-action-btn ghost"
                        onClick={() => markPublishMutation.mutate(item.id)}
                        disabled={markPublishMutation.isPending}
                      >
                        {markPublishMutation.isPending ? 'Mise a jour...' : 'Marquer publie'}
                      </button>
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
