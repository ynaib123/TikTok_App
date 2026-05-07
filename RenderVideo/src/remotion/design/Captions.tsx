import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import type { RenderVideoJob } from '../../renderJob.js'
import { cleanText, splitScript, splitWords } from './tokens.js'

export type CaptionMode = NonNullable<RenderVideoJob['render']['captionMode']>

interface CaptionTrack {
  text: string
  startMs: number
  endMs: number
}

function buildSyntheticTracks(job: RenderVideoJob, totalSec: number): CaptionTrack[] {
  const lines = splitScript(job.idea.script, 96, 6)
  if (lines.length === 0) return []
  const lineDurationSec = totalSec / lines.length
  return lines.map((text, index) => ({
    text,
    startMs: Math.round(index * lineDurationSec * 1000),
    endMs: Math.round((index + 1) * lineDurationSec * 1000),
  }))
}

function activeTrack(tracks: CaptionTrack[], elapsedMs: number): CaptionTrack | null {
  for (const track of tracks) {
    if (elapsedMs >= track.startMs && elapsedMs < track.endMs) return track
  }
  return null
}

export function Captions({
  job,
  mode,
  style,
}: {
  job: RenderVideoJob
  mode?: CaptionMode
  style?: React.CSSProperties
}) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const totalSec = durationInFrames / fps
  const elapsedMs = (frame / fps) * 1000

  const captionMode: CaptionMode = mode || job.render.captionMode || 'line'
  if (captionMode === 'none') return null

  const explicit = (job.assets.captions || []).map((caption) => ({
    text: cleanText(caption.text, 240),
    startMs: caption.startMs,
    endMs: caption.endMs,
  }))
  const tracks = explicit.length > 0 ? explicit : buildSyntheticTracks(job, totalSec)

  const current = activeTrack(tracks, elapsedMs)
  if (!current) return null

  const baseStyle: React.CSSProperties = {
    color: '#ffffff',
    fontWeight: 800,
    lineHeight: 1.1,
    textShadow: '0 6px 28px rgba(0,0,0,0.7)',
    ...style,
  }

  if (captionMode === 'line') {
    return <div style={baseStyle}>{current.text}</div>
  }

  if (captionMode === 'word' || captionMode === 'karaoke') {
    const words = splitWords(current.text, 28)
    if (words.length === 0) return null
    const trackDurationMs = Math.max(1, current.endMs - current.startMs)
    const wordDurationMs = trackDurationMs / words.length
    const localElapsedMs = elapsedMs - current.startMs
    const activeIndex = Math.min(words.length - 1, Math.floor(localElapsedMs / wordDurationMs))

    if (captionMode === 'word') {
      return <div style={baseStyle}>{words[activeIndex]}</div>
    }

    return (
      <div style={{ ...baseStyle, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {words.map((word, index) => {
          const isActive = index <= activeIndex
          return (
            <span
              key={`${word}-${index}`}
              style={{
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
                transform: index === activeIndex ? 'scale(1.06)' : 'scale(1)',
                transition: 'none',
              }}
            >
              {word}
            </span>
          )
        })}
      </div>
    )
  }

  return null
}
