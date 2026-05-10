import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useJourney } from '../JourneyContext'
import { Button } from '../../../design-system'
import { VIDEO_OPS_QUERY_KEYS } from '../../../services/videoOpsQueries'
import {
  fetchVoices,
  fetchTikTokSounds,
  importTikTokSoundByUrl,
  generateVoice,
  listAudioAssets,
  previewVoiceBlob,
  selectAudioAsset,
  type AudioAsset,
  type TikTokSound,
  type VoiceCard,
} from '../../../services/audioApi'
import Waveform from './Waveform'

type AudioMode = 'voix' | 'musique' | 'voix-musique'

function isCircuitBreakerError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? '').toLowerCase()
  return (
    msg.includes('circuitbreaker') || msg.includes('circuit breaker') || msg.includes('is open')
  )
}

function useRetryCountdown(trigger: boolean, seconds = 30) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!trigger) return
    setRemaining(seconds)
    const id = setInterval(
      () => setRemaining((s) => (s <= 1 ? (clearInterval(id), 0) : s - 1)),
      1000,
    )
    return () => clearInterval(id)
  }, [trigger, seconds])
  return remaining
}

const FLAGS: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  nl: '🇳🇱',
  pl: '🇵🇱',
  ar: '🇸🇦',
}

function flagFor(lang: string | null | undefined) {
  return (
    FLAGS[
      String(lang || '')
        .toLowerCase()
        .slice(0, 2)
    ] ?? '🌐'
  )
}

