import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { ErrorObject } from 'ajv'
import type { RenderVideoJob } from './renderJob.js'

export interface ContractValidationResult {
  ok: boolean
  errors: string[]
}

const require = createRequire(import.meta.url)
const Ajv2020 = require('ajv/dist/2020') as new (options: { allErrors: boolean; strict: boolean }) => {
  compile: (schema: object) => ((payload: unknown) => boolean) & { errors?: ErrorObject[] | null }
}
const addFormats = require('ajv-formats') as (ajv: unknown) => void
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)

function resolveSchemaPath() {
  return process.env.RENDER_VIDEO_SCHEMA_PATH
    || path.resolve(process.cwd(), '..', 'Backend', 'tools', 'contracts', 'render-video-job.schema.json')
}

const schemaPath = resolveSchemaPath()
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as object
const validateRenderJob = ajv.compile(schema)

export function validateContract(payload: unknown): ContractValidationResult {
  const ok = validateRenderJob(payload)
  if (ok) return { ok: true, errors: [] }

  const errors = (validateRenderJob.errors || []).map((error: ErrorObject) => {
    const pathLabel = error.instancePath || '/'
    return `${pathLabel} ${error.message || 'is invalid'}`
  })

  return { ok: false, errors }
}

export function asRenderVideoJob(payload: unknown): RenderVideoJob {
  return payload as RenderVideoJob
}
