import { describe, expect, test } from 'vitest'

import {
  buildWorkflowStatusUpdate,
  computeJourneyReadiness,
  formatShortOpenId,
  getIdeaSceneTexts,
  getIdeaStatusLabel,
  hasScriptGenerationResult,
  isPublished,
  isRenderReady,
  isUploadCompleted,
  isWorkflowRunTerminal,
  joinScenes,
  mergeIdeasById,
  normalizeSceneCount,
  normalizeText,
  normalizeUrl,
  raceWorkflowRunAndDatabaseUpdate,
  splitScriptIntoScenes,
} from './journeyHelpers'

describe('splitScriptIntoScenes', () => {
  test('splits on sentence terminators', () => {
    expect(splitScriptIntoScenes('First. Second! Third? End.')).toEqual([
      'First.',
      'Second!',
      'Third?',
      'End.',
    ])
  })

  test('drops empty fragments and trims', () => {
    expect(splitScriptIntoScenes('  Hello.   World!  ')).toEqual(['Hello.', 'World!'])
  })

  test('handles unterminated single-sentence inputs', () => {
    expect(splitScriptIntoScenes('No terminator here')).toEqual(['No terminator here'])
  })

  test('returns empty array on empty / nullish input', () => {
    expect(splitScriptIntoScenes('')).toEqual([])
    expect(splitScriptIntoScenes(null as unknown as string)).toEqual([])
  })
})

describe('joinScenes', () => {
  test('appends a period to scenes that lack a terminator', () => {
    expect(joinScenes(['hello', 'world'])).toBe('hello. world.')
  })

  test('preserves existing terminators', () => {
    expect(joinScenes(['hello!', 'world?'])).toBe('hello! world?')
  })

  test('skips blank scenes', () => {
    expect(joinScenes(['hello', '', '  ', 'world'])).toBe('hello. world.')
  })

  test('returns empty string for empty arrays', () => {
    expect(joinScenes([])).toBe('')
  })
})

