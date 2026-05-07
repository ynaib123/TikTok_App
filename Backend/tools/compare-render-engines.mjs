#!/usr/bin/env node
// Phase 7 - Compare Shotstack vs Remotion render outputs side-by-side.
//
// Usage:
//   node Backend/tools/compare-render-engines.mjs --idea <contentIdeaId>
//
// Required environment variables:
//   APP_VIDEO_OPS_BACKEND_BASE_URL  e.g. http://localhost:8080
//   APP_VIDEO_OPS_BACKEND_TOKEN     admin Bearer token (from /api/admin/login)
//   APP_VIDEO_OPS_N8N_BASE_URL      e.g. http://localhost:5678 (read-only display only)
//
// Optional:
//   APP_VIDEO_OPS_RENDER_TIMEOUT_MS (default 600000)
//
// Behavior:
//   1) For each engine, builds a render-template payload identical except for
//      templateId / qualityProfile and the n8n webhook path the backend uses.
//   2) Polls the resulting workflowRun until terminal, then reads the content
//      idea to capture shotstack_url, thumbnail_url, render_engine, etc.
//   3) Downloads HEAD info to compare file size + content type.
//   4) Prints a markdown comparison table to stdout (and JSON to stderr).
//
// IMPORTANT: this does NOT mutate engine selection in production. The caller
// must already have both n8n workflows imported. The script triggers the
// Remotion path by setting `templateId` + `qualityProfile`; the engine
// actually used depends on APP_VIDEO_OPS_N8N_RENDER_PATH on the backend.
// To compare both engines, run the script TWICE: once with the env pointing
// at the Shotstack workflow, once at the Remotion workflow.

import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

const args = parseArgs(process.argv.slice(2))
const contentIdeaId = Number(args.idea || args.contentIdeaId || 0)
if (!contentIdeaId) {
  console.error('Missing --idea <contentIdeaId>')
  process.exit(2)
}

const baseUrl = String(process.env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '')
const token = String(process.env.APP_VIDEO_OPS_BACKEND_TOKEN || '')
if (!baseUrl || !token) {
  console.error('Set APP_VIDEO_OPS_BACKEND_BASE_URL and APP_VIDEO_OPS_BACKEND_TOKEN.')
  process.exit(2)
}

const renderTimeoutMs = Number(process.env.APP_VIDEO_OPS_RENDER_TIMEOUT_MS || 600000)

function parseArgs(list) {
  const out = {}
  for (let i = 0; i < list.length; i++) {
    const arg = list[i]
    if (!arg.startsWith('--')) continue
    const key = arg.replace(/^--/, '')
    const next = list[i + 1]
    if (!next || next.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = next
      i++
    }
  }
  return out
}

function request(method, path, body) {
  const url = new URL(baseUrl + path)
  const client = url.protocol === 'https:' ? https : http
  const data = body == null ? null : JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => { raw += chunk })
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`${method} ${path} -> ${res.statusCode} ${raw}`))
            return
          }
          try { resolve(raw ? JSON.parse(raw) : null) } catch { resolve(raw) }
        })
      },
    )
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

function head(rawUrl) {
  const url = new URL(rawUrl)
  const client = url.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'HEAD',
      },
      (res) => {
        resolve({
          status: res.statusCode || 0,
          contentType: res.headers['content-type'] || null,
          contentLength: Number(res.headers['content-length'] || 0) || null,
        })
      },
    )
    req.on('error', reject)
    req.setTimeout(15000, () => req.destroy(new Error('HEAD timeout')))
    req.end()
  })
}

async function pollRun(runId) {
  const deadline = Date.now() + renderTimeoutMs
  while (Date.now() < deadline) {
    const run = await request('GET', `/api/video-ops/workflow-runs/${runId}`)
    const status = String(run?.status || '').toUpperCase()
    if (status === 'SUCCEEDED' || status === 'FAILED') return run
    await new Promise((resolve) => setTimeout(resolve, 4000))
  }
  throw new Error(`Run ${runId} did not finish in ${renderTimeoutMs}ms`)
}

async function snapshotIdea() {
  const ideas = await request('GET', `/api/video-ops/content-ideas/${contentIdeaId}/status`)
  return ideas
}

async function trigger(templateId, qualityProfile) {
  const start = Date.now()
  const triggerResponse = await request('POST', '/api/video-ops/workflows/render-template', {
    contentIdeaId,
    source: `compare-engines-${templateId}-${qualityProfile}`,
    templateId,
    qualityProfile,
    force: true,
  })
  const runId = triggerResponse?.runId
  if (!runId) throw new Error('Backend did not return a runId')
  const run = await pollRun(runId)
  const elapsedMs = Date.now() - start
  const idea = await snapshotIdea()
  const shotstackUrl = idea?.shotstackUrl || null
  const thumbnailUrl = idea?.thumbnailUrl || null
  const remoteHead = shotstackUrl ? await head(shotstackUrl).catch((err) => ({ error: err.message })) : null
  return {
    runId,
    runStatus: run?.status,
    durationMs: elapsedMs,
    shotstackUrl,
    thumbnailUrl,
    renderEngine: idea?.renderEngine || null,
    qualityProfile: idea?.qualityProfile || qualityProfile,
    templateId: idea?.templateId || templateId,
    remoteHead,
  }
}

async function main() {
  console.error(`comparing render outputs for contentIdea #${contentIdeaId}`)
  const remotion = await trigger('tiktok-pro-vertical', 'premium')
  const shotstack = await trigger('tiktok-pro-vertical-v1', 'standard')

  const summary = { contentIdeaId, remotion, shotstack }
  console.error(JSON.stringify(summary, null, 2))

  const rows = [
    ['runId', remotion.runId, shotstack.runId],
    ['runStatus', remotion.runStatus, shotstack.runStatus],
    ['durationMs', remotion.durationMs, shotstack.durationMs],
    ['renderEngine', remotion.renderEngine, shotstack.renderEngine],
    ['templateId', remotion.templateId, shotstack.templateId],
    ['qualityProfile', remotion.qualityProfile, shotstack.qualityProfile],
    ['shotstackUrl', remotion.shotstackUrl, shotstack.shotstackUrl],
    ['thumbnailUrl', remotion.thumbnailUrl, shotstack.thumbnailUrl],
    ['contentLength', remotion.remoteHead?.contentLength || '-', shotstack.remoteHead?.contentLength || '-'],
    ['contentType', remotion.remoteHead?.contentType || '-', shotstack.remoteHead?.contentType || '-'],
  ]
  console.log(`# Render Engines Comparison - contentIdea #${contentIdeaId}\n`)
  console.log('| Metric | Run A | Run B |')
  console.log('|---|---|---|')
  for (const [label, a, b] of rows) {
    console.log(`| ${label} | ${a} | ${b} |`)
  }
  console.log('\nRun A and Run B reflect whichever workflow is currently bound to APP_VIDEO_OPS_N8N_RENDER_PATH.')
  console.log('Run twice with different envs to capture true Shotstack vs Remotion side-by-side.')
}

main().catch((err) => {
  console.error('FAIL:', err.message)
  process.exit(1)
})
