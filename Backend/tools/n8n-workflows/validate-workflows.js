#!/usr/bin/env node
/**
 * CI validation for n8n workflow JSON files.
 * Fails with exit code 1 if any issue is found.
 *
 * Checks:
 * - Valid JSON
 * - Workflow has required fields (name, nodes)
 * - No Code node exceeds MAX_CODE_LINES lines
 * - workflowVersion field is present
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MAX_CODE_LINES = 80
const WORKFLOW_DIR = __dirname

const errors = []
let totalWorkflows = 0
let totalCodeNodes = 0

function checkFile(filePath) {
  const filename = filePath.split('/').pop()
  if (filename.startsWith('_') || !filename.endsWith('.json') || filename.startsWith('validate')) return

  let raw
  try {
    raw = readFileSync(filePath, 'utf-8')
  } catch (e) {
    errors.push(`${filename}: Cannot read file — ${e.message}`)
    return
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    errors.push(`${filename}: Invalid JSON — ${e.message}`)
    return
  }

  // n8n exports as array of workflow objects
  const workflows = Array.isArray(parsed) ? parsed : [parsed]

  for (const wf of workflows) {
    totalWorkflows++
    const name = wf.name || '(unnamed)'

    if (!wf.name) {
      errors.push(`${filename}[${name}]: Missing required field 'name'`)
    }

    const nodes = wf.nodes || []
    if (!Array.isArray(nodes) || nodes.length === 0) {
      errors.push(`${filename}[${name}]: 'nodes' is missing or empty`)
    }

    if (!wf.workflowVersion && !wf.meta?.instanceId) {
      // workflowVersion is a custom field we add; warn but don't fail
      console.warn(`  WARN ${filename}[${name}]: 'workflowVersion' not set`)
    }

    for (const node of nodes) {
      if (node.type !== 'n8n-nodes-base.code') continue
      totalCodeNodes++

      const code = node.parameters?.jsCode || ''
      const lines = code.split('\n').length
      const nodeName = node.name || node.id || '?'

      if (lines > MAX_CODE_LINES) {
        errors.push(
          `${filename}[${name}] Code node "${nodeName}": ${lines} lines > ${MAX_CODE_LINES} max. ` +
          `Move business logic to backend service.`
        )
      }
    }
  }
}

const files = readdirSync(WORKFLOW_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => join(WORKFLOW_DIR, f))

for (const f of files) checkFile(f)

console.log(`\nn8n workflow validation: ${totalWorkflows} workflow(s), ${totalCodeNodes} Code node(s) checked.`)

if (errors.length > 0) {
  console.error(`\nFAILED — ${errors.length} error(s):`)
  errors.forEach(e => console.error(`  ✕ ${e}`))
  process.exit(1)
} else {
  console.log('All workflows OK.')
}
