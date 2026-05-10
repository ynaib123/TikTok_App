import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import express from 'express'
import { asRenderVideoJob, validateContract } from './contracts.js'
import type { RenderVideoJob, RenderVideoScene } from './renderJob.js'
import { postProcess } from './postProcess.js'
import { isR2Enabled } from './r2Storage.js'
import { listTemplates, resolveCompositionId } from './remotion/templateRegistry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = Number(process.env.PORT || 8090)
const outputDir = path.resolve(process.env.RENDER_VIDEO_OUTPUT_DIR || path.join(process.cwd(), 'renders'))
const publicBaseUrl = (process.env.RENDER_VIDEO_PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '')
const localBaseUrl = `http://127.0.0.1:${port}`
const backendBaseUrl = (process.env.APP_VIDEO_OPS_BACKEND_BASE_URL || '').replace(/\/+$/, '')
const backendInternalSecret = process.env.APP_VIDEO_OPS_INTERNAL_API_SECRET || ''
const workflowCallbackSecret = process.env.APP_VIDEO_OPS_WORKFLOW_CALLBACK_SECRET || ''

fs.mkdirSync(outputDir, { recursive: true })

let bundleLocationPromise: Promise<string> | null = null

function resolveRemotionEntry() {
  if (process.env.REMOTION_ENTRY) return path.resolve(process.env.REMOTION_ENTRY)

  const distEntry = path.resolve(__dirname, 'remotion', 'index.js')
  if (fs.existsSync(distEntry)) return distEntry

  return path.resolve(process.cwd(), 'src', 'remotion', 'index.ts')
}

function getBundleLocation() {
  if (!bundleLocationPromise) {
    bundleLocationPromise = bundle({
      entryPoint: resolveRemotionEntry(),
      webpackOverride: (config) => config,
    })
  }
  return bundleLocationPromise
}

