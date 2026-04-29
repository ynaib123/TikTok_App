import test from 'node:test'
import assert from 'node:assert/strict'

import { raceWorkflowRunAndDatabaseUpdate } from './journeyHelpers.js'

test('raceWorkflowRunAndDatabaseUpdate prefers the database update when it completes before the callback', async () => {
  const result = await raceWorkflowRunAndDatabaseUpdate({
    waitForWorkflowRun: async () => {
      await new Promise((resolve) => setTimeout(resolve, 40))
      return { id: 91, status: 'SUCCEEDED' }
    },
    waitForDatabaseUpdate: async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      return { uploadUrl: 'https://open-upload.tiktokapis.com/demo' }
    },
  })

  assert.deepEqual(result, {
    type: 'database',
    value: { uploadUrl: 'https://open-upload.tiktokapis.com/demo' },
  })
})