describe('normalizeSceneCount', () => {
  test('clamps the target count between 1 and 10', () => {
    expect(normalizeSceneCount(['a', 'b'], 0)).toHaveLength(1)
    expect(normalizeSceneCount(['a', 'b'], 50)).toHaveLength(10)
  })

  test('pads missing scenes with empty strings', () => {
    expect(normalizeSceneCount(['only one'], 3)).toEqual(['only one', '', ''])
  })

  test('merges trailing scenes when input exceeds count', () => {
    expect(normalizeSceneCount(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b c d'])
  })

  test('drops blank scenes before normalizing', () => {
    expect(normalizeSceneCount(['a', '   ', 'b'], 2)).toEqual(['a', 'b'])
  })
})

describe('getIdeaSceneTexts', () => {
  test('prefers planned scenes when present', () => {
    const idea = {
      plannedScenes: [{ sceneText: ' First scene ' }, { sceneText: 'Second scene' }],
    } as unknown as Parameters<typeof getIdeaSceneTexts>[0]
    expect(getIdeaSceneTexts(idea, 'fallback. ignored.')).toEqual(['First scene', 'Second scene'])
  })

  test('falls back to script splitting when no planned scenes', () => {
    expect(getIdeaSceneTexts(null, 'A. B. C.')).toEqual(['A.', 'B.', 'C.'])
  })

  test('ignores planned scenes with empty sceneText', () => {
    const idea = {
      plannedScenes: [{ sceneText: '   ' }, { sceneText: 'kept' }],
    } as unknown as Parameters<typeof getIdeaSceneTexts>[0]
    expect(getIdeaSceneTexts(idea, 'fallback.')).toEqual(['kept'])
  })
})

describe('mergeIdeasById', () => {
  test('overwrites existing entries by id and sorts descending', () => {
    const existing = [
      { id: 1, topic: 'old' },
      { id: 2, topic: 'kept' },
    ]
    const incoming = [
      { id: 1, topic: 'new' },
      { id: 3, topic: 'fresh' },
    ]
    expect(mergeIdeasById(existing, incoming)).toEqual([
      { id: 3, topic: 'fresh' },
      { id: 2, topic: 'kept' },
      { id: 1, topic: 'new' },
    ])
  })

  test('returns an empty list when both inputs are empty', () => {
    expect(mergeIdeasById([], [])).toEqual([])
  })
})

describe('normalizeText / normalizeUrl', () => {
  test('lowercases and trims text', () => {
    expect(normalizeText('  Hello WORLD  ')).toBe('hello world')
  })

  test('returns empty string for nullish text', () => {
    expect(normalizeText(null)).toBe('')
    expect(normalizeText(undefined)).toBe('')
  })

  test('returns trimmed url or null', () => {
    expect(normalizeUrl(' https://x ')).toBe('https://x')
    expect(normalizeUrl('   ')).toBeNull()
    expect(normalizeUrl(null)).toBeNull()
  })
})

describe('formatShortOpenId', () => {
  test('returns dash for empty input', () => {
    expect(formatShortOpenId('')).toBe('-')
    expect(formatShortOpenId(null)).toBe('-')
  })

  test('returns the value untouched if short enough', () => {
    expect(formatShortOpenId('abc1234567')).toBe('abc1234567')
  })

  test('shortens long ids preserving head and tail', () => {
    const shortened = formatShortOpenId('abcdefghijklmnopqrstuvwxyz')
    expect(shortened).toBe('abcdefgh...uvwxyz')
  })
})

describe('idea status helpers', () => {
  test('isRenderReady recognises shotstack url, finalVideoStatus and shotstackStatus', () => {
    expect(isRenderReady({ shotstackUrl: 'https://video' })).toBe(true)
    expect(isRenderReady({ finalVideoStatus: 'ready' })).toBe(true)
    expect(isRenderReady({ shotstackStatus: 'done' })).toBe(true)
    expect(isRenderReady({})).toBe(false)
  })

  test('hasScriptGenerationResult requires at least one populated field', () => {
    expect(hasScriptGenerationResult({ script: '   ' })).toBe(false)
    expect(hasScriptGenerationResult({ caption: 'Caption' })).toBe(true)
  })

  test('isPublished is case-insensitive on tiktokStatus', () => {
    expect(isPublished({ tiktokStatus: 'PUBLISHED' })).toBe(true)
    expect(isPublished({ tiktokStatus: 'draft' })).toBe(false)
  })

  test('isUploadCompleted accepts the upload/published lifecycle states', () => {
    expect(isUploadCompleted({ tiktokStatus: 'uploaded' })).toBe(true)
    expect(isUploadCompleted({ tiktokStatus: 'published' })).toBe(true)
    expect(isUploadCompleted({ tiktokStatus: 'rendering' })).toBe(false)
  })

  test('isWorkflowRunTerminal accepts SUCCEEDED / FAILED only', () => {
    expect(isWorkflowRunTerminal({ status: 'SUCCEEDED' })).toBe(true)
    expect(isWorkflowRunTerminal({ status: 'failed' })).toBe(true)
    expect(isWorkflowRunTerminal({ status: 'running' })).toBe(false)
    expect(isWorkflowRunTerminal(null)).toBe(false)
  })

  test('getIdeaStatusLabel surfaces the most advanced state', () => {
    expect(getIdeaStatusLabel({ tiktokStatus: 'published' })).toBe('publiee')
    expect(getIdeaStatusLabel({ tiktokStatus: 'uploaded' })).toBe('uploadee')
    expect(getIdeaStatusLabel({ uploadUrl: 'x' })).toBe('prete upload')
    expect(getIdeaStatusLabel({ shotstackUrl: 'x' })).toBe('rendue')
    expect(getIdeaStatusLabel({ shotstackStatus: 'rendering' })).toBe('rendering')
    expect(getIdeaStatusLabel({})).toBe('draft')
  })
})

describe('buildWorkflowStatusUpdate', () => {
  test('overlays the patch on top of the previous snapshot', () => {
    const result = buildWorkflowStatusUpdate(
      {
        runId: 1,
        workflowType: 'OLD',
        contentIdeaId: 100,
        state: 'idle',
        message: 'old',
        startedAt: '2024-01-01',
        completedAt: null,
        durationMs: null,
        lastUpdatedAt: '2024-01-01',
      },
      { state: 'running', message: 'now', lastUpdatedAt: '2024-01-02' },
    )
    expect(result.state).toBe('running')
    expect(result.message).toBe('now')
    expect(result.runId).toBe(1)
    expect(result.lastUpdatedAt).toBe('2024-01-02')
  })

  test('falls back to defaults when no current snapshot is provided', () => {
    const result = buildWorkflowStatusUpdate(null, { workflowType: 'X' })
    expect(result.workflowType).toBe('X')
    expect(result.state).toBe('idle')
    expect(typeof result.lastUpdatedAt).toBe('string')
  })
})

describe('computeJourneyReadiness', () => {
  test('isReady when idea and all media slots filled', () => {
    const result = computeJourneyReadiness({
      hasIdea: true,
      filledSceneSlots: 3,
      totalSceneSlots: 3,
      hasAudio: false,
      hasConnectedAccount: true,
    })
    expect(result.isReady).toBe(true)
    expect(result.canGenerateVideo).toBe(true)
    expect(result.blockingIssues).toHaveLength(0)
  })

  test('not ready when no idea', () => {
    const result = computeJourneyReadiness({
      hasIdea: false,
      filledSceneSlots: 3,
      totalSceneSlots: 3,
      hasAudio: false,
      hasConnectedAccount: false,
    })
    expect(result.isReady).toBe(false)
    expect(result.blockingIssues).toContain('Idée & script')
  })

  test('not ready when media slots incomplete', () => {
    const result = computeJourneyReadiness({
      hasIdea: true,
      filledSceneSlots: 2,
      totalSceneSlots: 4,
      hasAudio: false,
      hasConnectedAccount: true,
    })
    expect(result.isReady).toBe(false)
    expect(result.mediaStatus).toBe('warn')
    expect(result.blockingIssues).toContain('Médias')
    expect(result.canGenerateVideo).toBe(false)
  })

  test('not ready when no media at all', () => {
    const result = computeJourneyReadiness({
      hasIdea: true,
      filledSceneSlots: 0,
      totalSceneSlots: 3,
      hasAudio: false,
      hasConnectedAccount: true,
    })
    expect(result.mediaStatus).toBe('error')
    expect(result.canGenerateVideo).toBe(false)
  })

  test('audio and account are not blocking', () => {
    const result = computeJourneyReadiness({
      hasIdea: true,
      filledSceneSlots: 3,
      totalSceneSlots: 3,
      hasAudio: false,
      hasConnectedAccount: false,
    })
    expect(result.isReady).toBe(true)
    expect(result.blockingIssues).toHaveLength(0)
  })
})

describe('raceWorkflowRunAndDatabaseUpdate', () => {
  test('returns whichever side resolves first', async () => {
    const result = await raceWorkflowRunAndDatabaseUpdate({
      waitForWorkflowRun: async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        return { id: 'workflow' }
      },
      waitForDatabaseUpdate: async () => ({ uploadUrl: 'db-first' }),
    })
    expect(result).toEqual({ type: 'database', value: { uploadUrl: 'db-first' } })
  })

  test('returns the workflow result when it wins the race', async () => {
    const result = await raceWorkflowRunAndDatabaseUpdate({
      waitForWorkflowRun: async () => ({ id: 'workflow' }),
      waitForDatabaseUpdate: async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        return { uploadUrl: 'never' }
      },
    })
    expect(result).toEqual({ type: 'workflowRun', value: { id: 'workflow' } })
  })
})
