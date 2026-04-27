function toFiniteNumericId(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

export function normalizeNumericSelection(selection = []) {
  return Array.from(new Set(
    (Array.isArray(selection) ? selection : [])
      .map(toFiniteNumericId)
      .filter((value) => value != null)
  ))
}

export function getVisibleNumericIds(items = [], getId = (item) => item?.id) {
  return normalizeNumericSelection(
    (Array.isArray(items) ? items : []).map((item) => getId(item))
  )
}

export function toggleNumericSelection(selection = [], value) {
  const normalizedValue = toFiniteNumericId(value)
  if (normalizedValue == null) return normalizeNumericSelection(selection)

  return selection.includes(normalizedValue)
    ? selection.filter((item) => Number(item) !== normalizedValue)
    : normalizeNumericSelection([...selection, normalizedValue])
}

export function selectVisibleNumericIds(selection = [], items = [], getId = (item) => item?.id) {
  return normalizeNumericSelection([
    ...selection,
    ...getVisibleNumericIds(items, getId),
  ])
}

export function clearVisibleNumericSelection(selection = [], items = [], getId = (item) => item?.id) {
  const visibleIdSet = new Set(getVisibleNumericIds(items, getId))

  return normalizeNumericSelection(selection).filter((item) => !visibleIdSet.has(Number(item)))
}

export function buildAdminSelectionModel({
  activeId = null,
  selectedIds = [],
  visibleIds = [],
} = {}) {
  const normalizedSelectedIds = normalizeNumericSelection(selectedIds)
  const normalizedVisibleIds = normalizeNumericSelection(visibleIds)
  const activeNumericId = toFiniteNumericId(activeId)
  const visibleIdSet = new Set(normalizedVisibleIds)

  return {
    activeId: activeNumericId,
    hasActiveItem: activeNumericId != null,
    hasSelection: normalizedSelectedIds.length > 0,
    selectedCount: normalizedSelectedIds.length,
    selectedIds: normalizedSelectedIds,
    visibleIds: normalizedVisibleIds,
    visibleSelectedCount: normalizedSelectedIds.filter((item) => visibleIdSet.has(Number(item))).length,
  }
}
