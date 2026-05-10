import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import ffmpegStatic from 'ffmpeg-static'
import { isR2Enabled, uploadToR2 } from './r2Storage.js'
import type { RenderVideoJob } from './renderJob.js'

const execFileAsync = promisify(execFile)

export interface PostProcessOptions {
  inputPath: string
  outputPath: string
  thumbnailPath: string
  job: RenderVideoJob
  workDir: string
  renderId: string
  downloadAsset: (url: string, outputPath: string) => Promise<void>
}

export interface PostProcessResult {
  outputPath: string
  thumbnailPath: string
  /** Chemins locaux des 3 captures QA (10%, 50%, 90% de la durée) */
  qaScreenshots: string[]
  qualityProfile: RenderVideoJob['render']['qualityProfile']
  audioMixed: boolean
  loudnessNormalized: boolean
  /** Cible de loudness LUFS utilisée lors du mixage */
  loudnessTargetLufs: number | null
  storage: 'local' | 'r2'
  remoteVideoUrl: string | null
  remoteThumbnailUrl: string | null
}

interface QualityProfile {
  preset: string
  crf: number
  audioKbps: number
  maxrateKbps: number
  bufsizeKbps: number
}

const qualityProfiles: Record<RenderVideoJob['render']['qualityProfile'], QualityProfile> = {
  draft: { preset: 'veryfast', crf: 28, audioKbps: 96, maxrateKbps: 4500, bufsizeKbps: 9000 },
  standard: { preset: 'fast', crf: 24, audioKbps: 128, maxrateKbps: 6500, bufsizeKbps: 13000 },
  high: { preset: 'medium', crf: 21, audioKbps: 160, maxrateKbps: 8500, bufsizeKbps: 17000 },
  premium: { preset: 'slow', crf: 19, audioKbps: 192, maxrateKbps: 10000, bufsizeKbps: 20000 },
}

function resolveFfmpegBin(): string {
  const override = process.env.FFMPEG_BIN_PATH
  if (override && fs.existsSync(override)) return override
  if (!ffmpegStatic) {
    throw new Error('ffmpeg-static binary not found and FFMPEG_BIN_PATH is not set')
  }
  return ffmpegStatic as unknown as string
}

async function runFfmpeg(args: string[]): Promise<void> {
  const bin = resolveFfmpegBin()
  await execFileAsync(bin, args, { maxBuffer: 1024 * 1024 * 64 })
}

function clampVolume(value: number | null | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  const normalized = value > 1 ? value / 100 : value
  return Math.max(0, Math.min(2, normalized))
}

