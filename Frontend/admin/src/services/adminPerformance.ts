type PerfMetadata = Record<string, unknown>

interface PerfToken {
  id: number
  name: string
  startedAt: number
  metadata: PerfMetadata
}

interface PerfEntry {
  id: number
  name: string
  startedAt: number
  endedAt: number
  durationMs: number
  metadata: PerfMetadata
}

const PERF_ENTRIES_LIMIT = 200
const LOGIN_FLOW_SESSION_KEY = 'admin-login-flow-started-at'

let nextPerfId = 1
const activeTokens = new Map<number, PerfToken>()
const perfEntries: PerfEntry[] = []
const recordedRouteReadyNames = new Set<string>()

function isDev() {
  return Boolean(import.meta.env?.DEV)
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function logEntry(entry: PerfEntry) {
  if (!isDev()) return
  console.info(`[admin-perf] ${entry.name} ${entry.durationMs.toFixed(1)}ms`, entry.metadata)
}

function pushEntry(entry: PerfEntry) {
  perfEntries.push(entry)
  if (perfEntries.length > PERF_ENTRIES_LIMIT) {
    perfEntries.splice(0, perfEntries.length - PERF_ENTRIES_LIMIT)
  }
  logEntry(entry)
}

export function beginAdminPerf(name: string, metadata: PerfMetadata = {}): PerfToken {
  const token: PerfToken = {
    id: nextPerfId++,
    name,
    startedAt: now(),
    metadata,
  }
  activeTokens.set(token.id, token)
  return token
}

export function endAdminPerf(token: PerfToken | null | undefined, metadata: PerfMetadata = {}) {
  if (!token) return null
  const active = activeTokens.get(token.id)
  if (!active) return null
  activeTokens.delete(token.id)

  const endedAt = now()
  const entry: PerfEntry = {
    id: active.id,
    name: active.name,
    startedAt: active.startedAt,
    endedAt,
    durationMs: endedAt - active.startedAt,
    metadata: { ...active.metadata, ...metadata },
  }
  pushEntry(entry)
  return entry
}

export function recordAdminPerf(name: string, durationMs: number, metadata: PerfMetadata = {}) {
  const entry: PerfEntry = {
    id: nextPerfId++,
    name,
    startedAt: 0,
    endedAt: durationMs,
    durationMs,
    metadata,
  }
  pushEntry(entry)
  return entry
}

export function rememberAdminLoginFlowStart() {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(LOGIN_FLOW_SESSION_KEY, String(Date.now()))
}

export function consumeAdminLoginFlowStart() {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(LOGIN_FLOW_SESSION_KEY)
  window.sessionStorage.removeItem(LOGIN_FLOW_SESSION_KEY)
  const parsed = Number(raw || 0)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function markAdminRouteReady(routeName: string, metadata: PerfMetadata = {}) {
  if (recordedRouteReadyNames.has(routeName)) return null
  recordedRouteReadyNames.add(routeName)

  const loginStartedAt = consumeAdminLoginFlowStart()
  if (!loginStartedAt) return null

  return recordAdminPerf(`login-to-${routeName}-ready`, Date.now() - loginStartedAt, metadata)
}

export function resetAdminRouteReady(routeName?: string) {
  if (!routeName) {
    recordedRouteReadyNames.clear()
    return
  }
  recordedRouteReadyNames.delete(routeName)
}

export function getAdminPerfEntries() {
  return [...perfEntries]
}

export function clearAdminPerfEntries() {
  perfEntries.length = 0
  recordedRouteReadyNames.clear()
}

if (typeof window !== 'undefined') {
  const perfApi = {
    clear: clearAdminPerfEntries,
    entries: getAdminPerfEntries,
  }
  ;(window as typeof window & { __adminPerf?: typeof perfApi }).__adminPerf = perfApi
}
