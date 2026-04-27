export function areNumberListsEqual(left = [], right = []) {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

export function normalizeOnlineClientIds(response) {
  return Array.isArray(response?.onlineClientIds)
    ? response.onlineClientIds
      .filter((value) => value !== '' && value != null)
      .map(Number)
      .filter(Number.isFinite)
    : []
}

export function applyPresenceSnapshot(response, setOnlineClientIds, setPresenceSnapshotAt) {
  const nextOnlineClientIds = normalizeOnlineClientIds(response)

  setOnlineClientIds((prev) => (
    areNumberListsEqual(prev, nextOnlineClientIds) ? prev : nextOnlineClientIds
  ))
  setPresenceSnapshotAt((prev) => {
    const nextSnapshotAt = response?.capturedAt || null
    return prev === nextSnapshotAt ? prev : nextSnapshotAt
  })
}

export function parseSseEventChunk(rawChunk = '') {
  const normalizedChunk = String(rawChunk || '').replace(/\r/g, '')
  const lines = normalizedChunk.split('\n')
  const event = { type: 'message', data: '' }

  lines.forEach((line) => {
    if (!line || line.startsWith(':')) return

    if (line.startsWith('event:')) {
      event.type = line.slice(6).trim() || 'message'
      return
    }

    if (line.startsWith('data:')) {
      const payload = line.slice(5).trimStart()
      event.data = event.data ? `${event.data}\n${payload}` : payload
    }
  })

  return event
}
