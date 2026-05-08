import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Entry point: dist version (run `npm run build` first) or src version (no build needed)
const entry =
  process.env.RENDER_ENTRY ||
  path.resolve(__dirname, '..', 'src', 'remotion', 'index.ts')

const outputDir = path.resolve(__dirname, '..', 'renders')
fs.mkdirSync(outputDir, { recursive: true })
const outputPath = path.join(outputDir, `smoke-scenes-${Date.now()}.mp4`)

// Public dir contenant scene1..4.mp4 servis via /scene1.mp4 etc.
const publicDir = path.resolve(__dirname, '..', 'public')

// Par défaut : fichiers locaux dans `public/` (montés à /public/ par le bundler Remotion).
// Pour tester avec des URLs distantes, set PEXELS_1..PEXELS_4 en env vars.
const SCENE_CLIP_1 = process.env.PEXELS_1 || '/public/scene1.mp4'
const SCENE_CLIP_2 = process.env.PEXELS_2 || '/public/scene2.mp4'
const SCENE_CLIP_3 = process.env.PEXELS_3 || '/public/scene3.mp4'
const SCENE_CLIP_4 = process.env.PEXELS_4 || '/public/scene4.mp4'

const job = {
  contractVersion: '1.1.0',
  workflowRunId: 1,
  contentIdeaId: 1,
  source: 'smoke-scenes',
  requestedAt: new Date(0).toISOString(),
  idea: {
    category: 'business',
    topic: 'Test multi-scenes',
    hook: 'Arrete de scroller',
    script: 'Voici trois leviers. Le premier change tout. Le deuxieme te fait gagner. Le troisieme verrouille.',
    caption: 'Test multi-scenes',
    keyword: 'business',
    language: 'fr',
    cta: 'Suis pour la suite',
  },
  render: {
    templateId: 'tiktok-scene-sequence',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    durationSec: 12,
    qualityProfile: 'standard',
    captionMode: 'line',
    sceneStrategy: 'timed-scenes',
  },
  assets: {
    backgroundVideo: { url: SCENE_CLIP_1, provider: 'pexels' },
    captions: [],
    overlays: [],
    scenes: [
      {
        index: 0,
        durationSec: 3,
        text: 'Voici trois leviers',
        emotion: 'urgent',
        mediaQuery: 'business meeting',
        media: { url: SCENE_CLIP_1, provider: 'pexels' },
      },
      {
        index: 1,
        durationSec: 3,
        text: 'Le premier change tout',
        emotion: 'reveal',
        mediaQuery: 'office work',
        media: { url: SCENE_CLIP_2, provider: 'pexels' },
      },
      {
        index: 2,
        durationSec: 3,
        text: 'Le deuxieme te fait gagner',
        emotion: 'energetic',
        mediaQuery: 'success',
        media: { url: SCENE_CLIP_3, provider: 'pexels' },
      },
      {
        index: 3,
        durationSec: 3,
        text: 'Le troisieme verrouille',
        emotion: 'finale',
        mediaQuery: 'achievement',
        media: { url: SCENE_CLIP_4, provider: 'pexels' },
      },
    ],
  },
}

async function main() {
  console.log('bundling Remotion entry:', entry)
  const serveUrl = await bundle({
    entryPoint: entry,
    publicDir,
    webpackOverride: (current) => ({
      ...current,
      resolve: {
        ...current.resolve,
        extensionAlias: {
          ...(current.resolve?.extensionAlias ?? {}),
          '.js': ['.ts', '.tsx', '.js'],
          '.mjs': ['.mts', '.mjs'],
        },
      },
    }),
  })
  console.log('serveUrl:', serveUrl)

  const compositionId = 'tiktok-scene-sequence'
  const inputProps = { job }

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  })
  console.log(
    `composition: ${composition.width}x${composition.height} @ ${composition.fps}fps frames=${composition.durationInFrames}`
  )

  console.log('rendering to:', outputPath)
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    publicDir,
    onProgress: ({ progress }) => {
      if (progress > 0) process.stdout.write(`\r  progress: ${(progress * 100).toFixed(1)}%   `)
    },
  })
  process.stdout.write('\n')
  console.log('OK render written:', outputPath)
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
