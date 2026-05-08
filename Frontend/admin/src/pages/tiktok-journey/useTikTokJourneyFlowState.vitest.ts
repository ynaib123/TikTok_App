import { describe, expect, test } from 'vitest'

import {
  INITIAL_JOURNEY_FLOW_STATE,
  journeyFlowReducer,
  type JourneyFlowAction,
  type JourneyFlowState,
} from './useTikTokJourneyFlowState'

function reduce(state: JourneyFlowState, action: JourneyFlowAction) {
  return journeyFlowReducer(state, action)
}

const fakeIdea = (id: number) => ({ id, topic: `topic-${id}`, category: 'Food' } as unknown as JourneyFlowState['generatedIdeas'][number])

describe('journeyFlowReducer — lifecycle', () => {
  test('PIPELINE_RESET clears every transient field but keeps the step index', () => {
    const dirty: JourneyFlowState = {
      ...INITIAL_JOURNEY_FLOW_STATE,
      generatedIdeas: [fakeIdea(1)],
      selectedGeneratedIdeaId: 1,
      scriptedIdea: fakeIdea(1),
      manualAction: { shotstackUrl: 'x' },
      uploadResult: { ok: true } as unknown as JourneyFlowState['uploadResult'],
      pexelsCache: { query: 'k', videos: [] },
      errorMessage: 'boom',
      successMessage: 'ok',
      isGenerationInProgress: true,
      isWorkflowInProgress: true,
    }
    const next = reduce(dirty, { type: 'PIPELINE_RESET', stepIndex: 2 })
    expect(next.generatedIdeas).toHaveLength(0)
    expect(next.scriptedIdea).toBeNull()
    expect(next.manualAction).toBeNull()
    expect(next.errorMessage).toBeNull()
    expect(next.successMessage).toBeNull()
    expect(next.isGenerationInProgress).toBe(false)
    expect(next.currentStepIndex).toBe(2)
  })

  test('WORKSPACE_RESET clears workspace state without touching messages', () => {
    const state: JourneyFlowState = {
      ...INITIAL_JOURNEY_FLOW_STATE,
      generatedIdeas: [fakeIdea(1)],
      manualAction: { shotstackUrl: 'x' },
      uploadResult: { ok: true } as unknown as JourneyFlowState['uploadResult'],
      successMessage: 'kept',
      errorMessage: 'kept',
    }
    const next = reduce(state, { type: 'WORKSPACE_RESET' })
    expect(next.generatedIdeas).toHaveLength(0)
    expect(next.manualAction).toBeNull()
    expect(next.uploadResult).toBeNull()
    expect(next.successMessage).toBe('kept')
    expect(next.errorMessage).toBe('kept')
  })
})

describe('journeyFlowReducer — generation', () => {
  test('IDEAS_GENERATED stores the list and selects the first idea', () => {
    const next = reduce(INITIAL_JOURNEY_FLOW_STATE, {
      type: 'IDEAS_GENERATED',
      ideas: [fakeIdea(7), fakeIdea(8)],
    })
    expect(next.generatedIdeas).toHaveLength(2)
    expect(next.selectedGeneratedIdeaId).toBe(7)
    expect(next.isGenerationInProgress).toBe(false)
    expect(next.errorMessage).toBeNull()
  })

  test('IDEAS_GENERATED keeps a previously selected idea when the new list is empty', () => {
    const previous: JourneyFlowState = { ...INITIAL_JOURNEY_FLOW_STATE, selectedGeneratedIdeaId: 42 }
    const next = reduce(previous, { type: 'IDEAS_GENERATED', ideas: [] })
    expect(next.selectedGeneratedIdeaId).toBe(42)
  })

  test('GENERATION_STARTED clears prior result and flips the in-progress flag', () => {
    const previous: JourneyFlowState = {
      ...INITIAL_JOURNEY_FLOW_STATE,
      generatedIdeas: [fakeIdea(1)],
      scriptedIdea: fakeIdea(1),
      successMessage: 'old',
      errorMessage: 'old',
    }
    const next = reduce(previous, { type: 'GENERATION_STARTED', baselineId: 5, expectedCount: 3 })
    expect(next.generatedIdeas).toHaveLength(0)
    expect(next.scriptedIdea).toBeNull()
    expect(next.isGenerationInProgress).toBe(true)
    expect(next.lastGenerationBaselineId).toBe(5)
    expect(next.lastGenerationExpectedCount).toBe(3)
    expect(next.successMessage).toBeNull()
    expect(next.errorMessage).toBeNull()
  })

  test('GENERATION_FAILED surfaces the error and flips the flag back', () => {
    const previous: JourneyFlowState = { ...INITIAL_JOURNEY_FLOW_STATE, isGenerationInProgress: true, successMessage: 'previous' }
    const next = reduce(previous, { type: 'GENERATION_FAILED', errorMessage: 'oops' })
    expect(next.isGenerationInProgress).toBe(false)
    expect(next.errorMessage).toBe('oops')
    expect(next.successMessage).toBeNull()
  })
})