export default function AudioStep() {
  const { t } = useTranslation('journey')
  const queryClient = useQueryClient()
  const journey = useJourney()
  const idea = journey.scriptedIdea ?? journey.selectedGeneratedIdea
  const contentIdeaId: number | null = idea?.id ? Number(idea.id) : null
  const scriptText = String(idea?.script ?? '')

  const [mode, setMode] = useState<AudioMode>('voix')
  const hasMusicMode = mode === 'musique' || mode === 'voix-musique'

  // Son TikTok sélectionné — depuis le contexte journey
  const selectedTikTokSoundId = journey.selectedTikTokSoundId
  const setSelectedTikTokSoundId = journey.setSelectedTikTokSoundId

  // Son en cours de prévisualisation dans le panneau droit
  const [previewingSound, setPreviewingSound] = useState<TikTokSound | null>(null)
  const soundPreviewRef = useRef<HTMLAudioElement | null>(null)

  // Recherche sons TikTok
  const [soundCategory, setSoundCategory] = useState('trending')
  const [soundSearchQ, setSoundSearchQ] = useState('')
  const [committedQ, setCommittedQ] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (importOpen) importInputRef.current?.focus()
  }, [importOpen])

  // Voix
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null)
  const [voiceVolume, setVoiceVolume] = useState(100)
  const [musicVolume, setMusicVolume] = useState(30)

  // Preview voix (blob ElevenLabs)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(
    () => () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
    },
    [previewBlobUrl],
  )

  // ── Queries ───────────────────────────────────────────────────────────────

  const voicesQuery = useQuery<VoiceCard[], Error>({
    queryKey: VIDEO_OPS_QUERY_KEYS.audioVoices,
    queryFn: fetchVoices,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failCount, err) => !isCircuitBreakerError(err) && failCount < 2,
  })

  const isCbError = voicesQuery.isError && isCircuitBreakerError(voicesQuery.error)
  const cbCountdown = useRetryCountdown(isCbError, 30)

  useEffect(() => {
    if (isCbError && cbCountdown === 0) void voicesQuery.refetch()
  }, [cbCountdown, isCbError, voicesQuery])

  const soundsQuery = useQuery<TikTokSound[], Error>({
    queryKey: VIDEO_OPS_QUERY_KEYS.tiktokSounds(soundCategory, committedQ),
    queryFn: () =>
      fetchTikTokSounds({ category: soundCategory, q: committedQ || undefined, limit: 40 }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: hasMusicMode,
    retry: 1,
  })

  const assetsQuery = useQuery<AudioAsset[], Error>({
    queryKey: VIDEO_OPS_QUERY_KEYS.audioAssets(contentIdeaId),
    queryFn: () => listAudioAssets(contentIdeaId as number),
    enabled: typeof contentIdeaId === 'number' && contentIdeaId > 0,
    staleTime: 30_000,
  })

  const selectedAsset = useMemo(
    () => assetsQuery.data?.find((a) => a.selected) ?? null,
    [assetsQuery.data],
  )

  useEffect(() => {
    if (selectedAsset?.voiceId && !activeVoiceId) setActiveVoiceId(selectedAsset.voiceId)
  }, [selectedAsset, activeVoiceId])

  useEffect(() => {
    if (selectedAsset) {
      setVoiceVolume(selectedAsset.voiceVolume)
      setMusicVolume(selectedAsset.musicVolume)
    }
  }, [selectedAsset?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ─────────────────────────────────────────────────────────────

  const previewMutation = useMutation({
    mutationFn: async (voiceId: string) => {
      setPreviewingId(voiceId)
      setPreviewError(null)
      const sample = scriptText.trim().slice(0, 200) || 'Bonjour, voici un aperçu de ma voix.'
      const blob = await previewVoiceBlob(voiceId, sample)
      return { voiceId, url: URL.createObjectURL(blob) }
    },
    onSuccess: ({ voiceId, url }) => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(url)
      setPreviewingId(voiceId)
      requestAnimationFrame(() => audioRef.current?.play().catch(() => undefined))
    },
    onError: (err: Error) => {
      setPreviewError(err.message)
      setPreviewingId(null)
    },
    onSettled: () => setPreviewingId(null),
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!contentIdeaId || contentIdeaId <= 0) throw new Error("Lance d'abord l'étape Création.")
      if (!scriptText.trim()) throw new Error(t('audio.noScript'))
      if (!activeVoiceId) throw new Error('Sélectionne une voix avant de générer.')
      return generateVoice({
        contentIdeaId,
        voiceId: activeVoiceId,
        text: scriptText.trim(),
        voiceVolume,
        musicVolume: mode === 'musique' ? 0 : musicVolume,
      })
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.audioAssets(contentIdeaId) }),
  })

  const selectMutation = useMutation({
    mutationFn: (assetId: number) => selectAudioAsset(assetId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.audioAssets(contentIdeaId) }),
  })

  const importMutation = useMutation({
    mutationFn: (url: string) => importTikTokSoundByUrl(url),
    onSuccess: ({ sound }) => {
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.tiktokSoundsRoot })
      setSelectedTikTokSoundId(sound.soundId)
      setPreviewingSound(sound)
      setImportUrl('')
      setImportOpen(false)
    },
  })

  const isBusy = generateMutation.isPending || selectMutation.isPending
  const canGenerate = Boolean(activeVoiceId) && mode !== 'musique' && !isCbError
  const hasResult = Boolean(selectedAsset?.storageUrl)

  // Prévisualisation d'un son TikTok dans le panneau droit
  const handleSoundPreview = (sound: TikTokSound) => {
    if (previewingSound?.soundId === sound.soundId) {
      soundPreviewRef.current?.pause()
      setPreviewingSound(null)
      return
    }
    setPreviewingSound(sound)
    if (sound.playUrl && soundPreviewRef.current) {
      soundPreviewRef.current.src = sound.playUrl
      soundPreviewRef.current.play().catch(() => undefined)
    }
  }

  const handleContinue = () => journey.handleValidateAudio()

  return (
    <div className={`journey-audio-layout ${hasMusicMode ? 'is-music-mode' : ''}`}>
      {/* ── Colonne gauche : paramètres ───────────────────────────────────── */}
      <aside className="journey-audio-params">
        <div className="journey-wizard-side-card is-narrow">
          <span className="journey-wizard-card-label">Paramètres audio</span>

          <div className="journey-tabs" role="tablist">
            {(['voix', 'musique', 'voix-musique'] as AudioMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`journey-tab journey-audio-tab ${mode === m ? 'is-active' : ''}`}
                onClick={() => setMode(m)}
              >
                {m === 'voix' && '🎙 Voix'}
                {m === 'musique' && '🎵 Musique'}
                {m === 'voix-musique' && '🎚 Mix'}
              </button>
            ))}
          </div>

          {/* Tab Voix */}
          {(mode === 'voix' || mode === 'voix-musique') && (
            <div className="journey-tab-panel" role="tabpanel">
              {voicesQuery.isError && (
                <div className={`journey-audio-error ${isCbError ? 'is-cb' : ''}`}>
                  {isCbError ? (
                    <>
                      <span className="journey-audio-cb-icon">⚡</span>
                      <strong>ElevenLabs temporairement indisponible</strong>
                      <p>Le service vocal est surchargé ou en maintenance.</p>
                      <div className="journey-audio-cb-retry">
                        {cbCountdown > 0 ? (
                          <>
                            <span className="journey-audio-cb-countdown">{cbCountdown}s</span>
                            <span className="journey-audio-cb-hint">
                              Nouvelle tentative automatique…
                            </span>
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            onClick={() => voicesQuery.refetch()}
                            disabled={voicesQuery.isFetching}
                          >
                            {voicesQuery.isFetching ? 'Connexion…' : 'Réessayer'}
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <strong>Erreur chargement des voix</strong>
                      <p>{voicesQuery.error.message}</p>
                      <Button variant="primary" onClick={() => voicesQuery.refetch()}>
                        Réessayer
                      </Button>
                    </>
                  )}
                </div>
              )}
              {voicesQuery.isLoading && (
                <p className="journey-audio-loading">Chargement des voix…</p>
              )}
              {!voicesQuery.isLoading && !voicesQuery.isError && (
                <div className="journey-audio-voice-list" role="list">
                  {(voicesQuery.data ?? []).map((voice) => {
                    const isActive = activeVoiceId === voice.voiceId
                    const isPreviewing = previewingId === voice.voiceId && previewMutation.isPending
                    return (
                      <div
                        key={voice.voiceId}
                        role="button"
                        className={`journey-audio-voice-row ${isActive ? 'is-active' : ''}`}
                        onClick={() => setActiveVoiceId(voice.voiceId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setActiveVoiceId(voice.voiceId)
                          }
                        }}
                        tabIndex={0}
                      >
                        <span className="journey-audio-voice-flag" aria-hidden="true">
                          {flagFor(voice.language)}
                        </span>
                        <div className="journey-audio-voice-info">
                          <strong>{voice.name}</strong>
                          <span>
                            {voice.gender}
                            {voice.accent ? ` · ${voice.accent}` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="journey-audio-preview-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            previewMutation.mutate(voice.voiceId)
                          }}
                          disabled={isPreviewing || previewMutation.isPending}
                          aria-label={`Écouter ${voice.name}`}
                        >
                          {isPreviewing ? '⏸' : '▶'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="journey-step-row" style={{ marginTop: 8 }}>
                <label htmlFor="audio-voice-vol">Volume voix</label>
                <div className="journey-audio-slider-row">
                  <input
                    id="audio-voice-vol"
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={voiceVolume}
                    onChange={(e) => setVoiceVolume(Number(e.target.value))}
                  />
                  <span className="journey-audio-slider-val">{voiceVolume}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab Musique — contrôles dans params (catégories, recherche, import, volume) */}
          {hasMusicMode && (
            <div className="journey-tab-panel" role="tabpanel">
              <div className="journey-audio-sound-cats">
                {['trending', 'pop', 'hip-hop', 'electronic', 'chill', 'motivation'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`journey-audio-sound-cat ${soundCategory === cat ? 'is-active' : ''}`}
                    onClick={() => {
                      setSoundCategory(cat)
                      setCommittedQ('')
                    }}
                  >
                    {cat === 'trending' ? '🔥' : ''} {cat}
                  </button>
                ))}
              </div>
              <form
                className="journey-audio-sound-search"
                onSubmit={(e) => {
                  e.preventDefault()
                  setCommittedQ(soundSearchQ)
                }}
              >
                <input
                  type="search"
                  className="journey-step-select"
                  value={soundSearchQ}
                  onChange={(e) => setSoundSearchQ(e.target.value)}
                  placeholder="Rechercher un son…"
                />
                <button type="submit" className="journey-btn is-ghost" style={{ fontSize: 12 }}>
                  OK
                </button>
              </form>
              <button
                type="button"
                className="journey-audio-import-btn"
                onClick={() => setImportOpen((v) => !v)}
              >
                🔗 Importer depuis une URL TikTok
              </button>
              {importOpen && (
                <div className="journey-audio-import-row">
                  <input
                    ref={importInputRef}
                    type="url"
                    className="journey-step-select"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://vt.tiktok.com/... ou /music/..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (importUrl.trim()) importMutation.mutate(importUrl.trim())
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="journey-btn is-primary"
                    onClick={() => {
                      if (importUrl.trim()) importMutation.mutate(importUrl.trim())
                    }}
                    disabled={!importUrl.trim() || importMutation.isPending}
                  >
                    {importMutation.isPending ? '…' : 'Importer'}
                  </button>
                </div>
              )}
              {importMutation.isError && (
                <p className="journey-audio-error-inline">{importMutation.error?.message}</p>
              )}
              {importMutation.isSuccess && (
                <p style={{ fontSize: 12, color: 'var(--journey-status-success)', marginTop: 4 }}>
                  Son importé ✓
                </p>
              )}
              <div className="journey-step-row" style={{ marginTop: 8 }}>
                <label htmlFor="audio-music-vol">Volume musique</label>
                <div className="journey-audio-slider-row">
                  <input
                    id="audio-music-vol"
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                  />
                  <span className="journey-audio-slider-val">{musicVolume}%</span>
                </div>
              </div>
            </div>
          )}

          {generateMutation.isError && (
            <div className="journey-audio-error">
              <strong>Erreur</strong>
              <p>{generateMutation.error?.message}</p>
            </div>
          )}

          <div className="journey-step-cta journey-step-cta-stack">
            {mode !== 'musique' && (
              <Button
                variant="secondary"
                onClick={() => generateMutation.mutate()}
                disabled={!canGenerate || isBusy || !contentIdeaId}
              >
                {generateMutation.isPending ? 'Génération…' : hasResult ? 'Régénérer' : 'Générer'}
              </Button>
            )}
            <Button variant="primary" onClick={handleContinue}>
              {hasResult || selectedTikTokSoundId ? 'Continuer →' : 'Passer cette étape →'}
            </Button>
          </div>
          <p className="journey-step-row-hint" style={{ textAlign: 'center', marginTop: 4 }}>
            Tu peux continuer sans audio — la voix off est optionnelle.
          </p>
        </div>
      </aside>

      {/* ── Colonne milieu : bibliothèque sons OU résultats voix ─────────── */}
      <section className="journey-audio-library">
        {hasMusicMode ? (
          /* Bibliothèque TikTok sounds */
          <div className="journey-wizard-side-card is-wide journey-generated-data-card">
            <span className="journey-wizard-card-label">
              Bibliothèque
              {selectedTikTokSoundId && (
                <span className="journey-audio-selected-badge" style={{ marginLeft: 8 }}>
                  Son sélectionné ✓
                </span>
              )}
            </span>
            <TikTokSoundPanel
              sounds={soundsQuery.data ?? []}
              isLoading={soundsQuery.isLoading}
              isError={soundsQuery.isError}
              errorMessage={soundsQuery.error?.message ?? null}
              selectedSoundId={selectedTikTokSoundId}
              previewingId={previewingSound?.soundId ?? null}
              onSelect={setSelectedTikTokSoundId}
              onPreview={handleSoundPreview}
              onRetry={() => soundsQuery.refetch()}
            />
          </div>
        ) : (
          /* Résultats voix générés */
          <div className="journey-wizard-side-card is-wide journey-generated-data-card">
            <span className="journey-wizard-card-label">Résultats audio</span>
            {!contentIdeaId ? (
              <div className="journey-empty">
                <strong>Aucune idée active</strong>
                <p>Génère d'abord une idée à l'étape Création.</p>
              </div>
            ) : assetsQuery.isLoading || generateMutation.isPending ? (
              <div className="journey-loading">
                <div className="journey-loading-spinner" />
                <div className="journey-loading-copy">
                  <strong>
                    {generateMutation.isPending ? 'Génération en cours' : 'Chargement…'}
                  </strong>
                  <span>
                    {generateMutation.isPending
                      ? 'ElevenLabs génère la voix off…'
                      : 'Récupération des fichiers audio…'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="journey-audio-results">
                {previewBlobUrl && (
                  <div className="journey-audio-result-card">
                    <div className="journey-audio-result-head">
                      <span className="journey-audio-result-kind">Aperçu voix</span>
                      <span className="journey-audio-result-meta">
                        {(voicesQuery.data ?? []).find(
                          (v) => v.voiceId === (previewingId || activeVoiceId),
                        )?.name ?? '—'}
                      </span>
                    </div>
                    <Waveform
                      src={previewBlobUrl}
                      height={52}
                      color="var(--admin-accent)"
                      ariaLabel="Aperçu de la voix"
                    />
                    <audio
                      ref={audioRef}
                      src={previewBlobUrl}
                      controls
                      className="journey-audio-player"
                    >
                      <track kind="captions" />
                    </audio>
                    {previewError && <p className="journey-audio-error-inline">{previewError}</p>}
                  </div>
                )}
                {(assetsQuery.data ?? []).length === 0 && !previewBlobUrl ? (
                  <div className="journey-empty">
                    <strong>Aucun audio généré</strong>
                    <p>Sélectionne une voix et clique sur Générer, ou passe cette étape.</p>
                  </div>
                ) : (
                  <div className="journey-audio-asset-list">
                    {(assetsQuery.data ?? []).map((asset) => (
                      <div
                        key={asset.id}
                        className={`journey-audio-result-card ${asset.selected ? 'is-selected' : ''}`}
                      >
                        <div className="journey-audio-result-head">
                          <span className="journey-audio-result-kind">
                            {asset.assetKind === 'voice'
                              ? '🎙 Voix'
                              : asset.assetKind === 'music'
                                ? '🎵 Musique'
                                : '🎚 Mix'}
                            {asset.selected && (
                              <span className="journey-audio-selected-badge">Sélectionné</span>
                            )}
                          </span>
                          <span className="journey-audio-result-meta">
                            {asset.voiceName ?? '—'} · v{asset.voiceVolume}% m{asset.musicVolume}%
                            {asset.durationMs ? ` · ${(asset.durationMs / 1000).toFixed(1)}s` : ''}
                          </span>
                        </div>
                        <Waveform
                          src={asset.storageUrl}
                          height={52}
                          color={
                            asset.selected ? 'var(--journey-status-success)' : 'var(--admin-accent)'
                          }
                          ariaLabel="Forme d'onde audio"
                        />
                        <audio src={asset.storageUrl} controls className="journey-audio-player">
                          <track kind="captions" />
                        </audio>
                        {!asset.selected && (
                          <Button
                            variant="secondary"
                            onClick={() => selectMutation.mutate(asset.id)}
                            disabled={selectMutation.isPending}
                          >
                            Utiliser cet audio
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Colonne droite : prévisualisation son TikTok (mode musique) ────── */}
      {hasMusicMode && (
        <aside className="journey-audio-preview-col">
          <div className="journey-wizard-side-card is-narrow journey-sound-preview-card">
            <span className="journey-wizard-card-label">Prévisualisation</span>
            <audio
              ref={soundPreviewRef}
              onEnded={() => setPreviewingSound(null)}
              style={{ display: 'none' }}
            >
              <track kind="captions" />
            </audio>
            {!previewingSound ? (
              <div className="journey-sound-preview-empty">
                <span className="journey-sound-preview-empty-icon">🎵</span>
                <strong>Aucun son sélectionné</strong>
                <p>Clique sur ▶ dans la bibliothèque pour écouter un son avant de le choisir.</p>
              </div>
            ) : (
              <div className="journey-sound-preview-content">
                {/* Pochette */}
                <div className="journey-sound-preview-cover">
                  {previewingSound.coverUrl ? (
                    <img
                      src={previewingSound.coverUrl}
                      alt=""
                      className="journey-sound-preview-img"
                    />
                  ) : (
                    <span className="journey-sound-preview-placeholder">🎵</span>
                  )}
                  {previewingSound.trending && (
                    <span
                      className="journey-sound-trend"
                      style={{ position: 'absolute', top: 8, left: 8 }}
                    >
                      🔥 Trending
                    </span>
                  )}
                </div>

                {/* Infos */}
                <div className="journey-sound-preview-info">
                  <strong className="journey-sound-preview-title">{previewingSound.title}</strong>
                  <span className="journey-sound-preview-author">{previewingSound.authorName}</span>
                  <div className="journey-sound-meta" style={{ marginTop: 4 }}>
                    {previewingSound.durationMs && (
                      <span>{(previewingSound.durationMs / 1000).toFixed(0)}s</span>
                    )}
                    {previewingSound.videoCount && (
                      <span>
                        {previewingSound.videoCount > 1_000_000
                          ? `${(previewingSound.videoCount / 1_000_000).toFixed(1)}M`
                          : previewingSound.videoCount > 1_000
                            ? `${Math.round(previewingSound.videoCount / 1_000)}K`
                            : previewingSound.videoCount}{' '}
                        vidéos
                      </span>
                    )}
                  </div>
                </div>

                {/* Lecteur audio */}
                {previewingSound.playUrl ? (
                  <div className="journey-sound-preview-player">
                    <button
                      type="button"
                      className="journey-sound-preview-play-btn"
                      onClick={() => handleSoundPreview(previewingSound)}
                      aria-label="Play/Pause"
                    >
                      ⏸ Pause
                    </button>
                    <Waveform
                      src={previewingSound.playUrl}
                      height={44}
                      color="var(--admin-accent)"
                      ariaLabel="Forme d'onde du son"
                    />
                  </div>
                ) : (
                  <p className="journey-step-row-hint" style={{ fontSize: 11 }}>
                    Aperçu audio non disponible pour ce son.
                  </p>
                )}

                {/* Actions */}
                <div className="journey-sound-preview-actions">
                  {selectedTikTokSoundId === previewingSound.soundId ? (
                    <div className="journey-sound-preview-selected">
                      <span>✓ Sélectionné</span>
                      <button
                        type="button"
                        className="journey-btn is-ghost"
                        onClick={() => setSelectedTikTokSoundId(null)}
                        style={{ fontSize: 11 }}
                      >
                        Retirer
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => setSelectedTikTokSoundId(previewingSound.soundId)}
                    >
                      Choisir ce son
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

/* ── TikTokSoundPanel — grille bibliothèque ─────────────────────────────── */

interface TikTokSoundPanelProps {
  sounds: TikTokSound[]
  isLoading: boolean
  isError: boolean
  errorMessage: string | null
  selectedSoundId: string | null
  previewingId: string | null
  onSelect: (id: string | null) => void
  onPreview: (sound: TikTokSound) => void
  onRetry: () => void
}

function TikTokSoundPanel({
  sounds,
  isLoading,
  isError,
  errorMessage,
  selectedSoundId,
  previewingId,
  onSelect,
  onPreview,
  onRetry,
}: TikTokSoundPanelProps) {
  if (isLoading) {
    return (
      <div className="journey-audio-sound-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="journey-sound-card is-skeleton">
            <div className="journey-sound-card-cover journey-skeleton-shimmer" />
            <div className="journey-sound-card-info">
              <div
                className="journey-skeleton-line journey-skeleton-shimmer"
                style={{ height: 10 }}
              />
              <div
                className="journey-skeleton-line journey-skeleton-shimmer is-short"
                style={{ height: 8 }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="journey-audio-error" style={{ marginBottom: 8 }}>
        <strong>Impossible de charger les sons</strong>
        <p>{errorMessage}</p>
        <button
          type="button"
          className="journey-btn is-ghost"
          onClick={onRetry}
          style={{ fontSize: 12 }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (sounds.length === 0) {
    return (
      <div className="journey-empty" style={{ padding: '16px 0' }}>
        <strong>Aucun son trouvé</strong>
        <p>Essaie une autre catégorie ou importe un son via l'URL TikTok dans les paramètres.</p>
      </div>
    )
  }

  return (
    <div className="journey-audio-sound-grid">
      {sounds.map((sound) => {
        const isSelected = selectedSoundId === sound.soundId
        const isPreviewing = previewingId === sound.soundId
        return (
          <div
            key={sound.soundId}
            role="option"
            tabIndex={0}
            aria-selected={isSelected}
            className={[
              'journey-sound-card',
              isSelected ? 'is-selected' : '',
              isPreviewing ? 'is-previewing' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(isSelected ? null : sound.soundId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(isSelected ? null : sound.soundId)
              }
            }}
          >
            <div className="journey-sound-card-cover">
              {sound.coverUrl ? (
                <img
                  src={sound.coverUrl}
                  alt=""
                  className="journey-sound-card-img"
                  loading="lazy"
                />
              ) : (
                <span className="journey-sound-card-placeholder">🎵</span>
              )}
              {sound.trending && <span className="journey-sound-trend">🔥</span>}
              {isSelected && <span className="journey-sound-check">✓</span>}
              {/* Bouton preview → panneau droit */}
              <button
                type="button"
                className={['journey-sound-play', isPreviewing ? 'is-playing' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-label={isPreviewing ? 'En lecture' : `Écouter ${sound.title}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onPreview(sound)
                }}
              >
                {isPreviewing ? '⏸' : '▶'}
              </button>
            </div>
            <div className="journey-sound-card-info">
              <span className="journey-sound-title" title={sound.title}>
                {sound.title.length > 20 ? `${sound.title.slice(0, 18)}…` : sound.title}
              </span>
              <span className="journey-sound-author">{sound.authorName}</span>
              <div className="journey-sound-meta">
                {sound.durationMs && <span>{(sound.durationMs / 1000).toFixed(0)}s</span>}
                {sound.videoCount && (
                  <span>
                    {sound.videoCount > 1_000_000
                      ? `${(sound.videoCount / 1_000_000).toFixed(1)}M`
                      : sound.videoCount > 1_000
                        ? `${Math.round(sound.videoCount / 1_000)}K`
                        : sound.videoCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
