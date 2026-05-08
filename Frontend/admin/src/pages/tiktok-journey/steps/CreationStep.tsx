import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useJourney } from '../JourneyContext'
import DataEditableCard from './DataEditableCard'
import { Button } from '../../../design-system'

/**
 * Step 1 — generates the idea (topic, script, caption, keyword) via the
 * `MAIN_PIPELINE` n8n workflow. Lets the user tune the generation parameters
 * (category, language, scene count, free-text topic, inspiration ref) and
 * inspect/edit the produced text before validating to the next step.
 */
export default function CreationStep() {
  const { t } = useTranslation('journey')
  const p = useJourney()
  const { displayedGeneratedIdeas, selectedGeneratedIdea, setSelectedGeneratedIdeaId } = p
  const [paramsTab, setParamsTab] = useState<'standard' | 'advanced'>('standard')

  useEffect(() => {
    if (displayedGeneratedIdeas.length > 0 && !selectedGeneratedIdea) {
      setSelectedGeneratedIdeaId(displayedGeneratedIdeas[0].id)
    }
  }, [displayedGeneratedIdeas, selectedGeneratedIdea, setSelectedGeneratedIdeaId])

  const idea = p.scriptedIdea || p.selectedGeneratedIdea

  return (
    <div className="journey-wizard-grid is-creation-stage">
      <aside className="journey-wizard-grid-side journey-creation-side">
        <div className="journey-wizard-side-row">
          <div className="journey-wizard-side-card is-narrow">
            <span className="journey-wizard-card-label">{t('creation.paramsLabel')}</span>

            <div className="journey-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={paramsTab === 'standard'}
                className={`journey-tab ${paramsTab === 'standard' ? 'is-active' : ''}`}
                onClick={() => setParamsTab('standard')}
              >
                {t('tabs.standard')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={paramsTab === 'advanced'}
                className={`journey-tab ${paramsTab === 'advanced' ? 'is-active' : ''}`}
                onClick={() => setParamsTab('advanced')}
              >
                {t('tabs.advanced')}
              </button>
            </div>

            {paramsTab === 'standard' ? (
              <div className="journey-tab-panel" role="tabpanel">
                <div className="journey-step-row-grid">
                  <div className="journey-step-row">
                    <label htmlFor="journey-category">{t('creation.category')}</label>
                    <select
                      id="journey-category"
                      className="journey-step-select"
                      value={p.generationCategory}
                      onChange={(event) => p.setGenerationCategory(event.target.value)}
                      disabled={p.isBusy || !p.isJourneyReady}
                    >
                      {p.tiktokCategoryOptions.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="journey-step-row">
                    <label htmlFor="journey-language">{t('creation.language')}</label>
                    <select
                      id="journey-language"
                      className="journey-step-select"
                      value={p.generationLanguage}
                      onChange={(event) => p.setGenerationLanguage(event.target.value)}
                      disabled={p.isBusy || !p.isJourneyReady}
                    >
                      {p.languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="journey-step-row">
                  <label htmlFor="journey-topic-input">
                    {t('creation.freeTopicLabel')}{' '}
                    <span style={{ opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>{t('creation.freeTopicOptional')}</span>
                  </label>
                  <input
                    id="journey-topic-input"
                    type="text"
                    className="journey-step-select"
                    value={p.generationTopic}
                    onChange={(event) => p.setGenerationTopic(event.target.value)}
                    disabled={p.isBusy || !p.isJourneyReady}
                    placeholder={t('creation.freeTopicPlaceholder')}
                    maxLength={240}
                  />
                </div>

                <div className="journey-step-row">
                  <label htmlFor="journey-inspiration">{t('creation.inspirationLabel')}</label>
                  <textarea
                    id="journey-inspiration"
                    className="journey-step-select"
                    value={p.generationInspirationRef}
                    onChange={(event) => p.setGenerationInspirationRef(event.target.value)}
                    disabled={p.isBusy || !p.isJourneyReady}
                    placeholder={t('creation.inspirationPlaceholder')}
                    rows={3}
                    maxLength={1000}
                  />
                  <span className="journey-step-row-hint">{t('creation.inspirationHint')}</span>
                </div>

                <div className="journey-step-row">
                  <label htmlFor="journey-scene-count">{t('creation.sceneCountLabel')}</label>
                  <select
                    id="journey-scene-count"
                    className="journey-step-select"
                    value={String(p.generationSceneCount)}
                    onChange={(event) => p.setGenerationSceneCount(Number(event.target.value))}
                    disabled={p.isBusy || !p.isJourneyReady}
                  >
                    {p.sceneCountOptions.map((option) => (
                      <option key={option.value} value={String(option.value)}>{option.label}</option>
                    ))}
                  </select>
                  <span className="journey-step-row-hint">
                    {p.sceneCountOptions.find((option) => option.value === p.generationSceneCount)?.description}
                    {' '}
                    {t('creation.sceneCountHint', {
                      durationSec: Math.min(30, Math.max(8, p.generationSceneCount * 3)),
                      count: p.generationSceneCount,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="journey-tab-panel" role="tabpanel" />
            )}

            <div className="journey-step-cta journey-step-cta-stack">
              <Button
                variant="secondary"
                onClick={() => void p.handleGenerateIdea()}
                disabled={p.isBusy || !p.isJourneyReady}
              >
                {idea ? t('common.regenerate') : t('common.generate')}
              </Button>
              <Button
                variant="primary"
                onClick={() => void p.handleGoToTemplateStep()}
                disabled={p.isBusy || !idea || !p.isJourneyReady}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>

          <DataEditableCard
            loading={p.isGeneratingIdeas || p.isGeneratingScript}
            loadingTitle={t('creation.loadingTitle')}
            loadingSub={t('creation.loadingSub')}
            emptyTitle={t('creation.emptyTitle')}
            emptySub={t('creation.emptySub')}
            hint={t('data.saveHint')}
          />
        </div>
      </aside>
    </div>
  )
}