export async function postProcess({
  inputPath,
  outputPath,
  thumbnailPath,
  job,
  workDir,
  renderId,
  downloadAsset,
}: PostProcessOptions): Promise<PostProcessResult> {
  const profile = qualityProfiles[job.render.qualityProfile] || qualityProfiles.standard
  fs.mkdirSync(workDir, { recursive: true })

  const voiceUrl = job.assets.voiceover?.url || null
  const musicUrl = job.assets.music?.url || null
  const voiceVolume = clampVolume(job.assets.voiceover?.volume, 1)
  const musicVolume = clampVolume(job.assets.music?.volume, 0.18)

  // Lot 7 / H1 — parallelize asset downloads. Voice and music are independent
  // so awaiting them sequentially wastes time-to-first-frame on every render.
  let voicePath: string | null = null
  let musicPath: string | null = null
  const downloads: Promise<void>[] = []
  if (voiceUrl) {
    voicePath = path.join(workDir, 'voice.input')
    downloads.push(downloadAsset(voiceUrl, voicePath))
  }
  if (musicUrl) {
    musicPath = path.join(workDir, 'music.input')
    downloads.push(downloadAsset(musicUrl, musicPath))
  }
  if (downloads.length > 0) {
    await Promise.all(downloads)
  }

  const audioMixed = Boolean(voicePath || musicPath)
  const loudnessNormalized = audioMixed

  const args: string[] = ['-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath]

  if (voicePath) args.push('-i', voicePath)
  if (musicPath) args.push('-i', musicPath)

  const filterParts: string[] = []
  let audioMap: string | null = null
  // Cible LUFS TikTok : -14 LUFS pour les contenus avec voix, -16 pour musique seule
  const LUFS_VOICE_TARGET = -14
  const LUFS_MUSIC_ONLY_TARGET = -16
  let loudnessTargetLufs: number | null = null
  const durationSec = job.render.durationSec

  if (voicePath && musicPath) {
    // Voix : padder avec du silence jusqu'à la durée vidéo pour éviter que
    // le mix se coupe à la fin de la voix.
    filterParts.push(`[1:a]aresample=async=1:first_pts=0,aformat=channel_layouts=stereo,volume=${voiceVolume.toFixed(3)},apad=whole_dur=${durationSec}[voiceA]`)
    // Musique : boucler infiniment, tronquer à la durée vidéo, fade-out sur les 2 dernières secondes.
    const fadeStart = Math.max(0, durationSec - 2)
    filterParts.push(`[2:a]aloop=loop=-1:size=2000000000,atrim=0:${durationSec.toFixed(3)},aresample=async=1:first_pts=0,aformat=channel_layouts=stereo,volume=${musicVolume.toFixed(3)},afade=t=out:st=${fadeStart.toFixed(3)}:d=2[musicA]`)
    filterParts.push('[voiceA][musicA]amix=inputs=2:duration=longest:dropout_transition=2[mix]')
    filterParts.push(`[mix]loudnorm=I=${LUFS_VOICE_TARGET}:TP=-1.5:LRA=11[outA]`)
    audioMap = '[outA]'
    loudnessTargetLufs = LUFS_VOICE_TARGET
  } else if (voicePath) {
    filterParts.push(`[1:a]aresample=async=1:first_pts=0,aformat=channel_layouts=stereo,volume=${voiceVolume.toFixed(3)},apad=whole_dur=${durationSec},loudnorm=I=${LUFS_VOICE_TARGET}:TP=-1.5:LRA=11[outA]`)
    audioMap = '[outA]'
    loudnessTargetLufs = LUFS_VOICE_TARGET
  } else if (musicPath) {
    const fadeStart = Math.max(0, durationSec - 2)
    filterParts.push(`[1:a]aloop=loop=-1:size=2000000000,atrim=0:${durationSec.toFixed(3)},aresample=async=1:first_pts=0,aformat=channel_layouts=stereo,volume=${musicVolume.toFixed(3)},afade=t=out:st=${fadeStart.toFixed(3)}:d=2,loudnorm=I=${LUFS_MUSIC_ONLY_TARGET}:TP=-1.5:LRA=11[outA]`)
    audioMap = '[outA]'
    loudnessTargetLufs = LUFS_MUSIC_ONLY_TARGET
  }

  if (filterParts.length > 0) {
    args.push('-filter_complex', filterParts.join(';'))
  }

  args.push('-map', '0:v:0')
  if (audioMap) {
    args.push('-map', audioMap, '-shortest')
  } else {
    args.push('-an')
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', profile.preset,
    '-crf', String(profile.crf),
    '-maxrate', `${profile.maxrateKbps}k`,
    '-bufsize', `${profile.bufsizeKbps}k`,
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '4.1',
    '-r', String(job.render.fps),
    '-movflags', '+faststart',
  )

  if (audioMap) {
    args.push('-c:a', 'aac', '-b:a', `${profile.audioKbps}k`, '-ar', '48000', '-ac', '2')
  }

  args.push(outputPath)

  await runFfmpeg(args)

  await runFfmpeg([
    '-y',
    '-hide_banner',
    '-loglevel', 'error',
    '-ss', '0.5',
    '-i', outputPath,
    '-frames:v', '1',
    '-q:v', '3',
    thumbnailPath,
  ])

  // Screenshots QA aux instants 10%, 50%, 90% de la vidéo
  const qaDir = path.join(workDir, 'qa')
  fs.mkdirSync(qaDir, { recursive: true })
  const qaScreenshots: string[] = []
  for (const fraction of [0.10, 0.50, 0.90]) {
    const ts = Math.max(0.1, durationSec * fraction).toFixed(2)
    const screenshotPath = path.join(qaDir, `qa-${Math.round(fraction * 100)}.jpg`)
    try {
      await runFfmpeg([
        '-y', '-hide_banner', '-loglevel', 'error',
        '-ss', ts, '-i', outputPath,
        '-frames:v', '1', '-q:v', '4',
        screenshotPath,
      ])
      qaScreenshots.push(screenshotPath)
    } catch {
      // QA screenshot non-bloquant — on continue si ffmpeg échoue sur un frame
    }
  }

  if (voicePath) fs.rmSync(voicePath, { force: true })
  if (musicPath) fs.rmSync(musicPath, { force: true })

  let remoteVideoUrl: string | null = null
  let remoteThumbnailUrl: string | null = null
  let storage: 'local' | 'r2' = 'local'

  if (isR2Enabled()) {
    const videoKey = `renders/${renderId}.mp4`
    const thumbKey = `renders/${renderId}.jpg`
    const [videoUpload, thumbUpload] = await Promise.all([
      uploadToR2({ filePath: outputPath, key: videoKey, contentType: 'video/mp4' }),
      uploadToR2({ filePath: thumbnailPath, key: thumbKey, contentType: 'image/jpeg' }),
    ])
    remoteVideoUrl = videoUpload.url
    remoteThumbnailUrl = thumbUpload.url
    storage = 'r2'
  }

  return {
    outputPath,
    thumbnailPath,
    qaScreenshots,
    qualityProfile: job.render.qualityProfile,
    audioMixed,
    loudnessNormalized,
    loudnessTargetLufs,
    storage,
    remoteVideoUrl,
    remoteThumbnailUrl,
  }
}
