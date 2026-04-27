import { useState } from 'react'
import AdminShell from '../components/AdminShell'
import { contentIdeas } from '../services/videoOpsData'

export default function ContentPipelinePage() {
  const [selectedId, setSelectedId] = useState(contentIdeas[0]?.id || null)
  const selectedItem = contentIdeas.find((item) => item.id === selectedId) || contentIdeas[0]

  return (
    <div className="admin-page video-ops-page">
      <AdminShell activeNavId="content-pipeline">
        <div className="video-ops-shell">
          <section className="video-page-heading">
            <div>
              <p className="video-ops-kicker">Content Pipeline</p>
              <h1>Table content_ideas et preview operationnel.</h1>
            </div>
          </section>

          <section className="video-console-grid">
            <article className="video-panel-card">
              <div className="video-panel-head">
                <h2>content_ideas</h2>
                <span>{contentIdeas.length} rows mocked</span>
              </div>
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
