const JOURNEY_WORKSPACE_STORAGE_KEY = 'tiktok-journey-workspaces-v1'
const MAX_PEXELS_QUERY_LENGTH = 200
const MAX_SCENE_STYLES_COUNT = 10

export interface JourneyWorkspaceSnapshot {
  ideaId: number
  stepId: string
  updatedAt: string
  pexelsQuery?: string | null
  selectedSceneMediaUrls?: string[] | null
  sceneTextStyles?: unknown[] | null
  editedTopic?: string | null
  editedScript?: string | null
  editedCaption?: string | null
  editedKeyword?: string | null
}

export interface JourneyWorkspaceExtras {
  pexelsQuery?: string | null
  selectedSceneMediaUrls?: string[] | null
  sceneTextStyles?: unknown[] | null
  editedTopic?: string | null
  editedScript?: string | null
  editedCaption?: string | null
  editedKeyword?: string | null
}

type JourneyWorkspaceMap = Record<string, JourneyWorkspaceSnapshot>

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readWorkspaceMap(): JourneyWorkspaceMap {
  if (!isBrowser()) return {}

  try {
    const raw = window.localStorage.getItem(JOURNEY_WORKSPACE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as JourneyWorkspaceMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeWorkspaceMap(value: JourneyWorkspaceMap) {
  if (!isBrowser()) return
  window.localStorage.setItem(JOURNEY_WORKSPACE_STORAGE_KEY, JSON.stringify(value))
}

export function saveJourneyWorkspace(
  ideaId: number | string,
  stepId: string,
  extras: JourneyWorkspaceExtras = {},
) {
  const numericIdeaId = Number(ideaId)
  if (!numericIdeaId || !stepId) return

  const current = readWorkspaceMap()
  const trimmedQuery = typeof extras.pexelsQuery === 'string'
    ? extras.pexelsQuery.trim().slice(0, MAX_PEXELS_QUERY_LENGTH)
    : null
  const sceneUrls = Array.isArray(extras.selectedSceneMediaUrls)
    ? extras.selectedSceneMediaUrls.slice(0, 10).map((u) => String(u || ''))
    : null
  const sceneTextStyles = Array.isArray(extras.sceneTextStyles)
    ? extras.sceneTextStyles.slice(0, MAX_SCENE_STYLES_COUNT)
    : null
  current[String(numericIdeaId)] = {
    ideaId: numericIdeaId,
    stepId,
    updatedAt: new Date().toISOString(),
    pexelsQuery: trimmedQuery || null,
    selectedSceneMediaUrls: sceneUrls,
    sceneTextStyles,
    editedTopic: extras.editedTopic ?? null,
    editedScript: extras.editedScript ?? null,
    editedCaption: extras.editedCaption ?? null,
    editedKeyword: extras.editedKeyword ?? null,
  }
  writeWorkspaceMap(current)
}

export function readJourneyWorkspace(ideaId: number | string): JourneyWorkspaceSnapshot | null {
  const numericIdeaId = Number(ideaId)
  if (!numericIdeaId) return null

  const current = readWorkspaceMap()
  return current[String(numericIdeaId)] || null
}

export function clearJourneyWorkspace(ideaId: number | string) {
  const numericIdeaId = Number(ideaId)
  if (!numericIdeaId) return

  const current = readWorkspaceMap()
  delete current[String(numericIdeaId)]
  writeWorkspaceMap(current)
}
