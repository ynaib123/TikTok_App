import React from 'react'
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import type { RenderVideoJob, RenderVideoScene } from '../renderJob.js'
import { AnimatedBlock } from './design/AnimatedBlock.js'
import { Background } from './design/Background.js'
import { useFadeIn, useFadeOut, useRise } from './design/animations.js'
import { cleanText, fontStacks, resolvePalette, resolveSafeZones, splitScript } from './design/tokens.js'

interface NormalizedScene {
  index: number
  text: string
  mediaUrl: string
  durationFrames: number
  startFrame: number
}

function normalizeScenes(job: RenderVideoJob, fps: number, totalFrames: number): NormalizedScene[] {
  const explicit = job.assets.scenes
  if (explicit && explicit.length > 0) {
    const scenes = [...explicit].sort((a, b) => a.index - b.index)
    let cursor = 0
    return scenes.map((scene: RenderVideoScene) => {
      const durationFrames = Math.max(1, Math.round(scene.durationSec * fps))
      const startFrame = cursor
      cursor += durationFrames
      return {
        index: scene.index,
        text: cleanText(scene.text || '', 200),
        mediaUrl: scene.media.url,
        durationFrames,
        startFrame,
      }
    })
  }

  const lines = splitScript(job.idea.script, 140, 6)
  const fallbackUrl = job.assets.backgroundVideo.url
  if (lines.length === 0) {
    return [
      {
        index: 0,
        text: cleanText(job.idea.hook || job.idea.topic, 200),
        mediaUrl: fallbackUrl,
        durationFrames: totalFrames,
        startFrame: 0,
      },
    ]
  }

  const segment = Math.max(1, Math.floor(totalFrames / lines.length))
  return lines.map((line, idx) => ({
    index: idx,
    text: line,
    mediaUrl: fallbackUrl,
    durationFrames: idx === lines.length - 1 ? totalFrames - segment * idx : segment,
    startFrame: segment * idx,
  }))
}

const CROSSFADE_FRAMES = 5

function SceneBackground({
  url,
  sceneFrames,
  fadeInFrames,
}: {
  url: string
  sceneFrames: number
  fadeInFrames: number
}) {
  // Crossfade: la scène N+1 démarre `fadeInFrames` frames avant la fin de la
  // scène N et fade-in par-dessus. Comme la scène N reste rendue à 100% durant
  // ce chevauchement, on n'a jamais de fade-noir.
  // Slow zoom Ken Burns 1.0 → 1.05 pour donner du mouvement sans bruit visuel.
  const frame = useCurrentFrame()
  const scale = interpolate(frame, [0, sceneFrames], [1.0, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  })
  const opacity = fadeInFrames > 0
    ? interpolate(frame, [0, fadeInFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1
  return (
    <AbsoluteFill style={{ overflow: 'hidden', opacity }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <Background url={url} scrim="linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.18) 40%, rgba(0,0,0,0.55) 100%)" />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

const proHook: React.CSSProperties = {
  fontFamily: fontStacks.display,
  fontWeight: 900,
  fontSize: 96,
  lineHeight: 0.96,
  letterSpacing: '-0.02em',
  textTransform: 'uppercase',
  color: '#ffffff',
  textAlign: 'center',
  WebkitTextStroke: '2px rgba(0,0,0,0.55)',
  textShadow: '0 8px 28px rgba(0,0,0,0.55), 0 2px 0 rgba(0,0,0,0.6)',
  maxWidth: 880,
  margin: 0,
}

const proSceneText: React.CSSProperties = {
  fontFamily: fontStacks.display,
  fontWeight: 900,
  fontSize: 88,
  lineHeight: 0.98,
  letterSpacing: '-0.018em',
  textTransform: 'uppercase',
  color: '#ffffff',
  textAlign: 'center',
  WebkitTextStroke: '1.5px rgba(0,0,0,0.55)',
  textShadow: '0 6px 22px rgba(0,0,0,0.6), 0 2px 0 rgba(0,0,0,0.55)',
  maxWidth: 880,
  margin: 0,
}

function HookHero({ text, accent, hookFrames }: { text: string; accent: string; hookFrames: number }) {
  const fadeOut = useFadeOut({ startFrame: Math.max(0, hookFrames - 12), durationFrames: 12 })
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 80px',
        opacity: fadeOut,
      }}
    >
      <AnimatedBlock fadeFrames={10} riseFrames={14} rise={36}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          <div style={{ width: 72, height: 6, borderRadius: 3, backgroundColor: accent, boxShadow: `0 0 24px ${accent}cc` }} />
          <div style={proHook}>{text}</div>
        </div>
      </AnimatedBlock>
    </AbsoluteFill>
  )
}

function SceneTextHero({ text, durationFrames }: { text: string; durationFrames: number }) {
  const fadeIn = useFadeIn({ durationFrames: 10 })
  const fadeOut = useFadeOut({
    startFrame: Math.max(0, durationFrames - 8),
    durationFrames: 8,
  })
  const translateY = useRise({ durationFrames: 14, fromY: 24 })
  if (!text) return null
  const opacity = Math.min(fadeIn, fadeOut)
  return (
    <div style={{ ...proSceneText, opacity, transform: `translateY(${translateY}px)` }}>{text}</div>
  )
}

export function TikTokSceneSequence({ job }: { job: RenderVideoJob }) {
  const { fps, durationInFrames } = useVideoConfig()
  const palette = resolvePalette(job.idea.category || job.idea.visualStyle)
  const safe = resolveSafeZones(job.render.width, job.render.safeZones)
  const scenes = normalizeScenes(job, fps, durationInFrames)
  const hook = cleanText(job.idea.hook || job.idea.topic, 110)
  const hookFrames = Math.min(durationInFrames, Math.round(fps * 1.8))

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', fontFamily: fontStacks.body }}>
      {scenes.map((scene, i) => {
        const isFirst = i === 0
        const fadeInFrames = isFirst ? 0 : CROSSFADE_FRAMES
        const sequenceFrom = scene.startFrame - fadeInFrames
        const sequenceDuration = scene.durationFrames + fadeInFrames
        const textLocalDelay = isFirst ? hookFrames : CROSSFADE_FRAMES
        const textDuration = Math.max(1, sequenceDuration - textLocalDelay)
        return (
          <Sequence
            key={`scene-${scene.index}-${scene.startFrame}`}
            from={sequenceFrom}
            durationInFrames={sequenceDuration}
          >
            <SceneBackground
              url={scene.mediaUrl}
              sceneFrames={sequenceDuration}
              fadeInFrames={fadeInFrames}
            />
            <Sequence from={textLocalDelay} durationInFrames={textDuration}>
              <AbsoluteFill
                style={{
                  paddingTop: safe.topPx,
                  paddingRight: safe.rightPx,
                  paddingBottom: safe.bottomPx,
                  paddingLeft: safe.leftPx,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SceneTextHero text={scene.text} durationFrames={textDuration} />
              </AbsoluteFill>
            </Sequence>
          </Sequence>
        )
      })}

      <Sequence from={0} durationInFrames={hookFrames}>
        <HookHero text={hook} accent={palette.accent} hookFrames={hookFrames} />
      </Sequence>
    </AbsoluteFill>
  )
}
