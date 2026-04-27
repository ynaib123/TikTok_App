import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildClientSelectionModel,
  buildClientExportCsv,
  clearVisibleClientSelection,
  normalizeClientSelection,
  resolveSelectedClientAccountStatusMode,
  selectVisibleClients,
  summarizeSelectedClients,
  toggleClientSelection,
} from './clientSelectionState.js'

test('toggleClientSelection toggles ids on and off', () => {
  assert.deepEqual(toggleClientSelection([], 4), [4])
  assert.deepEqual(toggleClientSelection([4, 7], 4), [7])
})

test('selectVisibleClients merges visible ids without duplicates', () => {
  assert.deepEqual(selectVisibleClients([2], [{ id: 2 }, { id: 5 }]), [2, 5])
})

test('clearVisibleClientSelection removes only visible ids', () => {
  assert.deepEqual(clearVisibleClientSelection([2, 5, 9], [{ id: 5 }, { id: 9 }]), [2])
})

test('summarizeSelectedClients computes active and online totals', () => {
  const summary = summarizeSelectedClients(
    [2, 5],
    [
      { id: 2, compteActif: true },
      { id: 5, compteActif: false },
    ],
    new Set([2])
  )

  assert.equal(summary.totalCount, 2)
  assert.equal(summary.activeCount, 1)
  assert.equal(summary.onlineCount, 1)
})

test('buildClientExportCsv includes online state and headers', () => {
  const csv = buildClientExportCsv(
    [{ id: 3, fullName: 'Nora Ait', email: 'nora@example.com', compteActif: true, emailVerifie: true, orderCount: 2, totalSpent: 180, averageBasket: 90 }],
    new Set([3])
  )

  assert.match(csv, /nom_complet/)
  assert.match(csv, /Nora Ait/)
  assert.match(csv, /oui/)
})

test('normalizeClientSelection deduplicates and coerces ids', () => {
  assert.deepEqual(normalizeClientSelection(['4', 4, 7, 'nope']), [4, 7])
})

test('buildClientSelectionModel tracks visible selection totals', () => {
  const model = buildClientSelectionModel({
    activeClientId: 5,
    selectedClientIds: [2, 5, 9],
    visibleClients: [{ id: 5 }, { id: 9 }, { id: 12 }],
  })

  assert.equal(model.activeId, 5)
  assert.equal(model.selectedCount, 3)
  assert.equal(model.visibleSelectedCount, 2)
})

test('resolveSelectedClientAccountStatusMode distinguishes uniform and mixed selections', () => {
  assert.equal(resolveSelectedClientAccountStatusMode({ totalCount: 0, loadedCount: 0 }), 'none')
  assert.equal(resolveSelectedClientAccountStatusMode({ totalCount: 2, loadedCount: 2, activeCount: 2, inactiveCount: 0 }), 'all-active')
  assert.equal(resolveSelectedClientAccountStatusMode({ totalCount: 2, loadedCount: 2, activeCount: 0, inactiveCount: 2 }), 'all-inactive')
  assert.equal(resolveSelectedClientAccountStatusMode({ totalCount: 2, loadedCount: 2, activeCount: 1, inactiveCount: 1 }), 'mixed')
  assert.equal(resolveSelectedClientAccountStatusMode({ totalCount: 3, loadedCount: 2, activeCount: 2, inactiveCount: 0 }), 'unknown')
})
