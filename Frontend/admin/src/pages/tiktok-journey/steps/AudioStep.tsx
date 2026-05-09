import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useJourney } from '../JourneyContext'
import { Button } from '../../../design-system'
import { VIDEO_OPS_QUERY_KEYS } from '../../../services/videoOpsQueries'
import {
  fetchVoices,
  generateVoice,
  listAudioAssets,
  previewVoiceBlob,
  selectAudioAsset,
  type AudioAsset,
  type VoiceCard,
} from '../../../services/audioApi'
import Waveform from './Waveform'

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
}

function flagFor(language: string | null | undefined): string {
  if (!language) return '🌐'
  const key = language.toLowerCase().slice(0, 2)
  return FLAGS[key] || '🌐'
}

/**
 * AudioStep — voice library, ElevenLabs preview + generation, dual-volume mixer.
 * Sits between the Creation step and the merged Template/Render step in the
 * 4-step TikTok journey (creation → audio → init-publish → upload).
 */
export default function AudioStep() {
  const { t } = useTranslation('journey')
  const queryClient = useQueryClient()
  const journey = useJourney()
  const idea = journey.scriptedIdea ?? journey.selectedGeneratedIdea
  const contentIdeaId: number | null = idea?.id ? Number(idea.id) : null
  const scriptText = String(idea?.script ?? '')
  const onContinue = () => journey.goToStep('init-publish')
  const onSkip = () => journey.goToStep('init-publish')

  const voicesQuery = useQuery<VoiceCard[], Error>({
    queryKey: VIDEO_OPS_QUERY_KEYS.audioVoices,
    queryFn: fetchVoices,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const assetsQuery = useQuery<AudioAsset[], Error>({
    queryKey: VIDEO_OPS_QUERY_KEYS.audioAssets(contentIdeaId),
    queryFn: () => listAudioAssets(contentIdeaId as number),
    enabled: typeof contentIdeaId === 'number' && contentIdeaId > 0,
    staleTime: 30 * 1000,
  })

  const selectedAsset = useMemo(
    () => assetsQuery.data?.find((a) => a.selected && a.assetKind === 'voice') ?? null,
    [assetsQuery.data],
  )

  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null)
  useEffect(() => {
    if (selectedAsset?.voiceId && !activeVoiceId) {
      setActiveVoiceId(selectedAsset.voiceId)
    }
  }, [selectedAsset, activeVoiceId])

  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  const [voiceVolume, setVoiceVolume] = useState<number>(selectedAsset?.voiceVolume ?? 100)
  const [musicVolume, setMusicVolume] = useState<number>(selectedAsset?.musicVolume ?? 30)
  useEffect(() => {
    if (selectedAsset) {
      setVoiceVolume(selectedAsset.voiceVolume)
      setMusicVolume(selectedAsset.musicVolume)
    }
  }, [selectedAsset?.id])

  useEffect(() => () => {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
  }, [previewObjectUrl])

  const previewMutation = useMutation({
    mutationFn: async (voiceId: string) => {
      const sample = scriptText?.trim()
        ? scriptText.trim().slice(0, 200)
        : 'Bonjour, voici un aperçu de ma voix.'
      const blob = await previewVoiceBlob(voiceId, sample)
      const url = URL.createObjectURL(blob)
      return { voiceId, url }
    },
    onMutate: () => {
      setIsPreviewing(true)
      setPreviewError(null)
    },
    onSuccess: ({ voiceId, url }) => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
      setPreviewObjectUrl(url)
      setPreviewVoiceId(voiceId)
      requestAnimationFrame(() => audioElementRef.current?.play().catch(() => undefined))
    },
    onError: (err: Error) => setPreviewError(err.message),
    onSettled: () => setIsPreviewing(false),
  })

  const generateMutation = useMutation({
    mutationFn: async (voiceId: string) => {
      if (!contentIdeaId || contentIdeaId <= 0) {
        throw new Error('contentIdeaId manquant — reviens à l\'étape Création.')
      }
      if (!scriptText?.trim()) {
        throw new Error(t('audio.noScript'))
      }
      return generateVoice({
        contentIdeaId,
        voiceId,
        text: scriptText.trim(),
        voiceVolume,
        musicVolume,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.audioAssets(contentIdeaId) })
    },
  })

  const selectMutation = useMutation({
    mutationFn: (assetId: number) => selectAudioAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VIDEO_OPS_QUERY_KEYS.audioAssets(contentIdeaId) })
    },
  })

  const canContinue = Boolean(selectedAsset?.storageUrl)

  return (
    <div className="audio-step" style={layoutStyle}>
      <header style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{t('audio.paramsLabel')}</h2>
        {onSkip ? (
          <Button onClick={onSkip} variant="ghost">
            {t('audio.skipStep')}
          </Button>
        ) : null}
      </header>

      {voicesQuery.isError ? (
        <div style={errorBoxStyle}>
          <strong>{t('audio.errorTitle')}</strong>
          <p style={{ margin: '4px 0 8px' }}>{voicesQuery.error.message}</p>
          <Button onClick={() => voicesQuery.refetch()} variant="primary">
            {t('audio.errorRetry')}
          </Button>
        </div>
      ) : null}

      <section aria-label={t('audio.voiceLibrary')} style={{ display: 'grid', gap: 12 }}>
        <h3 style={sectionTitleStyle}>{t('audio.voiceLibrary')}</h3>
        {voicesQuery.isLoading ? (
          <div style={{ padding: 24, opacity: 0.7 }}>{t('common.loading')}</div>
        ) : (
          <div role="list" style={voiceGridStyle}>
            {(voicesQuery.data ?? []).map((voice) => {
              const active = activeVoiceId === voice.voiceId
              const previewing = previewVoiceId === voice.voiceId && isPreviewing
              return (
                <div
                  key={voice.voiceId}
                  role="listitem"
                  style={voiceCardStyle(active)}
                  onClick={() => setActiveVoiceId(voice.voiceId)}
                >
                  <div style={voiceHeaderStyle}>
                    <span aria-label={t('audio.voiceFlagAria', { language: voice.language })} style={{ fontSize: 24 }}>
                      {flagFor(voice.language)}
                    </span>
                    <strong>{voice.name}</strong>
                  </div>
                  <div style={voiceMetaStyle}>
                    {voice.gender ? <span>{voice.gender}</span> : null}
                    {voice.accent ? <span> · {voice.accent}</span> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <Button
                      onClick={(e) => {
                        e?.stopPropagation()
                        previewMutation.mutate(voice.voiceId)
                      }}
                      variant="ghost"
                      disabled={previewing}
                    >
                      {previewing ? t('audio.voicePlaying') : t('audio.voicePreview')}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e?.stopPropagation()
                        setActiveVoiceId(voice.voiceId)
                      }}
                      variant={active ? 'primary' : 'secondary'}
                    >
                      {active ? t('audio.selected') : t('audio.selectVoice')}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section aria-label={t('audio.previewMix')} style={previewSectionStyle}>
        <h3 style={sectionTitleStyle}>{t('audio.previewMix')}</h3>
        <Waveform src={previewObjectUrl ?? selectedAsset?.storageUrl ?? null} ariaLabel={t('audio.waveformLabel')} />
        <audio
          ref={audioElementRef}
          src={previewObjectUrl ?? selectedAsset?.storageUrl ?? undefined}
          controls
          style={{ width: '100%', marginTop: 8 }}
        />
        {previewError ? <p style={{ color: '#f87171', fontSize: 12 }}>{previewError}</p> : null}
      </section>

      <section aria-label={t('audio.voiceVolume')} style={mixerSectionStyle}>
        <h3 style={sectionTitleStyle}>{t('audio.voiceVolume')} / {t('audio.musicVolume')}</h3>
        <label style={mixerRowStyle}>
          <span>{t('audio.voiceVolume')}</span>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={voiceVolume}
            onChange={(e) => setVoiceVolume(Number(e.target.value))}
          />
          <span style={{ width: 48, textAlign: 'right' }}>{voiceVolume}%</span>
        </label>
        <label style={mixerRowStyle}>
          <span>{t('audio.musicVolume')}</span>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
          />
          <span style={{ width: 48, textAlign: 'right' }}>{musicVolume}%</span>
        </label>
      </section>

      <footer style={footerStyle}>
        <Button
          onClick={() => activeVoiceId && generateMutation.mutate(activeVoiceId)}
          disabled={!activeVoiceId || generateMutation.isPending}
          variant="primary"
        >
          {generateMutation.isPending ? t('audio.generating') : t('audio.generate')}
        </Button>
        <Button
          onClick={() => selectedAsset && selectMutation.mutate(selectedAsset.id)}
          disabled={!selectedAsset || selectMutation.isPending}
          variant="secondary"
        >
          {t('audio.selected')}
        </Button>
        <Button onClick={onContinue} disabled={!canContinue} variant="primary">
          {t('common.next')}
        </Button>
      </footer>

      {generateMutation.isError ? (
        <div style={errorBoxStyle}>
          <strong>{t('audio.errorTitle')}</strong>
          <p style={{ margin: '4px 0 0' }}>{generateMutation.error?.message}</p>
        </div>
      ) : null}
    </div>
  )
}

const layoutStyle: React.CSSProperties = {
  display: 'grid',
  gap: 18,
  padding: 18,
  background: 'rgba(0, 0, 0, 0.18)',
  borderRadius: 16,
}
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 600, opacity: 0.85 }
const errorBoxStyle: React.CSSProperties = {
  background: 'rgba(248, 113, 113, 0.12)',
  border: '1px solid rgba(248, 113, 113, 0.32)',
  borderRadius: 8,
  padding: 12,
  color: '#fca5a5',
  fontSize: 13,
}
const voiceGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 12,
}
const voiceCardStyle = (active: boolean): React.CSSProperties => ({
  padding: 12,
  borderRadius: 10,
  border: active ? '2px solid #22d3ee' : '1px solid rgba(255, 255, 255, 0.08)',
  background: active ? 'rgba(34, 211, 238, 0.08)' : 'rgba(255, 255, 255, 0.04)',
  cursor: 'pointer',
  display: 'grid',
  gap: 6,
})
const voiceHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
const voiceMetaStyle: React.CSSProperties = { fontSize: 12, opacity: 0.7 }
const previewSectionStyle: React.CSSProperties = { display: 'grid', gap: 8 }
const mixerSectionStyle: React.CSSProperties = { display: 'grid', gap: 10 }
const mixerRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr 48px',
  alignItems: 'center',
  gap: 12,
  fontSize: 13,
}
const footerStyle: React.CSSProperties = { display: 'flex', gap: 12, justifyContent: 'flex-end' }
