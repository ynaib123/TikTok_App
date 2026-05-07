import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'
import { postProcess } from '../dist/postProcess.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const execFileAsync = promisify(execFile)

const tmpDir = path.resolve(__dirname, '..', 'renders', 'tmp', 'smoke-postprocess')
fs.mkdirSync(tmpDir, { recursive: true })

const rawPath = path.join(tmpDir, 'raw.mp4')
const voicePath = path.join(tmpDir, 'voice.wav')
const musicPath = path.join(tmpDir, 'music.wav')
const finalPath = path.join(tmpDir, 'final.mp4')
const thumbPath = path.join(tmpDir, 'thumb.jpg')

async function ff(args) {
  await execFileAsync(ffmpegStatic, args, { maxBuffer: 1024 * 1024 * 64 })
}

async function syntheticInputs() {
  await ff([
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'color=c=#0a84ff:size=1080x1920:rate=30',
    '-t', '4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', rawPath,
  ])
  await ff([
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4',
    '-c:a', 'pcm_s16le', voicePath,
  ])
  await ff([
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'sine=frequency=220:duration=4',
    '-c:a', 'pcm_s16le', musicPath,
  ])
}

const job = {
  contractVersion: '1.0.0',
  workflowRunId: 1,
  contentIdeaId: 1,
  source: 'smoke-postprocess',
  requestedAt: new Date(0).toISOString(),
  idea: { topic: 't', script: 'a. b.', caption: 'c', keyword: 'k' },
  render: {
    templateId: 'tiktok-pro-vertical',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    durationSec: 4,
    qualityProfile: 'standard',
    captionMode: 'line',
    sceneStrategy: 'single-background',
  },
  assets: {
    backgroundVideo: { url: 'http://localhost/x.mp4' },
    voiceover: { url: 'voice://local', provider: 'smoke' },
    music: { url: 'music://local', volume: 0.2 },
    captions: [],
    overlays: [],
  },
}

async function downloadAsset(url, outputPath) {
  if (url === 'voice://local') return fs.copyFileSync(voicePath, outputPath)
  if (url === 'music://local') return fs.copyFileSync(musicPath, outputPath)
  throw new Error(`unknown smoke url: ${url}`)
}

async function main() {
  console.log('preparing synthetic inputs...')
  await syntheticInputs()
  console.log('postProcess (with voice + music)...')
  const result = await postProcess({
    inputPath: rawPath,
    outputPath: finalPath,
    thumbnailPath: thumbPath,
    job,
    workDir: path.join(tmpDir, 'work'),
    downloadAsset,
  })

  const finalStat = fs.statSync(finalPath)
  const thumbStat = fs.statSync(thumbPath)
  console.log('final size:', finalStat.size, 'bytes')
  console.log('thumb size:', thumbStat.size, 'bytes')
  if (finalStat.size < 5_000) throw new Error('final mp4 too small')
  if (thumbStat.size < 500) throw new Error('thumbnail too small')
  console.log('result:', result)

  console.log('postProcess (no audio assets)...')
  const noAudioJob = { ...job, assets: { ...job.assets, voiceover: null, music: null } }
  const finalNoAudio = path.join(tmpDir, 'final-noaudio.mp4')
  const thumbNoAudio = path.join(tmpDir, 'thumb-noaudio.jpg')
  const noAudioResult = await postProcess({
    inputPath: rawPath,
    outputPath: finalNoAudio,
    thumbnailPath: thumbNoAudio,
    job: noAudioJob,
    workDir: path.join(tmpDir, 'work-noaudio'),
    downloadAsset,
  })
  if (noAudioResult.audioMixed) throw new Error('audioMixed should be false when no audio')
  console.log('OK no-audio:', fs.statSync(finalNoAudio).size, 'bytes')

  console.log('all postProcess smoke tests OK')
}

main().catch((err) => {
  console.error('FAIL:', err)
  process.exit(1)
})
