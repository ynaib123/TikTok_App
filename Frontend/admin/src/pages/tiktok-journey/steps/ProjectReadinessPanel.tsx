import { useQuery } from '@tanstack/react-query'
import { useJourney } from '../JourneyContext'
import { listAudioAssets } from '../../../services/audioApi'
import { VIDEO_OPS_QUERY_KEYS } from '../../../services/videoOpsQueries'

type ReadinessStatus = 'ok' | 'warn' | 'error' | 'optional'

interface ReadinessItem {
  key: string
  label: string
  detail: string
  status: ReadinessStatus
  blocking: boolean
}

function statusIcon(s: ReadinessStatus) {
  if (s === 'ok') return '✓'
  if (s === 'warn') return '⚠'
  if (s === 'error') return '✕'
  return '○'
}

/**
 * Panneau compact indiquant ce qui est prêt / manquant avant de lancer un rendu.
 * Affiché dans le parcours pour éviter que l'utilisateur découvre les blocages
 * uniquement au moment du bouton "Générer".
 */
export function ProjectReadinessPanel({ compact = false }: { compact?: boolean }) {
  const p = useJourney()
  const idea = p.scriptedIdea || p.selectedGeneratedIdea
  const contentIdeaId = idea?.id ? Number(idea.id) : null

  const assetsQuery = useQuery({
    queryKey: VIDEO_OPS_QUERY_KEYS.audioAssets(contentIdeaId),
    queryFn: () => listAudioAssets(contentIdeaId as number),
    enabled: typeof contentIdeaId === 'number' && contentIdeaId > 0,
    staleTime: 30_000,
  })

  const selectedAudio = assetsQuery.data?.find((a) => a.selected) ?? null
  const sceneCount = Math.max(1, p.generationSceneCount || 1)
  const filledSlots = p.selectedSceneMediaUrls.filter((u) => Boolean(u?.trim())).length
  const stylesCount = p.sceneTextStyles.filter((s) => s && s.saved).length

  const items: ReadinessItem[] = [
    {
      key: 'idea',
      label: 'Idée & script',
      detail: idea
        ? `"${(p.editedTopic || idea.topic || '').slice(0, 40)}"`
        : 'Aucune idée sélectionnée',
      status: idea ? 'ok' : 'error',
      blocking: true,
    },
    {
      key: 'media',
      label: 'Médias',
      detail:
        filledSlots === sceneCount
          ? `${filledSlots}/${sceneCount} scènes`
          : filledSlots > 0
            ? `${filledSlots}/${sceneCount} scènes — ${sceneCount - filledSlots} manquante(s)`
            : 'Aucun média sélectionné',
      status: filledSlots === sceneCount ? 'ok' : filledSlots > 0 ? 'warn' : 'error',
      blocking: true,
    },
    {
      key: 'audio',
      label: 'Audio',
      detail: selectedAudio
        ? `${selectedAudio.assetKind} sélectionné`
        : p.selectedTikTokSoundId
          ? `TikTok sound #${p.selectedTikTokSoundId}`
          : 'Aucun audio (optionnel)',
      status: selectedAudio || p.selectedTikTokSoundId ? 'ok' : 'optional',
      blocking: false,
    },
    {
      key: 'style',
      label: 'Styles de texte',
      detail:
        stylesCount > 0
          ? `${stylesCount}/${sceneCount} scène(s) personnalisée(s)`
          : 'Styles par défaut',
      status: stylesCount > 0 ? 'ok' : 'optional',
      blocking: false,
    },
    {
      key: 'account',
      label: 'Compte TikTok',
      detail: p.connectedTikTokAccount
        ? `@${p.connectedTikTokAccount.nickname || p.connectedTikTokAccount.openId}`
        : 'Non connecté (requis pour publier)',
      status: p.connectedTikTokAccount ? 'ok' : 'warn',
      blocking: false,
    },
  ]

  const blockingIssues = items.filter((i) => i.blocking && i.status !== 'ok')
  const isReady = blockingIssues.length === 0

  if (compact) {
    return (
      <div className={`journey-readiness-compact ${isReady ? 'is-ready' : 'has-issues'}`}>
        <span className="journey-readiness-compact-icon">{isReady ? '✓' : '⚠'}</span>
        <span className="journey-readiness-compact-label">
          {isReady ? 'Prêt pour le rendu' : `${blockingIssues.length} condition(s) bloquante(s)`}
        </span>
      </div>
    )
  }

  return (
    <div className="journey-readiness-panel">
      <div className="journey-readiness-header">
        <span className={`journey-readiness-status-dot ${isReady ? 'is-ready' : 'has-issues'}`} />
        <strong className="journey-readiness-title">
          {isReady ? 'Prêt pour le rendu' : 'Conditions manquantes'}
        </strong>
      </div>
      <ul className="journey-readiness-list">
        {items.map((item) => (
          <li key={item.key} className={`journey-readiness-item status-${item.status}`}>
            <span className="journey-readiness-item-icon">{statusIcon(item.status)}</span>
            <span className="journey-readiness-item-label">{item.label}</span>
            <span className="journey-readiness-item-detail">{item.detail}</span>
          </li>
        ))}
      </ul>
      {!isReady && (
        <p className="journey-readiness-hint">
          {blockingIssues.map((i) => i.label).join(', ')} requis avant de générer.
        </p>
      )}
    </div>
  )
}
