import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminShell from '../components/AdminShell'
import {
  fetchManualActions,
  markPublishComplete,
  markUploadDone,
} from '../services/videoOpsSupabase'
import { uploadTikTokMedia } from '../services/tiktokUploadApi'

function isHttpUrl(value) {
  if (!value) return false

  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

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
    mutationFn: async ({ id, shotstackUrl, uploadUrl }) => {
      await uploadTikTokMedia({ shotstackUrl, uploadUrl })
      await markUploadDone(id)
    },
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
            {!isLoading && !manualActions.length ? (
              <article className="video-panel-card">
                <div className="video-panel-head">
                  <h2>Aucune action disponible</h2>
                  <span>Manual queue</span>
                </div>
                <p className="video-inline-state">
                  Aucune ligne exploitable n a ete renvoyee. Verifie que `publish tiktok`
                  a bien enregistre `tiktok_upload_url` et que `content_ideas` est lisible
                  depuis le backoffice.
                </p>
              </article>
            ) : null}

            {manualActions.map((item) => (
              <article key={item.id} className="video-panel-card">
                {(() => {
                  const hasValidShotstackUrl = isHttpUrl(item.shotstackUrl)
                  const hasValidUploadUrl = isHttpUrl(item.uploadUrl)
                  const canUploadToTikTok = hasValidShotstackUrl && hasValidUploadUrl

                  return (
                    <>
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
                    {hasValidShotstackUrl ? (
                      <CopyButton value={item.shotstackUrl} label="Copier shotstack_url" />
                    ) : null}
                  </div>
                  <div className="video-preview-block">
                    <span>Upload URL</span>
                    <p>{item.uploadUrl || 'Lance `Init publish TikTok` pour generer une upload_url.'}</p>
                    {hasValidUploadUrl ? (
                      <CopyButton value={item.uploadUrl} label="Copier upload_url" />
                    ) : null}
                  </div>
                  <div className="video-preview-block">
                    <span>Upload status</span>
                    <p>{item.uploadStatus}</p>
                    {!item.uploadUrl ? (
                      <p className="video-inline-state">
                        Cette ligne est prete cote Shotstack, mais l etape `publish tiktok`
                        doit encore enregistrer `tiktok_upload_url`.
                      </p>
                    ) : null}
                    {item.uploadUrl && !hasValidUploadUrl ? (
                      <p className="video-inline-state">
                        L upload URL enregistree n est pas une URL HTTP valide. Lance `Init publish TikTok`
                        avant de declencher l upload.
                      </p>
                    ) : null}
                    {item.shotstackUrl && !hasValidShotstackUrl ? (
                      <p className="video-inline-state">
                        La Shotstack URL enregistree n est pas une URL HTTP valide.
                      </p>
                    ) : null}
                    <div className="video-action-row">
                      <button
                        type="button"
                        className="video-action-btn"
                        onClick={() => markUploadMutation.mutate({
                          id: item.id,
                          shotstackUrl: item.shotstackUrl,
                          uploadUrl: item.uploadUrl,
                        })}
                        disabled={markUploadMutation.isPending || !canUploadToTikTok}
                      >
                        {markUploadMutation.isPending ? 'Upload en cours...' : 'Uploader sur TikTok'}
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
                    </>
                  )
                })()}
              </article>
            ))}
          </section>
        </div>
      </AdminShell>
    </div>
  )
}
