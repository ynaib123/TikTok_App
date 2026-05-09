import React from 'react'
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion'
import type { RenderVideoJob } from '../renderJob.js'
import { AnimatedBlock } from './design/AnimatedBlock.js'
import { AudioMixer } from './design/AudioMixer.js'
import { Background } from './design/Background.js'
import { Captions } from './design/Captions.js'
import { useScaleIn } from './design/animations.js'
import {
  cleanText,
  fontStacks,
  fontWeights,
  layout,
  resolvePalette,
  resolveSafeZones,
  splitScript,
  typographyScale,
} from './design/tokens.js'

function ChapterNumber({ index, palette }: { index: number; palette: ReturnType<typeof resolvePalette> }) {
  const scale = useScaleIn({ durationFrames: 14 })
  return (
    <div
      style={{
        display: 'inline-block',
        transform: `scale(${scale})`,
        color: palette.accent,
        fontFamily: fontStacks.display,
        fontSize: 92,
        fontWeight: fontWeights.black,
        lineHeight: 1,
        textShadow: layout.textShadow,
        marginBottom: 18,
      }}
    >
      {String(index + 1).padStart(2, '0')}
    </div>
  )
}

export function TikTokBoldStory({ job }: { job: RenderVideoJob }) {
  const { fps, durationInFrames } = useVideoConfig()
  const lines = splitScript(job.idea.script, 96, 4)
  const hook = cleanText(job.idea.hook || lines[0] || job.idea.topic, 90)
  const cta = cleanText(job.idea.cta || 'Lis la suite', 60)
  const palette = resolvePalette(job.idea.category || job.idea.visualStyle)
  const safe = resolveSafeZones(job.render.width, job.render.safeZones)

  const hookFrames = Math.min(Math.round(durationInFrames * 0.22), fps * 3)
  const ctaFrames = Math.round(fps * 3.2)
  const remaining = Math.max(durationInFrames - hookFrames - ctaFrames, fps * 4)
  const perLine = lines.length ? Math.floor(remaining / lines.length) : remaining

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background, fontFamily: fontStacks.body }}>
      <Background
        url={job.assets.backgroundVideo.url}
        scrim={`linear-gradient(160deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.18) 38%, rgba(0,0,0,0.78) 100%)`}
        vignette
      />

      <AbsoluteFill
        style={{
          paddingTop: safe.topPx,
          paddingRight: safe.rightPx,
          paddingBottom: safe.bottomPx,
          paddingLeft: safe.leftPx,
        }}
      >
        <Sequence from={0} durationInFrames={hookFrames + 12}>
          <AnimatedBlock fadeFrames={10} riseFrames={14} rise={42}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 8,
                  backgroundColor: palette.accent,
                  borderRadius: 8,
                }}
              />
              <div
                style={{
                  fontFamily: fontStacks.display,
                  color: palette.primary,
                  fontSize: typographyScale.display,
                  lineHeight: 1.0,
                  fontWeight: fontWeights.black,
                  fontStyle: 'italic',
                  letterSpacing: -1,
                  textShadow: layout.textShadow,
                }}
              >
                {hook}
              </div>
            </div>
          </AnimatedBlock>
        </Sequence>

        {lines.map((line, index) => {
          const startFrame = hookFrames + index * perLine
          return (
            <Sequence
              key={`bold-line-${index}`}
              from={startFrame}
              durationInFrames={perLine + fps}
            >
              <div
                style={{
                  position: 'absolute',
                  left: safe.leftPx,
                  right: safe.rightPx,
                  top: '38%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <ChapterNumber index={index} palette={palette} />
                <AnimatedBlock fadeFrames={8} riseFrames={14} delay={4}>
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: palette.accent,
                      color: palette.accentContrast,
                      padding: '12px 18px',
                      fontFamily: fontStacks.display,
                      fontSize: typographyScale.bodyLarge,
                      fontWeight: fontWeights.black,
                      lineHeight: 1.05,
                      borderRadius: 6,
                      boxShadow: layout.blockShadow,
                    }}
                  >
                    {line}
                  </div>
                </AnimatedBlock>
              </div>
            </Sequence>
          )
        })}

        <Sequence
          from={Math.max(0, durationInFrames - ctaFrames)}
          durationInFrames={ctaFrames + 1}
        >
          <div
            style={{
              position: 'absolute',
              left: safe.leftPx,
              right: safe.rightPx,
              bottom: safe.bottomPx,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <AnimatedBlock fadeFrames={10} riseFrames={16} rise={50}>
              <div
                style={{
                  padding: '24px 36px',
                  borderRadius: 999,
                  backgroundImage: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.primary} 100%)`,
                  color: palette.accentContrast,
                  fontFamily: fontStacks.display,
                  fontSize: typographyScale.ctaLarge,
                  fontWeight: fontWeights.black,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  boxShadow: `0 24px 56px ${palette.accent}88`,
                }}
              >
                {cta}
              </div>
            </AnimatedBlock>
          </div>
        </Sequence>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          paddingLeft: safe.leftPx,
          paddingRight: safe.rightPx,
          paddingBottom: safe.bottomPx + 30,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Captions
          job={job}
          mode={job.render.captionMode === 'none' ? 'none' : 'word'}
          style={{
            fontFamily: fontStacks.display,
            fontSize: typographyScale.bodyLarge,
            fontWeight: fontWeights.black,
            textAlign: 'center',
            color: palette.primary,
          }}
        />
      </AbsoluteFill>

      <AudioMixer job={job} />
    </AbsoluteFill>
  )
}
