import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundle } from '@remotion/bundler'
import { selectComposition } from '@remotion/renderer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const entry = path.resolve(__dirname, '..', 'dist', 'remotion', 'index.js')

const job = {
  contractVersion: '1.0.0',
  workflowRunId: 1,
  contentIdeaId: 1,
  source: 'smoke',
  requestedAt: new Date(0).toISOString(),
  idea: {
    category: 'business',
    topic: 'Smoke test',
    hook: 'Hook smoke',
    script: 'Premier message. Deuxieme message. Troisieme.',
    caption: 'Caption smoke',
    keyword: 'smoke',
    language: 'fr',
    cta: 'Suis la suite',
  },
  render: {
    templateId: 'tiktok-pro-vertical',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    durationSec: 12,
    qualityProfile: 'premium',
    captionMode: 'line',
    sceneStrategy: 'single-background',
  },
  assets: {
    backgroundVideo: {
      url: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_1440_2560_25fps.mp4',
      provider: 'pexels',
    },
    captions: [],
    overlays: [],
  },
}

async function main() {
  console.log('bundling...')
  const serveUrl = await bundle({ entryPoint: entry, webpackOverride: (c) => c })
  console.log('serveUrl:', serveUrl)
  const ids = ['tiktok-pro-vertical', 'tiktok-bold-story', 'tiktok-clean-minimal']
  for (const id of ids) {
    const comp = await selectComposition({ serveUrl, id, inputProps: { job: { ...job, render: { ...job.render, templateId: id } } } })
    console.log(`OK ${id}: ${comp.width}x${comp.height} @ ${comp.fps}fps frames=${comp.durationInFrames}`)
  }
  console.log('all templates OK')
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
