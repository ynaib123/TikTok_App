import {
  buildAdminSelectionModel,
  clearVisibleNumericSelection,
  normalizeNumericSelection,
  selectVisibleNumericIds,
  toggleNumericSelection,
} from './adminSelectionModel.js'

export function normalizeClientSelection(clientIds = []) {
  return normalizeNumericSelection(clientIds)
}

export function toggleClientSelection(selectedClientIds = [], clientId) {
  return toggleNumericSelection(selectedClientIds, clientId)
}

export function selectVisibleClients(selectedClientIds = [], clients = []) {
  return selectVisibleNumericIds(selectedClientIds, clients, (client) => client?.id)
}

export function clearVisibleClientSelection(selectedClientIds = [], clients = []) {
  return clearVisibleNumericSelection(selectedClientIds, clients, (client) => client?.id)
}

export function buildClientSelectionModel({
  activeClientId = null,
  selectedClientIds = [],
  visibleClients = [],
} = {}) {
  return buildAdminSelectionModel({
    activeId: activeClientId,
    selectedIds: selectedClientIds,
    visibleIds: visibleClients.map((client) => client?.id),
  })
}

export function summarizeSelectedClients(selectedClientIds = [], clients = [], onlineClientIdSet = new Set()) {
  const selectedIdSet = new Set(
    (Array.isArray(selectedClientIds) ? selectedClientIds : [])
      .map((id) => Number(id))
      .filter(Number.isFinite)
  )

  const selectedClients = (Array.isArray(clients) ? clients : []).filter((client) => selectedIdSet.has(Number(client?.id)))
  const activeCount = selectedClients.filter((client) => client?.compteActif !== false).length
  const onlineCount = selectedClients.filter((client) => onlineClientIdSet.has(Number(client?.id))).length

  return {
    selectedClients,
    totalCount: normalizeClientSelection(selectedClientIds).length,
    loadedCount: selectedClients.length,
    activeCount,
    inactiveCount: selectedClients.length - activeCount,
    onlineCount,
  }
}

export function resolveSelectedClientAccountStatusMode(summary = {}) {
  const totalCount = Number(summary?.totalCount || 0)
  const loadedCount = Number(summary?.loadedCount || 0)
  const activeCount = Number(summary?.activeCount || 0)
  const inactiveCount = Number(summary?.inactiveCount || 0)

  if (totalCount === 0) return 'none'
  if (loadedCount !== totalCount) return 'unknown'
  if (activeCount === totalCount) return 'all-active'
  if (inactiveCount === totalCount) return 'all-inactive'
  return 'mixed'
}

function escapeCsvValue(value) {
  const normalizedValue = String(value ?? '')
  if (!/[",;\n]/.test(normalizedValue)) return normalizedValue
  return `"${normalizedValue.replaceAll('"', '""')}"`
}

export function buildClientExportCsv(clients = [], onlineClientIdSet = new Set()) {
  const rows = [
    [
      'id',
      'nom_complet',
      'email',
      'telephone',
      'compte_actif',
      'en_ligne',
      'email_verifie',
      'commandes',
      'depense_totale',
      'panier_moyen',
    ].join(';'),
  ]

  ;(Array.isArray(clients) ? clients : []).forEach((client) => {
    rows.push([
      escapeCsvValue(client?.id),
      escapeCsvValue(client?.fullName),
      escapeCsvValue(client?.email),
      escapeCsvValue(client?.telephone),
      escapeCsvValue(client?.compteActif !== false ? 'oui' : 'non'),
      escapeCsvValue(onlineClientIdSet.has(Number(client?.id)) ? 'oui' : 'non'),
      escapeCsvValue(client?.emailVerifie ? 'oui' : 'non'),
      escapeCsvValue(client?.orderCount || 0),
      escapeCsvValue(client?.totalSpent || 0),
      escapeCsvValue(client?.averageBasket || 0),
    ].join(';'))
  })

  return rows.join('\n')
}
