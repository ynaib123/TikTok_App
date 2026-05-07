import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import express from 'express'
import { asRenderVideoJob, validateContract } from './contracts.js'
import { postProcess } from './postProcess.js'
import { listTemplates, resolveCompositionId } from './remotion/templateRegistry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = Number(process.env.PORT || 8090)
const outputDir = path.resolve(process.env.RENDER_VIDEO_OUTPUT_DIR || path.join(process.cwd(), 'renders'))
const publicBaseUrl = (process.env.RENDER_VIDEO_PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '')
const localBaseUrl = `http://127.0.0.1:${port}`

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

  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length === 0) {
    throw new Error('Downloaded render asset is empty')
  }

  fs.writeFileSync(outputPath, bytes)
}

async function prepareLocalAssets<T extends { assets: { backgroundVideo: { url: string } } }>(job: T, renderId: string): Promise<T> {
  const backgroundUrl = job.assets.backgroundVideo.url
  if (!isRemoteUrl(backgroundUrl)) return job

  const assetsDir = path.join(outputDir, 'assets')
  fs.mkdirSync(assetsDir, { recursive: true })

  const assetFileName = `${renderId}-background.mp4`
  const localAssetPath = path.join(assetsDir, assetFileName)
  await downloadRemoteAsset(backgroundUrl, localAssetPath)

  return {
    ...job,
    assets: {
      ...job.assets,
      backgroundVideo: {
        ...job.assets.backgroundVideo,
        url: `${localBaseUrl}/renders/assets/${assetFileName}`,
      },
    },
  }
}

app.use(express.json({ limit: '4mb' }))
app.use('/renders', express.static(outputDir))

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'render-video',
    engine: 'remotion',
    templates: listTemplates(),
  })
})

app.get('/templates', (_request, response) => {
  response.json({ ok: true, templates: listTemplates() })
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
    const rawFileName = `${renderId}.raw.mp4`
    const finalFileName = `${renderId}.mp4`
    const thumbnailFileName = `${renderId}.jpg`
    const rawPath = path.join(outputDir, rawFileName)
    const finalPath = path.join(outputDir, finalFileName)
    const thumbnailPath = path.join(outputDir, thumbnailFileName)
    const renderJob = await prepareLocalAssets(job, renderId)

    const serveUrl = await getBundleLocation()
    const compositionId = resolveCompositionId(renderJob.render.templateId)
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: { job: renderJob },
    })

    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: rawPath,
      inputProps: { job: renderJob },
    })

    const post = await postProcess({
      inputPath: rawPath,
      outputPath: finalPath,
      thumbnailPath,
      job: renderJob,
      workDir: path.join(outputDir, 'tmp', renderId),
      downloadAsset: downloadRemoteAsset,
    })

    fs.rmSync(rawPath, { force: true })
    fs.rmSync(path.join(outputDir, 'tmp', renderId), { recursive: true, force: true })

    response.status(201).json({
      ok: true,
      engine: 'remotion',
      renderId,
      status: 'rendered',
      templateId: renderJob.render.templateId,
      compositionId,
      outputUrl: `${publicBaseUrl}/renders/${finalFileName}`,
      outputPath: finalPath,
      thumbnailUrl: `${publicBaseUrl}/renders/${thumbnailFileName}`,
      thumbnailPath,
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      durationInFrames: composition.durationInFrames,
      qualityProfile: post.qualityProfile,
      audioMixed: post.audioMixed,
      loudnessNormalized: post.loudnessNormalized,
    })
  } catch (error) {
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
