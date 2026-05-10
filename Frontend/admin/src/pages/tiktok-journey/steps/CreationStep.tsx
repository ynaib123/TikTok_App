import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useJourney } from '../JourneyContext'
import { Button } from '../../../design-system'
import { joinScenes, splitScriptIntoScenes } from '../journeyHelpers'

const MIN_SCENES = 1
const MAX_SCENES = 10

export default function CreationStep() {
  const { t } = useTranslation('journey')
  const p = useJourney()

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'ia' | 'manuel'>('ia')

  // ── État formulaire manuel ────────────────────────────────────────────────
  const [manualTopic, setManualTopic] = useState('')
  const [manualScenes, setManualScenes] = useState<string[]>(() =>
    Array.from({ length: p.generationSceneCount || 1 }, () => ''),
  )
  const [manualCaption, setManualCaption] = useState('')
  const [manualKeyword, setManualKeyword] = useState('')

  // Synchronise le nombre de scènes manuelles quand le sélecteur change
  useEffect(() => {
    setManualScenes((prev) => {
      const target = Math.max(MIN_SCENES, Math.min(MAX_SCENES, p.generationSceneCount || 1))
      if (prev.length === target) return prev
      if (prev.length < target) return [...prev, ...Array(target - prev.length).fill('')]
      return prev.slice(0, target)
    })
  }, [p.generationSceneCount])

  // Quand on bascule en Manuel depuis une idée déjà générée, pré-remplir
  const prevModeRef = useRef(mode)
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  useEffect(() => {
    if (mode === 'manuel' && prevModeRef.current === 'ia' && idea) {
      setManualTopic(idea.topic || '')
      setManualCaption(idea.caption || '')
      setManualKeyword(idea.keyword || '')
      const scenes = splitScriptIntoScenes(idea.script || '')
      setManualScenes(scenes.length > 0 ? scenes : [''])
    }
    prevModeRef.current = mode
  }, [mode, idea])

  const addScene = () => {
    if (manualScenes.length < MAX_SCENES) setManualScenes((s) => [...s, ''])
  }

  const removeScene = (index: number) => {
    if (manualScenes.length <= MIN_SCENES) return
    setManualScenes((s) => s.filter((_, i) => i !== index))
  }

  const updateScene = (index: number, value: string) => {
    setManualScenes((s) => s.map((scene, i) => (i === index ? value : scene)))
  }

  const handleManualNext = async () => {
    if (!manualTopic.trim()) return
    const script = joinScenes(manualScenes.filter((s) => s.trim()))
    await p.handleManualCreate({
      topic: manualTopic,
      script,
      caption: manualCaption,
      keyword: manualKeyword,
    })
  }

  const hasIdea = Boolean(idea?.id)
  const manualReady = manualTopic.trim().length > 0

  return (
    <div className="journey-wizard-grid is-creation-stage is-render-stage">
      {/* ── Colonne gauche : paramètres (toujours visible) ─────────────────── */}
      <aside className="journey-wizard-grid-side journey-creation-side">
        <div className="journey-wizard-side-card is-narrow">
          <span className="journey-wizard-card-label">{t('creation.paramsLabel')}</span>

          {/* Tabs IA / Manuel remplacent Standard / Advanced */}
          <div className="journey-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'ia'}
              className={`journey-tab ${mode === 'ia' ? 'is-active' : ''}`}
              onClick={() => setMode('ia')}
            >
              IA
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'manuel'}
              className={`journey-tab ${mode === 'manuel' ? 'is-active' : ''}`}
              onClick={() => setMode('manuel')}
            >
              Manuel
            </button>
          </div>

          {/* ─── Panneau IA ─────────────────────────────────────────────── */}
          {mode === 'ia' ? (
            <div className="journey-tab-panel" role="tabpanel">
              <div className="journey-step-row-grid">
                <div className="journey-step-row">
                  <label htmlFor="journey-category">{t('creation.category')}</label>
                  <select
                    id="journey-category"
                    className="journey-step-select"
                    value={p.generationCategory}
                    onChange={(e) => p.setGenerationCategory(e.target.value)}
                    disabled={p.isBusy || !p.isJourneyReady}
                  >
                    {p.tiktokCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="journey-step-row">
                  <label htmlFor="journey-language">{t('creation.language')}</label>
                  <select
                    id="journey-language"
                    className="journey-step-select"
                    value={p.generationLanguage}
                    onChange={(e) => p.setGenerationLanguage(e.target.value)}
                    disabled={p.isBusy || !p.isJourneyReady}
                  >
                    {p.languageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="journey-step-row">
                <label htmlFor="journey-topic-input">
                  {t('creation.freeTopicLabel')}{' '}
                  <span style={{ opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>
                    {t('creation.freeTopicOptional')}
                  </span>
                </label>
                <input
                  id="journey-topic-input"
                  type="text"
                  className="journey-step-select"
                  value={p.generationTopic}
                  onChange={(e) => p.setGenerationTopic(e.target.value)}
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
                  onChange={(e) => p.setGenerationInspirationRef(e.target.value)}
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
                  onChange={(e) => p.setGenerationSceneCount(Number(e.target.value))}
                  disabled={p.isBusy || !p.isJourneyReady}
                >
                  {p.sceneCountOptions.map((opt) => (
                    <option key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="journey-step-row-hint">
                  {
                    p.sceneCountOptions.find((opt) => opt.value === p.generationSceneCount)
                      ?.description
                  }{' '}
                  {t('creation.sceneCountHint', {
                    durationSec: Math.min(30, Math.max(8, p.generationSceneCount * 3)),
                    count: p.generationSceneCount,
                  })}
                </span>
              </div>
            </div>
          ) : (
            /* ─── Panneau Manuel : seulement le nombre de scènes ─────────── */
            <div className="journey-tab-panel" role="tabpanel">
              <div className="journey-step-row">
                <label htmlFor="journey-scene-count-manual">Nombre de scènes</label>
                <select
                  id="journey-scene-count-manual"
                  className="journey-step-select"
                  value={String(p.generationSceneCount)}
                  onChange={(e) => p.setGenerationSceneCount(Number(e.target.value))}
                  disabled={p.isBusy}
                >
                  {p.sceneCountOptions.map((opt) => (
                    <option key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="journey-step-row-hint">
                  Contrôle le nombre de scènes dans le formulaire à droite.
                </span>
              </div>
              <div className="journey-step-row">
                <label htmlFor="journey-category-manual">Catégorie</label>
                <select
                  id="journey-category-manual"
                  className="journey-step-select"
                  value={p.generationCategory}
                  onChange={(e) => p.setGenerationCategory(e.target.value)}
                  disabled={p.isBusy}
                >
                  {p.tiktokCategoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <p className="journey-step-row-hint" style={{ marginTop: 12 }}>
                Remplis le topic, les scènes, la caption et le mot-clé dans le panneau de droite,
                puis clique sur <strong>Valider et continuer</strong>.
              </p>
            </div>
          )}

          {/* ─── Boutons d'action ─────────────────────────────────────────── */}
          <div className="journey-step-cta journey-step-cta-stack">
            {mode === 'ia' ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => void p.handleGenerateIdea()}
                  disabled={p.isBusy || !p.isJourneyReady}
                >
                  {hasIdea ? t('common.regenerate') : t('common.generate')}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void p.handleGoToTemplateStep()}
                  disabled={p.isBusy || !hasIdea || !p.isJourneyReady}
                >
                  {t('common.next')}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => void handleManualNext()}
                disabled={!manualReady || p.isBusy}
              >
                {p.isBusy ? 'Création…' : 'Valider et continuer →'}
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Colonne droite : données (change selon le mode) ─────────────────── */}
      <section className="journey-render-data-panel">
        {mode === 'ia' ? (
          /* Mode IA : données générées (éditables après génération) */
          <IaDataPanel
            idea={idea}
            loading={p.isGeneratingIdeas || p.isGeneratingScript}
            isBusy={p.isBusy}
            editedTopic={p.editedTopic}
            editedScript={p.editedScript}
            editedCaption={p.editedCaption}
            editedKeyword={p.editedKeyword}
            generationSceneCount={p.generationSceneCount}
            setEditedTopic={p.setEditedTopic}
            setEditedScript={p.setEditedScript}
            setEditedCaption={p.setEditedCaption}
            setEditedKeyword={p.setEditedKeyword}
            loadingTitle={t('creation.loadingTitle')}
            loadingSub={t('creation.loadingSub')}
            emptyTitle={t('creation.emptyTitle')}
            emptySub={t('creation.emptySub')}
          />
        ) : (
          /* Mode Manuel : formulaire de saisie directe */
          <ManualDataPanel
            isBusy={p.isBusy}
            topic={manualTopic}
            setTopic={setManualTopic}
            scenes={manualScenes}
            onUpdateScene={updateScene}
            onAddScene={addScene}
            onRemoveScene={removeScene}
            caption={manualCaption}
            setCaption={setManualCaption}
            keyword={manualKeyword}
            setKeyword={setManualKeyword}
          />
        )}
      </section>
    </div>
  )
}

/* ── Panneau IA : données générées ──────────────────────────────────────── */

interface IdeaLike {
  id: number
  topic?: string | null
  script?: string | null
  caption?: string | null
  keyword?: string | null
}

interface IaDataPanelProps {
  idea: IdeaLike | null
  loading: boolean
  isBusy: boolean
  editedTopic: string
  editedScript: string
  editedCaption: string
  editedKeyword: string
  generationSceneCount: number
  setEditedTopic: (v: string) => void
  setEditedScript: (v: string) => void
  setEditedCaption: (v: string) => void
  setEditedKeyword: (v: string) => void
  loadingTitle?: string
  loadingSub?: string
  emptyTitle: string
  emptySub: string
}

function IaDataPanel({
  idea,
  loading,
  isBusy,
  editedTopic,
  editedScript,
  editedCaption,
  editedKeyword,
  generationSceneCount,
  setEditedTopic,
  setEditedScript,
  setEditedCaption,
  setEditedKeyword,
  loadingTitle,
  loadingSub,
  emptyTitle,
  emptySub,
}: IaDataPanelProps) {
  const [scenes, setScenes] = useState<string[]>([''])

  // Garde une référence stable vers les scènes courantes pour pouvoir comparer
  // sans que la ref soit une dépendance de l'effect.
  const scenesRef = useRef<string[]>(scenes)
  scenesRef.current = scenes

  // Re-split uniquement si le script vient de l'extérieur (génération IA).
  // Quand l'utilisateur édite une scène, updateScene reconstruit le même
  // editedScript via joinScenes → la comparaison est égale → pas de re-split.
  useEffect(() => {
    if (editedScript && editedScript !== joinScenes(scenesRef.current)) {
      const next = splitScriptIntoScenes(editedScript)
      setScenes(next.length ? next : [''])
    }
  }, [editedScript])

  const updateScene = (index: number, value: string) => {
    const next = scenes.map((s, i) => (i === index ? value : s))
    setScenes(next)
    setEditedScript(joinScenes(next))
  }

  return (
    <div className="journey-wizard-side-card is-wide journey-generated-data-card">
      <span className="journey-wizard-card-label">Données générées</span>

      {loading ? (
        <div className="journey-loading">
          <div className="journey-loading-spinner" />
          <div className="journey-loading-copy">
            <strong>{loadingTitle || 'Génération en cours'}</strong>
            <span>{loadingSub || 'Idée + script en préparation…'}</span>
          </div>
        </div>
      ) : !idea ? (
        <div className="journey-empty">
          <strong>{emptyTitle}</strong>
          <p>{emptySub}</p>
        </div>
      ) : (
        <div className="journey-data-form">
          <div className="journey-step-row">
            <label htmlFor="ia-topic">Topic</label>
            <input
              id="ia-topic"
              type="text"
              className="journey-step-select"
              value={editedTopic}
              onChange={(e) => setEditedTopic(e.target.value)}
              disabled={isBusy}
              maxLength={500}
            />
          </div>

          <div className="journey-step-row journey-data-form-grow">
            <label>
              Script ({generationSceneCount} scène{generationSceneCount > 1 ? 's' : ''})
            </label>
            <div className="journey-scenes-list">
              {scenes.map((scene, index) => (
                <div className="journey-scene-row" key={index}>
                  <div className="journey-scene-head">
                    <span className="journey-scene-label">S{index + 1}</span>
                  </div>
                  <textarea
                    className="journey-step-select journey-scene-textarea"
                    value={scene}
                    onChange={(e) => updateScene(index, e.target.value)}
                    disabled={isBusy}
                    rows={2}
                    maxLength={500}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="journey-step-row">
            <label htmlFor="ia-caption">Caption</label>
            <textarea
              id="ia-caption"
              className="journey-step-select"
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              disabled={isBusy}
              rows={2}
              maxLength={2200}
            />
          </div>

          <div className="journey-step-row">
            <label htmlFor="ia-keyword">Mot-clé</label>
            <input
              id="ia-keyword"
              type="text"
              className="journey-step-select"
              value={editedKeyword}
              onChange={(e) => setEditedKeyword(e.target.value)}
              disabled={isBusy}
              maxLength={240}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Panneau Manuel : formulaire de saisie ──────────────────────────────── */

interface ManualDataPanelProps {
  isBusy: boolean
  topic: string
  setTopic: (v: string) => void
  scenes: string[]
  onUpdateScene: (index: number, value: string) => void
  onAddScene: () => void
  onRemoveScene: (index: number) => void
  caption: string
  setCaption: (v: string) => void
  keyword: string
  setKeyword: (v: string) => void
}

function ManualDataPanel({
  isBusy,
  topic,
  setTopic,
  scenes,
  onUpdateScene,
  onAddScene,
  onRemoveScene,
  caption,
  setCaption,
  keyword,
  setKeyword,
}: ManualDataPanelProps) {
  return (
    <div className="journey-wizard-side-card is-wide journey-generated-data-card">
      <span className="journey-wizard-card-label">Saisie manuelle</span>

      <div className="journey-data-form">
        {/* Topic */}
        <div className="journey-step-row">
          <label htmlFor="manual-topic">
            Topic <span style={{ color: 'var(--admin-status-danger)', marginLeft: 2 }}>*</span>
          </label>
          <input
            id="manual-topic"
            type="text"
            className="journey-step-select"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isBusy}
            placeholder="Ex : 5 astuces fitness pour débutants"
            maxLength={240}
          />
        </div>

        {/* Scènes */}
        <div className="journey-step-row journey-data-form-grow">
          <div className="journey-scenes-head">
            <label>
              Script ({scenes.length} scène{scenes.length > 1 ? 's' : ''})
            </label>
            <button
              type="button"
              className="journey-manual-scene-btn is-add"
              onClick={onAddScene}
              disabled={scenes.length >= MAX_SCENES || isBusy}
            >
              + Scène
            </button>
          </div>
          <div className="journey-scenes-list">
            {scenes.map((scene, index) => (
              <div
                key={index}
                className="journey-scene-row"
                style={{ gridTemplateColumns: '32px 1fr auto' }}
              >
                <div className="journey-scene-head">
                  <span className="journey-scene-label">S{index + 1}</span>
                </div>
                <textarea
                  className="journey-step-select journey-scene-textarea"
                  value={scene}
                  onChange={(e) => onUpdateScene(index, e.target.value)}
                  disabled={isBusy}
                  rows={2}
                  maxLength={500}
                  placeholder={`Texte de la scène ${index + 1}…`}
                />
                {scenes.length > MIN_SCENES && (
                  <button
                    type="button"
                    className="journey-manual-scene-remove"
                    onClick={() => onRemoveScene(index)}
                    disabled={isBusy}
                    aria-label={`Supprimer la scène ${index + 1}`}
                    style={{ marginTop: 4 }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Caption */}
        <div className="journey-step-row">
          <label htmlFor="manual-caption">Caption TikTok</label>
          <textarea
            id="manual-caption"
            className="journey-step-select"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={isBusy}
            rows={3}
            maxLength={2200}
            placeholder="Caption + hashtags pour la publication TikTok…"
          />
        </div>

        {/* Keyword */}
        <div className="journey-step-row">
          <label htmlFor="manual-keyword">Mot-clé Pexels</label>
          <input
            id="manual-keyword"
            type="text"
            className="journey-step-select"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={isBusy}
            placeholder="Ex : fitness workout"
            maxLength={120}
          />
          <span className="journey-step-row-hint">
            Utilisé pour la recherche de vidéos à l'étape Vidéo.
          </span>
        </div>
      </div>
    </div>
  )
}
