import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminShell from '../components/AdminShell'
import { fetchContentIdeas } from '../services/videoOpsSupabase'

export default function ContentPipelinePage() {
  const { data: contentIdeas = [], isLoading, error } = useQuery({
    queryKey: ['content-ideas'],
    queryFn: fetchContentIdeas,
  })

  const [selectedId, setSelectedId] = useState(null)

  const selectedItem = contentIdeas.find((item) => item.id === selectedId) || contentIdeas[0]
  const showEmptyState = !isLoading && !error && !contentIdeas.length

  return (
    <div className="admin-page video-ops-page">
      <AdminShell
        activeNavId="content-pipeline"
        feedbackItems={[{ type: 'error', message: error?.message || null }]}
      >
        <div className="video-ops-shell">
          <section className="video-page-heading">
            <div>
              <p className="video-ops-kicker">Content Pipeline</p>
              <h1>Table content_ideas et preview operationnel.</h1>
            </div>
          </section>

          {isLoading ? <p className="video-inline-state">Chargement du content pipeline...</p> : null}

          <section className="video-console-grid">
            <article className="video-panel-card">
              <div className="video-panel-head">
                <h2>content_ideas</h2>
                <span>{contentIdeas.length} rows</span>
              </div>
              {showEmptyState ? (
                <div className="video-empty-state">
                  <p>Aucune ligne n est visible depuis le backoffice.</p>
                  <p>
                    Si `content_ideas` contient deja des donnees dans Supabase, verifie que le backend
                    video ops est configure avec l URL Supabase et la service role key.
                  </p>
                </div>
              ) : null}
              <div className="video-table-wrap">
                <table className="video-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Topic</th>
                      <th>Keyword</th>
                      <th>Shotstack</th>
                      <th>TikTok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentIdeas.map((item) => (
                      <tr
                        key={item.id}
                        className={item.id === selectedItem?.id ? 'is-selected' : ''}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <td>{item.id}</td>
                        <td>{item.topic}</td>
                        <td>{item.keyword}</td>
                        <td>{item.shotstackStatus}</td>
                        <td>{item.tiktokStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="video-panel-card">
              <div className="video-panel-head">
                <h2>Preview</h2>
                <span>Selected row</span>
              </div>
              {selectedItem ? (
                <div className="video-preview-stack">
                  <div className="video-preview-block">
                    <span>Topic</span>
                    <p>{selectedItem.topic}</p>
                  </div>
                  <div className="video-preview-block">
                    <span>Script</span>
                    <p>{selectedItem.script}</p>
                  </div>
                  <div className="video-preview-block">
                    <span>Caption</span>
                    <p>{selectedItem.caption}</p>
                  </div>
                  <div className="video-preview-block">
                    <span>Shotstack URL</span>
                    <a href={selectedItem.shotstackUrl || '#'} target="_blank" rel="noreferrer">
                      {selectedItem.shotstackUrl || 'Not ready yet'}
                    </a>
                  </div>
                </div>
              ) : null}
            </article>
          </section>
        </div>
      </AdminShell>
    </div>
  )
}
