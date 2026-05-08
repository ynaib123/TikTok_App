import { describe, expect, test } from 'vitest'

import {
  CAPTION_MAX_LENGTH,
  KEYWORD_MAX_LENGTH,
  SCRIPT_MAX_LENGTH,
  TOPIC_MAX_LENGTH,
  contentIdeaEditPatchSchema,
  flattenZodIssues,
  generationParamsSchema,
} from './journeySchemas'

describe('contentIdeaEditPatchSchema', () => {
  test('accepts an empty patch', () => {
    expect(contentIdeaEditPatchSchema.safeParse({}).success).toBe(true)
  })

  test('trims string fields', () => {
    const result = contentIdeaEditPatchSchema.parse({ topic: '  hello  ' })
    expect(result.topic).toBe('hello')
  })

  test('rejects oversized topic', () => {
    const result = contentIdeaEditPatchSchema.safeParse({
      topic: 'x'.repeat(TOPIC_MAX_LENGTH + 1),
    })
    expect(result.success).toBe(false)
  })

  test('rejects oversized script / caption / keyword', () => {
    expect(
      contentIdeaEditPatchSchema.safeParse({
        script: 'x'.repeat(SCRIPT_MAX_LENGTH + 1),
      }).success,
    ).toBe(false)
    expect(
      contentIdeaEditPatchSchema.safeParse({
        caption: 'x'.repeat(CAPTION_MAX_LENGTH + 1),
      }).success,
    ).toBe(false)
    expect(
      contentIdeaEditPatchSchema.safeParse({
        keyword: 'x'.repeat(KEYWORD_MAX_LENGTH + 1),
      }).success,
    ).toBe(false)
  })

  test('accepts plannedScenes null and arrays', () => {
    expect(
      contentIdeaEditPatchSchema.safeParse({ plannedScenes: null }).success,
    ).toBe(true)
    expect(
      contentIdeaEditPatchSchema.safeParse({
        plannedScenes: [{ sceneText: 'one' }, { sceneText: 'two' }],
      }).success,
    ).toBe(true)
  })

  test('rejects more than 10 planned scenes', () => {
    expect(
      contentIdeaEditPatchSchema.safeParse({
        plannedScenes: Array(11).fill({ sceneText: 'x' }),
      }).success,
    ).toBe(false)
  })

  test('rejects unknown keys (strict mode)', () => {
    const result = contentIdeaEditPatchSchema.safeParse({
      topic: 'ok',
      bogus: 'value',
    } as unknown as { topic: string })
    expect(result.success).toBe(false)
  })
})

describe('generationParamsSchema', () => {
  test('requires a non-empty category', () => {
    const result = generationParamsSchema.safeParse({
      category: '',
      language: 'fr',
      sceneCount: 1,
    })
    expect(result.success).toBe(false)
  })

  test('rejects sceneCount outside 1..10', () => {
    expect(
      generationParamsSchema.safeParse({
        category: 'lifestyle',
        language: 'fr',
        sceneCount: 0,
      }).success,
    ).toBe(false)
    expect(
      generationParamsSchema.safeParse({
        category: 'lifestyle',
        language: 'fr',
        sceneCount: 11,
      }).success,
    ).toBe(false)
  })

  test('accepts a minimal valid payload', () => {
    const result = generationParamsSchema.safeParse({
      category: 'lifestyle',
      language: 'fr',
      sceneCount: 3,
    })
    expect(result.success).toBe(true)
  })
})

describe('flattenZodIssues', () => {
  test('returns one entry per issue with field and message', () => {
    const result = generationParamsSchema.safeParse({
      category: '',
      language: 'f',
      sceneCount: 0,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const flattened = flattenZodIssues(result.error)
      expect(flattened.length).toBeGreaterThan(0)
      expect(flattened[0]).toHaveProperty('field')
      expect(flattened[0]).toHaveProperty('message')
    }
  })
})
