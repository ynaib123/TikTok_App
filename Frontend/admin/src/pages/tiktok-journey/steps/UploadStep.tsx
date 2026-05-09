import { useTranslation } from 'react-i18next'
import { useJourney } from '../JourneyContext'
import DataEditableCard from './DataEditableCard'
import { AccountSideCard } from './AccountSideCard'
import { Button } from '../../../design-system'

/**
 * Step 5 — uploads the rendered video to TikTok via the
 * `INIT_PUBLISH_TIKTOK` + `TIKTOK_UPLOAD` workflows. Splits the action into
 * "prepare upload URL" (init publish) and "send the bytes" (TikTok upload),
 * then hands off to PublishStep for the final flag-as-published call.
 */
export default function UploadStep() {
  const { t } = useTranslation('journey')
  const p = useJourney()
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const previewUrl = p.manualAction?.shotstackUrl || idea?.shotstackUrl
  const isPublishing = p.isPreparingUpload || p.isUploadingVideo || p.isPublishingVideo

  return (
    <div className="journey-wizard-grid is-video-stage is-render-stage">
      <aside className="journey-wizard-grid-side journey-render-side">
        <div className="journey-wizard-side-card is-narrow">
          <span className="journey-wizard-card-label">{t('upload.paramsLabel')}</span>
          <div className="journey-step-cta journey-step-cta-stack">
            <Button
              variant="primary"
              onClick={() => void p.handlePrepareAndUploadVideo()}
              disabled={p.isBusy || !previewUrl || !p.isJourneyReady}
            >
              {isPublishing ? t('upload.publishingFlow') : t('upload.publishOnTikTok')}
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

      <section className="journey-render-data-panel">
        <DataEditableCard
          loading={false}
          emptyTitle={t('upload.emptyTitle')}
          emptySub={t('upload.emptySub')}
          readOnly
        />
      </section>

      <section className="journey-wizard-grid-main is-video-stage">
        <span className="journey-wizard-card-label">{t('upload.previewLabel')}</span>
        {previewUrl ? <p.VideoPreview url={previewUrl} /> : (
          <div className="journey-empty">
            <strong>{t('upload.noVideoTitle')}</strong>
            <p>{t('upload.noVideoSub')}</p>
          </div>
        )}
      </section>
    </div>
  )
}
