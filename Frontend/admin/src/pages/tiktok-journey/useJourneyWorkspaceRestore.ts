import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import {
  fetchContentIdeaByIdFromPages,
  fetchManualActions,
  type PexelsVideo,
} from '../../services/videoOpsSupabase'
import type { ContentIdea, ManualAction } from '../../types'
import { readJourneyWorkspace } from './journeyWorkspace'
import { journeyTelemetry } from './journeyTelemetry'
import type { SceneTextStyle } from './types'

interface PexelsCacheValue {
  query: string
  videos: PexelsVideo[]
}

interface ManualActionLike {
  shotstackUrl?: string | null
  uploadUrl?: string | null
  [key: string]: unknown
}

export interface UseJourneyWorkspaceRestoreArgs {
  isFlowRoute: boolean
  locationPathname: string
  resumeIdeaIdRef: MutableRefObject<number | null>
  setGeneratedIdeas: Dispatch<SetStateAction<ContentIdea[]>>
  setSelectedGeneratedIdeaId: Dispatch<SetStateAction<number | null>>
  setScriptedIdea: Dispatch<SetStateAction<ContentIdea | null>>
  setManualAction: Dispatch<SetStateAction<ManualActionLike | null>>
  setPexelsCache: Dispatch<SetStateAction<PexelsCacheValue | null>>
  setSelectedSceneMediaUrls: Dispatch<SetStateAction<string[]>>
  setSceneTextStyles: Dispatch<SetStateAction<SceneTextStyle[]>>
  setEditedTopic: (value: string) => void
  setEditedScript: (value: string) => void
  setEditedCaption: (value: string) => void
  setEditedKeyword: (value: string) => void
  setSelectedTikTokSoundId: (id: string | null) => void
  setSelectedTemplateId: (id: string) => void
  setSelectedQualityProfile: (p: string) => void
  setVideoDurationSec: (s: number) => void
  setGenerationSceneCount: (n: number) => void
}

/**
 * Restores a saved workspace when the user enters the journey via "Reprendre"
 * from the library: refetches the idea + manual actions, rehydrates pexels
 * query + selected scene URLs + edited fields from localStorage, and emits a
 * telemetry event.
 *
 * Extracted from TikTokJourneyPage so the page component stays focused on
 * coordination instead of low-level state plumbing. The hook is intentionally
 * imperative — it returns nothing — because its only side effect is firing the
 * setters during mount.
 */
export function useJourneyWorkspaceRestore({
  isFlowRoute,
  locationPathname,
  resumeIdeaIdRef,
  setGeneratedIdeas,
  setSelectedGeneratedIdeaId,
  setScriptedIdea,
  setManualAction,
  setPexelsCache,
  setSelectedSceneMediaUrls,
  setSceneTextStyles,
  setEditedTopic,
  setEditedScript,
  setEditedCaption,
  setEditedKeyword,
  setSelectedTikTokSoundId,
  setSelectedTemplateId,
  setSelectedQualityProfile,
  setVideoDurationSec,
  setGenerationSceneCount,
}: UseJourneyWorkspaceRestoreArgs) {
  useEffect(() => {
    if (!isFlowRoute) return undefined

    const resumeIdeaId = Number(resumeIdeaIdRef.current || 0)
    if (!resumeIdeaId) return undefined

    let cancelled = false

    const run = async () => {
      try {
        const [idea, manualActions] = await Promise.all([
          fetchContentIdeaByIdFromPages(resumeIdeaId),
          fetchManualActions() as Promise<ManualAction[]>,
        ])
        if (cancelled || !idea?.id) return

        const manualActionRecord =
          manualActions.find((item) => Number(item?.id) === Number(idea.id)) || null

        setGeneratedIdeas([idea])
        setSelectedGeneratedIdeaId(Number(idea.id))
        setScriptedIdea(idea)
        setManualAction(
          manualActionRecord
            ? { ...manualActionRecord }
            : {
                id: Number(idea.id),
                topic: idea.topic ?? null,
                shotstackUrl: idea.shotstackUrl || null,
                uploadUrl: idea.uploadUrl || null,
                tiktokStatus: idea.tiktokStatus || null,
                finalVideoStatus: idea.finalVideoStatus || null,
                shotstackStatus: idea.shotstackStatus || null,
                pipelineStatus: idea.pipelineStatus || null,
                lastError: idea.lastError || null,
              },
        )

        journeyTelemetry.trackWorkspaceResumed({ contentIdeaId: Number(idea.id) || null })

        const snapshot = readJourneyWorkspace(resumeIdeaId)
        if (snapshot && !cancelled) {
          if (snapshot.pexelsQuery) {
            setPexelsCache({ query: snapshot.pexelsQuery, videos: [] })
          }
          if (Array.isArray(snapshot.selectedSceneMediaUrls)) {
            setSelectedSceneMediaUrls(snapshot.selectedSceneMediaUrls.map((u) => String(u || '')))
          }
          if (Array.isArray(snapshot.sceneTextStyles)) {
            setSceneTextStyles(snapshot.sceneTextStyles as SceneTextStyle[])
          }
          if (typeof snapshot.editedTopic === 'string') setEditedTopic(snapshot.editedTopic)
          if (typeof snapshot.editedScript === 'string') setEditedScript(snapshot.editedScript)
          if (typeof snapshot.editedCaption === 'string') setEditedCaption(snapshot.editedCaption)
          if (typeof snapshot.editedKeyword === 'string') setEditedKeyword(snapshot.editedKeyword)
          if (typeof snapshot.selectedTikTokSoundId === 'string')
            setSelectedTikTokSoundId(snapshot.selectedTikTokSoundId)
          if (typeof snapshot.selectedTemplateId === 'string')
            setSelectedTemplateId(snapshot.selectedTemplateId)
          if (typeof snapshot.selectedQualityProfile === 'string')
            setSelectedQualityProfile(snapshot.selectedQualityProfile)
          if (typeof snapshot.videoDurationSec === 'number')
            setVideoDurationSec(snapshot.videoDurationSec)
          if (typeof snapshot.generationSceneCount === 'number')
            setGenerationSceneCount(snapshot.generationSceneCount)
        }
      } catch {
        // Resume is best-effort. If it fails, the route still opens normally.
      } finally {
        if (!cancelled) {
          resumeIdeaIdRef.current = null
          window.history.replaceState({}, document.title, locationPathname)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
    // The setters are stable identities (state setters / wrapped callbacks);
    // we don't include them in deps to avoid re-running the effect on every
    // parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlowRoute, locationPathname])
}