function createRenderId(contentIdeaId: number, workflowRunId: number) {
  const hash = crypto.randomBytes(5).toString('hex')
  return `remotion-${contentIdeaId}-${workflowRunId}-${Date.now()}-${hash}`
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

async function downloadRemoteAsset(url: string, outputPath: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 RenderVideo/0.1',
      'Accept': 'video/mp4,video/*;q=0.9,audio/*;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download render asset (${response.status})`)
  }

  await pipeline(
    Readable.fromWeb(response.body as any),
    fs.createWriteStream(outputPath),
  )

  const stats = fs.statSync(outputPath)
  if (stats.size === 0) {
    throw new Error('Downloaded render asset is empty')
  }
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(values.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, values.length)) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(values[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

async function prepareLocalAssets(job: RenderVideoJob, renderId: string): Promise<RenderVideoJob> {
  const assetsDir = path.join(outputDir, 'assets')
  fs.mkdirSync(assetsDir, { recursive: true })

  const runId = Number(job.workflowRunId) || 0

  // Cache deduplication: une URL distante ne se télécharge qu'une fois même
  // si plusieurs scènes la réutilisent (cas Pexels qui se répète).
  const downloadCache = new Map<string, Promise<string>>()
  const downloadOnce = async (url: string, suffix: string): Promise<string> => {
    if (!isRemoteUrl(url)) return url
    const cached = downloadCache.get(url)
    if (cached) return cached
    const fileName = `${renderId}-${suffix}.mp4`
    const filePath = path.join(assetsDir, fileName)
    const downloadPromise = (async () => {
      await downloadRemoteAsset(url, filePath)
      return `${localBaseUrl}/renders/assets/${fileName}`
    })()
    downloadCache.set(url, downloadPromise)
    return downloadPromise
  }

  const scenes: RenderVideoScene[] = Array.isArray(job.assets.scenes) ? job.assets.scenes : []
  const totalAssets = scenes.length + (isRemoteUrl(job.assets.backgroundVideo.url) ? 1 : 0)
  let downloaded = 0
  const updateDownloadProgress = () => {
    if (runId <= 0 || totalAssets <= 0) return
    // Phase préparation = 0..0.10 du total. Reste pour render + post-process + upload.
    const fraction = Math.min(1, downloaded / totalAssets)
    setProgress(runId, { progress: Math.max(0, Math.min(0.10, fraction * 0.10)), status: 'preparing' })
  }
  updateDownloadProgress()

  const backgroundUrl = job.assets.backgroundVideo.url
  let nextBackgroundUrl = backgroundUrl
  if (isRemoteUrl(backgroundUrl)) {
    nextBackgroundUrl = await downloadOnce(backgroundUrl, 'background')
    downloaded += 1
    updateDownloadProgress()
  }

  let nextScenes: RenderVideoScene[] | undefined
  if (scenes.length > 0) {
    nextScenes = await mapWithConcurrency(scenes, 3, async (scene) => {
      const sceneUrl = scene.media?.url
      if (!sceneUrl) {
        return scene
      }
      const localUrl = await downloadOnce(sceneUrl, `scene-${scene.index}`)
      if (isRemoteUrl(sceneUrl)) {
        downloaded += 1
        updateDownloadProgress()
      }
      return {
        ...scene,
        media: { ...scene.media, url: localUrl },
      }
    })
  }

  return {
    ...job,
    assets: {
      ...job.assets,
      backgroundVideo: {
        ...job.assets.backgroundVideo,
        url: nextBackgroundUrl,
      },
      ...(nextScenes ? { scenes: nextScenes } : {}),
    },
  }
}

app.use(express.json({ limit: '4mb' }))
app.use('/renders', express.static(outputDir))

// --- Suivi de progression et queue de rendu ---
// La progression est persistée dans outputDir/progress/ (survit aux redémarrages).
// La concurrence est limitée à MAX_CONCURRENT_RENDERS rendus simultanés.

type ProgressStatus = 'queued' | 'preparing' | 'rendering' | 'post-processing' | 'uploading' | 'done' | 'error' | 'cancelled'
interface ProgressEntry {
  progress: number // 0..1
  status: ProgressStatus
  startedAt: number
  updatedAt: number
  queuePosition?: number // position dans la file (1 = prochain, absent = en cours)
  outputUrl?: string
  error?: string
}
const progressByRunId = new Map<number, ProgressEntry>()
const PROGRESS_TTL_MS = 10 * 60 * 1000 // 10 min après fin → purge

// Concurrence : nombre max de rendus en parallèle. Au-delà → file FIFO.
const MAX_CONCURRENT_RENDERS = Math.max(1, parseInt(process.env.MAX_CONCURRENT_RENDERS || '2', 10))
let activeRenderCount = 0
interface QueuedRender { runId: number; execute: () => void }
const renderQueue: QueuedRender[] = []
const cancelledRunIds = new Set<number>()

function acquireRenderSlot(runId: number): Promise<boolean> {
  if (activeRenderCount < MAX_CONCURRENT_RENDERS) {
    activeRenderCount++
    return Promise.resolve(true)
  }
  return new Promise((resolve) => {
    renderQueue.push({ runId, execute: () => { activeRenderCount++; resolve(true) } })
    refreshQueuePositions()
  })
}

function releaseRenderSlot() {
  const next = renderQueue.shift()
  if (next) {
    refreshQueuePositions()
    next.execute()
  } else {
    activeRenderCount = Math.max(0, activeRenderCount - 1)
  }
}

function refreshQueuePositions() {
  renderQueue.forEach((item, index) => {
    const entry = progressByRunId.get(item.runId)
    if (entry) {
      const updated = { ...entry, queuePosition: index + 1 }
      progressByRunId.set(item.runId, updated)
      persistProgress(item.runId, updated)
    }
  })
}

// --- Persistance fichier (survit aux redémarrages) ---
const progressDir = path.join(outputDir, 'progress')
fs.mkdirSync(progressDir, { recursive: true })

function persistProgress(runId: number, entry: ProgressEntry) {
  const filePath = path.join(progressDir, `${runId}.json`)
  fs.writeFile(filePath, JSON.stringify(entry), () => {})
}

function loadPersistedProgress() {
  try {
    const files = fs.readdirSync(progressDir)
    const now = Date.now()
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const runId = parseInt(file.replace('.json', ''), 10)
      if (!Number.isFinite(runId) || runId <= 0) continue
      try {
        const content = fs.readFileSync(path.join(progressDir, file), 'utf-8')
        const entry = JSON.parse(content) as ProgressEntry
        const finished = entry.status === 'done' || entry.status === 'error' || entry.status === 'cancelled'
        if (finished && now - entry.updatedAt > PROGRESS_TTL_MS) continue
        // Un rendu interrompu par un crash devient error
        if (!finished) {
          entry.status = 'error'
          entry.error = 'Service redémarré pendant le rendu'
          entry.updatedAt = now
          persistProgress(runId, entry)
        }
        progressByRunId.set(runId, entry)
      } catch { /* fichier corrompu, ignoré */ }
    }
  } catch { /* répertoire inaccessible */ }
}
loadPersistedProgress()

function setProgress(runId: number, patch: Partial<ProgressEntry> & { status?: ProgressStatus }) {
  if (!Number.isFinite(runId) || runId <= 0) return
  const existing = progressByRunId.get(runId)
  const now = Date.now()
  const next: ProgressEntry = {
    progress: existing?.progress ?? 0,
    status: existing?.status ?? 'queued',
    startedAt: existing?.startedAt ?? now,
    updatedAt: now,
    outputUrl: existing?.outputUrl,
    error: existing?.error,
    ...patch,
  }
  // Effacer la position de queue quand le job démarre réellement
  if (patch.status && patch.status !== 'queued') {
    delete next.queuePosition
  }
  progressByRunId.set(runId, next)
  persistProgress(runId, next)
}

setInterval(() => {
  const now = Date.now()
  for (const [runId, entry] of progressByRunId.entries()) {
    const finished = entry.status === 'done' || entry.status === 'error' || entry.status === 'cancelled'
    if (finished && now - entry.updatedAt > PROGRESS_TTL_MS) {
      progressByRunId.delete(runId)
      fs.unlink(path.join(progressDir, `${runId}.json`), () => {})
    }
  }
}, 60 * 1000).unref()

app.get('/progress/:runId', (request, response) => {
  const runId = Number(request.params.runId)
  const entry = progressByRunId.get(runId)
  if (!entry) {
    response.json({ ok: true, runId, progress: 0, status: 'unknown', updatedAt: null, outputUrl: null, queuePosition: null })
    return
  }
  response.json({
    ok: true,
    runId,
    progress: Math.max(0, Math.min(1, entry.progress)),
    status: entry.status,
    startedAt: entry.startedAt,
    updatedAt: entry.updatedAt,
    queuePosition: entry.queuePosition ?? null,
    outputUrl: entry.outputUrl ?? null,
    error: entry.error ?? null,
  })
})

app.get('/queue', (_request, response) => {
  response.json({
    ok: true,
    activeRenders: activeRenderCount,
    maxConcurrent: MAX_CONCURRENT_RENDERS,
    queueLength: renderQueue.length,
    pending: renderQueue.map((item, index) => ({ runId: item.runId, queuePosition: index + 1 })),
  })
})

app.delete('/renders/:runId/cancel', (request, response) => {
  const runId = Number(request.params.runId)
  if (!Number.isFinite(runId) || runId <= 0) {
    response.status(400).json({ ok: false, error: 'INVALID_RUN_ID' })
    return
  }
  cancelledRunIds.add(runId)
  // Retirer de la file si encore en attente
  const queueIndex = renderQueue.findIndex((item) => item.runId === runId)
  if (queueIndex >= 0) {
    renderQueue.splice(queueIndex, 1)
    refreshQueuePositions()
    setProgress(runId, { status: 'cancelled', progress: 0, error: 'Annulé par l\'utilisateur' })
    response.json({ ok: true, cancelled: true, wasQueued: true })
    return
  }
  // Si déjà en cours, marquer comme cancelled ; le render loop vérifiera
  const entry = progressByRunId.get(runId)
  if (entry && (entry.status === 'preparing' || entry.status === 'rendering' || entry.status === 'post-processing' || entry.status === 'uploading')) {
    setProgress(runId, { status: 'cancelled', error: 'Annulé par l\'utilisateur' })
    response.json({ ok: true, cancelled: true, wasQueued: false, note: 'Le rendu en cours sera interrompu au prochain point de contrôle.' })
    return
  }
  response.status(404).json({ ok: false, error: 'RUN_NOT_FOUND_OR_FINISHED' })
})

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'render-video',
    engine: 'remotion',
    templates: listTemplates(),
    storage: isR2Enabled() ? 'r2' : 'local',
  })
})

