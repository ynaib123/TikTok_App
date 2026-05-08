import { z } from 'zod'

/**
 * Zod schemas guarding the user-editable inputs of the TikTok journey.
 *
 * Each schema is intentionally lax (everything optional, max-length matching
 * the backend column width) because partial PATCHes are the rule — the user
 * may be editing a single field on its own. Validation runs at the boundary
 * between the React form state and the network call (`updateContentIdeaContent`)
 * so anything that flows out of the UI is shape-checked before it leaves.
 */

const trimmedString = (max: number) =>
  z
    .string()
    .max(max, { message: `Trop long (max ${max} caractères)` })
    .transform((value) => value.trim())

export const TOPIC_MAX_LENGTH = 500
export const SCRIPT_MAX_LENGTH = 4000
export const CAPTION_MAX_LENGTH = 2200
export const KEYWORD_MAX_LENGTH = 240

export const plannedSceneSchema = z
  .object({
    sceneText: z.string().max(SCRIPT_MAX_LENGTH).optional(),
    visualKeyword: z.string().max(KEYWORD_MAX_LENGTH).nullable().optional(),
    cameraMood: z.string().max(120).nullable().optional(),
    overlayPriority: z.string().max(60).nullable().optional(),
  })
  .passthrough()

export const contentIdeaEditPatchSchema = z
  .object({
    topic: trimmedString(TOPIC_MAX_LENGTH).optional(),
    script: trimmedString(SCRIPT_MAX_LENGTH).optional(),
    caption: trimmedString(CAPTION_MAX_LENGTH).optional(),
    keyword: trimmedString(KEYWORD_MAX_LENGTH).optional(),
    plannedScenes: z.array(plannedSceneSchema).max(10).nullable().optional(),
  })
  .strict()

export type ContentIdeaEditPatchInput = z.input<typeof contentIdeaEditPatchSchema>
export type ContentIdeaEditPatchValidated = z.infer<typeof contentIdeaEditPatchSchema>

export const generationParamsSchema = z.object({
  category: z.string().min(1, { message: 'Catégorie requise' }).max(80),
  language: z.string().min(2).max(8),
  topic: z.string().max(TOPIC_MAX_LENGTH).optional().nullable(),
  inspirationRef: z.string().max(1000).optional().nullable(),
  sceneCount: z.number().int().min(1).max(10),
  durationTarget: z.string().max(40).optional().nullable(),
})

export type GenerationParamsInput = z.input<typeof generationParamsSchema>
export type GenerationParamsValidated = z.infer<typeof generationParamsSchema>

export interface ValidationError {
  field: string
  message: string
}

export function flattenZodIssues(error: z.ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }))
}
