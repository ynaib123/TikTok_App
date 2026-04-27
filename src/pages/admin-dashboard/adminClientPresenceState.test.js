import test from 'node:test'
import assert from 'node:assert/strict'
import {
  areNumberListsEqual,
  normalizeOnlineClientIds,
  parseSseEventChunk,
} from './adminClientPresenceState.js'

test('normalizeOnlineClientIds coerces ids and filters invalid values', () => {
  assert.deepEqual(
    normalizeOnlineClientIds({ onlineClientIds: ['4', 7, 'oops', null] }),
    [4, 7]
  )
})

test('areNumberListsEqual compares normalized presence snapshots by order and value', () => {
  assert.equal(areNumberListsEqual([4, 7], [4, 7]), true)
  assert.equal(areNumberListsEqual([4, 7], [7, 4]), false)
})

test('parseSseEventChunk keeps the presence event contract stable', () => {
  assert.deepEqual(
    parseSseEventChunk('event: presence-snapshot\ndata: {"onlineClientIds":[4]}\n'),
    {
      type: 'presence-snapshot',
      data: '{"onlineClientIds":[4]}',
    }
  )
})
