import { useJourney } from '../JourneyContext'
import { AccountSideCard } from './AccountSideCard'
import { Button } from '../../../design-system'

/**
 * Step 6 — final publish confirmation. Calls the backend `markPublishComplete`
 * endpoint to flip `tiktokStatus` to `published` and surface the connected
 * account context. Shows the rendered video preview as a sanity check.
 */
export default function PublishStep() {
  const p = useJourney()
  const previewUrl = p.manualAction?.shotstackUrl || p.scriptedIdea?.shotstackUrl || p.selectedGeneratedIdea?.shotstackUrl

  return (
    <div className="journey-wizard-grid is-video-stage">
      <aside className="journey-wizard-grid-side">
        <div className="journey-wizard-side-card">
          <span className="journey-wizard-card-label">Actions</span>
          <div className="journey-step-cta journey-step-cta-stack">
            <Button
              variant="primary"
              onClick={() => void p.handlePublishVideo()}
              disabled={p.isBusy}
            >
              {p.isPublishingVideo ? 'Publication...' : 'Publier sur TikTok'}
            </Button>
          </div>
        </div>

        <AccountSideCard
          connectedTikTokAccount={p.connectedTikTokAccount}
          hasConnectedTikTokAccount={p.hasConnectedTikTokAccount}
          formatShortOpenId={p.formatShortOpenId}
          activeIdea={p.activeIdea}
          navigate={p.navigate}
        />
      </aside>

      <section className="journey-wizard-grid-main is-video-stage">
        <span className="journey-wizard-card-label">Publication</span>
        {previewUrl ? <p.VideoPreview url={previewUrl} /> : null}
      </section>
    </div>
  )
}