describe('journeyFlowReducer — workflow', () => {
  test('WORKFLOW_STARTED toggles the in-flight flag and stores the type', () => {
    const next = reduce(INITIAL_JOURNEY_FLOW_STATE, { type: 'WORKFLOW_STARTED', workflowType: 'RENDER' })
    expect(next.isWorkflowInProgress).toBe(true)
    expect(next.activeWorkflowType).toBe('RENDER')
    expect(next.errorMessage).toBeNull()
  })

  test('WORKFLOW_COMPLETED stores the success message and clears flag', () => {
    const previous: JourneyFlowState = { ...INITIAL_JOURNEY_FLOW_STATE, isWorkflowInProgress: true }
    const next = reduce(previous, { type: 'WORKFLOW_COMPLETED', message: 'done' })
    expect(next.isWorkflowInProgress).toBe(false)
    expect(next.successMessage).toBe('done')
    expect(next.errorMessage).toBeNull()
  })

  test('WORKFLOW_FAILED stores the error and clears the flag', () => {
    const previous: JourneyFlowState = { ...INITIAL_JOURNEY_FLOW_STATE, isWorkflowInProgress: true, successMessage: 'old' }
    const next = reduce(previous, { type: 'WORKFLOW_FAILED', errorMessage: 'broken' })
    expect(next.isWorkflowInProgress).toBe(false)
    expect(next.errorMessage).toBe('broken')
    expect(next.successMessage).toBeNull()
  })
})

describe('journeyFlowReducer — value setters', () => {
  test('STEP_CHANGED updates the index immutably', () => {
    const next = reduce(INITIAL_JOURNEY_FLOW_STATE, { type: 'STEP_CHANGED', stepIndex: 4 })
    expect(next.currentStepIndex).toBe(4)
    expect(INITIAL_JOURNEY_FLOW_STATE.currentStepIndex).toBe(-1)
  })

  test('PEXELS_CACHE_SET stores and clears the cache', () => {
    const cache = { query: 'food', videos: [] }
    const next = reduce(INITIAL_JOURNEY_FLOW_STATE, { type: 'PEXELS_CACHE_SET', value: cache })
    expect(next.pexelsCache).toEqual(cache)

    const cleared = reduce(next, { type: 'PEXELS_CACHE_SET', value: null })
    expect(cleared.pexelsCache).toBeNull()
  })

  test('SCRIPTED_IDEA_SET / MANUAL_ACTION_SET / UPLOAD_RESULT_SET are pure assigns', () => {
    const idea = fakeIdea(99)
    let s = reduce(INITIAL_JOURNEY_FLOW_STATE, { type: 'SCRIPTED_IDEA_SET', value: idea })
    expect(s.scriptedIdea).toBe(idea)
    s = reduce(s, { type: 'MANUAL_ACTION_SET', value: { shotstackUrl: 'x' } })
    expect(s.manualAction).toEqual({ shotstackUrl: 'x' })
    s = reduce(s, { type: 'UPLOAD_RESULT_SET', value: { ok: true } as unknown as JourneyFlowState['uploadResult'] })
    expect(s.uploadResult).toEqual({ ok: true })
  })

  test('ERROR_MESSAGE_SET / SUCCESS_MESSAGE_SET are independent', () => {
    const s = reduce(INITIAL_JOURNEY_FLOW_STATE, { type: 'ERROR_MESSAGE_SET', value: 'e' })
    expect(s.errorMessage).toBe('e')
    expect(s.successMessage).toBeNull()
    const s2 = reduce(s, { type: 'SUCCESS_MESSAGE_SET', value: 's' })
    expect(s2.successMessage).toBe('s')
    expect(s2.errorMessage).toBe('e') // not cleared
  })
})

describe('journeyFlowReducer — invariants', () => {
  test('returns the same reference for an unknown action', () => {
    const next = reduce(INITIAL_JOURNEY_FLOW_STATE, { type: 'UNKNOWN_ACTION' as unknown as JourneyFlowAction['type'] } as unknown as JourneyFlowAction)
    expect(next).toBe(INITIAL_JOURNEY_FLOW_STATE)
  })

  test('never mutates the input state', () => {
    const original = { ...INITIAL_JOURNEY_FLOW_STATE }
    const frozen = JSON.parse(JSON.stringify(original))
    reduce(original, { type: 'STEP_CHANGED', stepIndex: 5 })
    reduce(original, { type: 'IDEAS_GENERATED', ideas: [fakeIdea(1)] })
    reduce(original, { type: 'WORKFLOW_STARTED', workflowType: 'X' })
    expect(original).toEqual(frozen)
  })
})
