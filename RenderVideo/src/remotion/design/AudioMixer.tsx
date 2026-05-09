import React from 'react'
import { Audio } from 'remotion'
import type { RenderVideoJob } from '../../renderJob.js'

interface AudioMixerProps {
  job: RenderVideoJob
}

/**
 * Mixes the voice-over and background music tracks into the rendered video.
 *
 * The contract (render-video-job.schema.json) carries optional
 * {@code assets.voiceover.url} and {@code assets.music.url} fields with their
 * own {@code volume} (0–200, where 100 = no change). Both tracks start at
 * frame 0 and play to the end — Remotion clamps them automatically to the
 * composition duration.
 *
 * If a track is missing, its <Audio> is simply not rendered. Volume 0 also
 * skips the render (saves muxing CPU).
 */
export function AudioMixer({ job }: AudioMixerProps) {
  const voiceUrl = job.assets.voiceover?.url ?? null
  const musicUrl = job.assets.music?.url ?? null
  const voiceVolume = clampVolume((job.assets.voiceover as { volume?: number } | null | undefined)?.volume ?? 100)
  const musicVolume = clampVolume(job.assets.music?.volume ?? 30)

  return (
    <>
      {voiceUrl && voiceVolume > 0 ? (
        <Audio src={voiceUrl} volume={voiceVolume / 100} />
      ) : null}
      {musicUrl && musicVolume > 0 ? (
        <Audio src={musicUrl} volume={musicVolume / 100} />
      ) : null}
    </>
  )
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(200, value))
}
