import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getIdeaSceneTexts, joinScenes, normalizeSceneCount } from '../journeyHelpers'
import { useJourney } from '../JourneyContext'

/**
 * Step-level overrides for the editable idea card. Idea data, edit handlers
 * and busy/loading flags are pulled from `JourneyContext`, so each step only
 * tells the card *how* to behave (read-only? what to show when empty?) — not
 * *what* to display.
 */
export interface DataEditableCardProps {
  loading: boolean
  loadingTitle?: string
  loadingSub?: string
  emptyTitle: string
  emptySub: string
  hint?: string
  label?: string
  readOnly?: boolean
  /**
   * In `readOnly` mode, hide topic / caption / keyword and only display the
   * scenes list. Used by step 2 (TemplateStyleStep) where the only relevant
   * data preview is the script breakdown.
   */
  scenesOnly?: boolean
}

export default function DataEditableCard(props: DataEditableCardProps) {
  const { t } = useTranslation('journey')
  const journey = useJourney()
  const idea = journey.scriptedIdea || journey.selectedGeneratedIdea
  const p = {
    ...props,
    idea,
    isBusy: journey.isBusy,
    generationSceneCount: journey.generationSceneCount,
    editedTopic: journey.editedTopic,
    setEditedTopic: journey.setEditedTopic,
    editedScript: journey.editedScript,
    setEditedScript: journey.setEditedScript,
    editedCaption: journey.editedCaption,
    setEditedCaption: journey.setEditedCaption,
    editedKeyword: journey.editedKeyword,
    setEditedKeyword: journey.setEditedKeyword,
  }
  const ideaIdForScenes = p.idea?.id ?? null
  const [sceneArray, setSceneArray] = useState<string[]>(
    () => normalizeSceneCount(getIdeaSceneTexts(p.idea, p.editedScript), p.generationSceneCount),
  )
  useEffect(() => {
    const localJoined = joinScenes(sceneArray)
    if (p.editedScript !== localJoined) {
      const next = normalizeSceneCount(getIdeaSceneTexts(p.idea, p.editedScript), p.generationSceneCount)
      setSceneArray(next)
      if (p.editedScript && p.editedScript !== joinScenes(next)) {
        p.setEditedScript(joinScenes(next))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaIdForScenes, p.editedScript, p.generationSceneCount, p.idea?.plannedScenes])

  const updateScene = (index: number, value: string) => {
    const next = [...sceneArray]
    next[index] = value
    setSceneArray(next)
    p.setEditedScript(joinScenes(next))
  }

  const displayValue = (value: string | null | undefined) => {
    const normalized = String(value || '').trim()
    return normalized || t('data.pending')
  }

  const sceneCountLabel = t('data.sceneCount', {
    count: p.generationSceneCount,
    defaultValue_one: 'Script ({{count}} scène)',
    defaultValue_other: 'Script ({{count}} scènes)',
  })

  const renderReadOnly = () => (
    <div className="journey-data-form is-readonly">
      {p.scenesOnly ? null : (
        <div className="journey-step-row journey-data-topic-row">
          <label>{t('data.topic')}</label>
          <div className="journey-readonly-field">{displayValue(p.editedTopic || p.idea?.topic)}</div>
        </div>
      )}
      <div className="journey-step-row journey-data-form-grow journey-data-script-row">
        <div className="journey-scenes-head">
          <label>{sceneCountLabel}</label>
        </div>
        <div className="journey-scenes-list">
          {sceneArray.length === 0 ? (
            <div className="journey-empty journey-scenes-empty">
              <p>{t('data.noScenes')}</p>
            </div>
          ) : (
            sceneArray.map((scene, index) => (
              <div className="journey-scene-row is-readonly" key={index}>
                <div className="journey-scene-head">
                  <span className="journey-scene-label">{t('data.scene', { index: index + 1 })}</span>
                </div>
                <div className="journey-readonly-field is-multiline">{displayValue(scene)}</div>
              </div>
            ))
          )}
        </div>
      </div>
      {p.scenesOnly ? null : (
        <>
          <div className="journey-step-row journey-data-caption-row">
            <label>{t('data.caption')}</label>
            <div className="journey-readonly-field is-multiline">{displayValue(p.editedCaption || p.idea?.caption)}</div>
          </div>
          <div className="journey-step-row journey-data-keyword-row">
            <label>{t('data.keyword')}</label>
            <div className="journey-readonly-field">{displayValue(p.editedKeyword || p.idea?.keyword)}</div>
          </div>
        </>
      )}
      {p.hint ? <span className="journey-step-row-hint">{p.hint}</span> : null}
    </div>
  )

  return (
    <div className="journey-wizard-side-card is-wide">
      <span className="journey-wizard-card-label">
        {p.label || (p.readOnly ? t('data.label') : t('data.labelEditable'))}
      </span>
      {p.loading ? (
        <div className="journey-loading">
          <div className="journey-loading-spinner" />
          <div className="journey-loading-copy">
            <strong>{p.loadingTitle || 'Generation en cours'}</strong>
            <span>{p.loadingSub || 'Idee + script en preparation...'}</span>
          </div>
        </div>
      ) : p.idea && p.readOnly ? (
        renderReadOnly()
      ) : p.idea ? (
        <div className="journey-data-form">
          <div className="journey-step-row">
            <label htmlFor="journey-edit-topic">{t('data.topic')}</label>
            <input
              id="journey-edit-topic"
              type="text"
              className="journey-step-select"
              value={p.editedTopic}
              onChange={(event) => p.setEditedTopic(event.target.value)}
              disabled={p.isBusy}
              maxLength={500}
            />
          </div>
          <div className="journey-step-row journey-data-form-grow">
            <div className="journey-scenes-head">
              <label>{sceneCountLabel}</label>
            </div>
            <div className="journey-scenes-list">
              {sceneArray.length === 0 ? (
                <div className="journey-empty journey-scenes-empty">
                  <p>{t('data.noScenes')}</p>
                </div>
              ) : (
                sceneArray.map((scene, index) => (
                  <div className="journey-scene-row" key={index}>
                    <div className="journey-scene-head">
                      <span className="journey-scene-label">{t('data.scene', { index: index + 1 })}</span>
                    </div>
                    <textarea
                      className="journey-step-select journey-scene-textarea"
                      value={scene}
                      onChange={(event) => updateScene(index, event.target.value)}
                      disabled={p.isBusy}
                      rows={2}
                      maxLength={500}
                      placeholder={t('data.scenePlaceholder')}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="journey-step-row">
            <label htmlFor="journey-edit-caption">{t('data.caption')}</label>
            <textarea
              id="journey-edit-caption"
              className="journey-step-select"
              value={p.editedCaption}
              onChange={(event) => p.setEditedCaption(event.target.value)}
              disabled={p.isBusy}
              rows={2}
              maxLength={2200}
            />
          </div>
          <div className="journey-step-row">
            <label htmlFor="journey-edit-keyword">{t('data.keyword')}</label>
            <input
              id="journey-edit-keyword"
              type="text"
              className="journey-step-select"
              value={p.editedKeyword}
              onChange={(event) => p.setEditedKeyword(event.target.value)}
              disabled={p.isBusy}
              maxLength={240}
            />
          </div>
          {p.hint ? <span className="journey-step-row-hint">{p.hint}</span> : null}
        </div>
      ) : (
        <div className="journey-empty">
          <strong>{p.emptyTitle}</strong>
          <p>{p.emptySub}</p>
        </div>
      )}
    </div>
  )
}
