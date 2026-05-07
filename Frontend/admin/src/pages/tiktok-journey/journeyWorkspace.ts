const JOURNEY_WORKSPACE_STORAGE_KEY = 'tiktok-journey-workspaces-v1'

export interface JourneyWorkspaceSnapshot {
  ideaId: number
  stepId: string
  updatedAt: string
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

export function saveJourneyWorkspace(ideaId: number | string, stepId: string) {
  const numericIdeaId = Number(ideaId)
  if (!numericIdeaId || !stepId) return

  const current = readWorkspaceMap()
  current[String(numericIdeaId)] = {
    ideaId: numericIdeaId,
    stepId,
    updatedAt: new Date().toISOString(),
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