app.get('/templates', (_request, response) => {
  response.json({ ok: true, templates: listTemplates() })
})

async function postBackendJson(pathname: string, body: unknown, headers: Record<string, string> = {}) {
  if (!backendBaseUrl) {
    throw new Error('APP_VIDEO_OPS_BACKEND_BASE_URL is not configured')
  }
  const payload = JSON.stringify(body)
  const response = await fetch(`${backendBaseUrl}${pathname}`, {
    method: pathname.includes('/internal/') ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: payload,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Backend request failed ${response.status}: ${text.slice(0, 400)}`)
  }
  return response
}

async function completeWorkflowFromRender(job: RenderVideoJob, render: Record<string, unknown>, status: 'SUCCEEDED' | 'FAILED', message: string) {
  if (!backendBaseUrl || !workflowCallbackSecret || !job.workflowRunId) return
  const responsePayload = status === 'SUCCEEDED'
    ? { contentIdeaId: job.contentIdeaId, renderId: render.renderId, outputUrl: render.outputUrl, engine: 'remotion' }
    : { contentIdeaId: job.contentIdeaId, error: message }
  await postBackendJson(`/api/video-ops/workflow-runs/${job.workflowRunId}/complete`, {
    status,
    message,
    responsePayload: JSON.stringify(responsePayload),
  }, {
    'X-Video-Ops-Callback-Secret': workflowCallbackSecret,
    ...(job.workflowRunId ? { 'X-Idempotency-Key': `RENDER_TEMPLATE_VIDEO:${job.contentIdeaId}` } : {}),
  })
}

async function updateRenderedIdea(job: RenderVideoJob, render: Record<string, unknown>) {
  if (!backendInternalSecret || !job.contentIdeaId) return
  await postBackendJson(`/api/video-ops/internal/content-ideas/${job.contentIdeaId}`, {
    shotstack_render_id: render.renderId,
    shotstack_status: 'done',
    shotstack_url: render.outputUrl,
    thumbnail_url: render.thumbnailUrl || null,
    final_video_status: 'ready',
    render_status: 'remotion_rendered',
    pipeline_status: 'render_ready',
    render_engine: 'remotion',
    quality_profile: render.qualityProfile || job.render.qualityProfile,
    template_id: job.render.templateId,
  }, {
    'X-Video-Ops-Internal-Secret': backendInternalSecret,
  })
}

app.post('/render-async', async (request, response) => {
  const validation = validateContract(request.body)
  if (!validation.ok) {
    response.status(400).json({ ok: false, error: 'INVALID_RENDER_JOB', details: validation.errors })
    return
  }

  const job = asRenderVideoJob(request.body)
  const runId = Number(job.workflowRunId) || 0
  const queuePosition = renderQueue.length + (activeRenderCount < MAX_CONCURRENT_RENDERS ? 0 : 1)
  setProgress(runId, {
    progress: 0,
    status: queuePosition > 0 ? 'queued' : 'preparing',
    queuePosition: queuePosition > 0 ? queuePosition : undefined,
  })

  void (async () => {
    const acquired = await acquireRenderSlot(runId)
    if (!acquired || cancelledRunIds.has(runId)) {
      cancelledRunIds.delete(runId)
      setProgress(runId, { status: 'cancelled', error: 'Annulé avant démarrage' })
      return
    }
    cancelledRunIds.delete(runId)

    try {
      const renderResponse = await fetch(`${localBaseUrl}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      })
      const render = await renderResponse.json() as Record<string, unknown>
      if (!renderResponse.ok || render.ok === false) {
        throw new Error(String(render.message || render.error || `Render failed with ${renderResponse.status}`))
      }
      await updateRenderedIdea(job, render)
      await completeWorkflowFromRender(job, render, 'SUCCEEDED', 'Remotion render completed.')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const isCancelled = cancelledRunIds.has(runId)
      setProgress(runId, { status: isCancelled ? 'cancelled' : 'error', error: message })
      if (!isCancelled) {
        await completeWorkflowFromRender(job, { error: message }, 'FAILED', message).catch(() => undefined)
      }
    } finally {
      releaseRenderSlot()
    }
  })()

  response.status(202).json({
    ok: true,
    status: queuePosition > 0 ? 'queued' : 'accepted',
    engine: 'remotion',
    workflowRunId: job.workflowRunId,
    contentIdeaId: job.contentIdeaId,
    queuePosition: queuePosition > 0 ? queuePosition : null,
    maxConcurrent: MAX_CONCURRENT_RENDERS,
  })
})

app.post('/render', async (request, response, next) => {
  try {
    const validation = validateContract(request.body)
    if (!validation.ok) {
      response.status(400).json({
        ok: false,
        error: 'INVALID_RENDER_JOB',
        details: validation.errors,
      })
      return
    }

    const job = asRenderVideoJob(request.body)
    const renderId = createRenderId(job.contentIdeaId, job.workflowRunId)
    const runId = Number(job.workflowRunId) || 0
    setProgress(runId, { progress: 0, status: 'preparing' })
    const rawFileName = `${renderId}.raw.mp4`
    const finalFileName = `${renderId}.mp4`
    const thumbnailFileName = `${renderId}.jpg`
    const rawPath = path.join(outputDir, rawFileName)
    const finalPath = path.join(outputDir, finalFileName)
    const thumbnailPath = path.join(outputDir, thumbnailFileName)
    const renderJob = await prepareLocalAssets(job, renderId)
    setProgress(runId, { progress: 0.10, status: 'rendering' })

    const serveUrl = await getBundleLocation()
    const compositionId = resolveCompositionId(renderJob.render.templateId)
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: { job: renderJob },
    })

    // L'intermédiaire `rawPath` est ré-encodé par `postProcess` avec le profil
    // qualité voulu (crf/preset selon `qualityProfile`). On encode donc ici en
    // ultrarapide / quasi-lossless pour maximiser le throughput Remotion.
    // `concurrency` = nb de pages Chromium parallèles (1 par cœur dispo).
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: rawPath,
      inputProps: { job: renderJob },
      x264Preset: 'ultrafast',
      crf: 28,
      concurrency: null,
      onProgress: ({ progress }) => {
        // Phase rendu = 0.10..0.85 du total (les 0..0.10 sont consommés par
        // `prepareLocalAssets`). Post-process + upload prennent les 0.15 restants.
        const mapped = 0.10 + Math.max(0, Math.min(1, progress)) * 0.75
        setProgress(runId, { progress: mapped, status: 'rendering' })
      },
    })

    setProgress(runId, { progress: 0.88, status: 'post-processing' })
    const post = await postProcess({
      inputPath: rawPath,
      outputPath: finalPath,
      thumbnailPath,
      job: renderJob,
      workDir: path.join(outputDir, 'tmp', renderId),
      renderId,
      downloadAsset: downloadRemoteAsset,
    })
    setProgress(runId, { progress: 0.95, status: 'uploading' })

    fs.rmSync(rawPath, { force: true })
    fs.rmSync(path.join(outputDir, 'tmp', renderId), { recursive: true, force: true })

    if (post.storage === 'r2') {
      fs.rmSync(finalPath, { force: true })
      fs.rmSync(thumbnailPath, { force: true })
    }

    const outputUrl = post.remoteVideoUrl || `${publicBaseUrl}/renders/${finalFileName}`
    const thumbnailUrl = post.remoteThumbnailUrl || `${publicBaseUrl}/renders/${thumbnailFileName}`

    setProgress(runId, { progress: 1, status: 'done', outputUrl })

    response.status(201).json({
      ok: true,
      engine: 'remotion',
      renderId,
      status: 'rendered',
      templateId: renderJob.render.templateId,
      compositionId,
      storage: post.storage,
      outputUrl,
      outputPath: post.storage === 'r2' ? null : finalPath,
      thumbnailUrl,
      thumbnailPath: post.storage === 'r2' ? null : thumbnailPath,
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      durationInFrames: composition.durationInFrames,
      qualityProfile: post.qualityProfile,
      audioMixed: post.audioMixed,
      loudnessNormalized: post.loudnessNormalized,
      loudnessTargetLufs: post.loudnessTargetLufs,
      qaScreenshots: post.qaScreenshots.map((p) => path.basename(p)),
    })
  } catch (error) {
    const runId = Number((request.body as { workflowRunId?: number } | undefined)?.workflowRunId) || 0
    if (runId > 0) {
      setProgress(runId, {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
    next(error)
  }
})

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : String(error)
  response.status(500).json({
    ok: false,
    error: 'RENDER_FAILED',
    message,
  })
})

app.listen(port, () => {
  console.log(`render-video listening on ${port}`)
})
