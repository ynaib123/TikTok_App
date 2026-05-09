import React from 'react'
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion'
import type { RenderVideoJob } from '../renderJob.js'
import { AnimatedBlock } from './design/AnimatedBlock.js'
import { AudioMixer } from './design/AudioMixer.js'
import { Background } from './design/Background.js'
import { Captions } from './design/Captions.js'
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

export function TikTokCleanMinimal({ job }: { job: RenderVideoJob }) {
  const { fps, durationInFrames } = useVideoConfig()
  const lines = splitScript(job.idea.script, 110, 4)
  const hook = cleanText(job.idea.hook || lines[0] || job.idea.topic, 100)
  const cta = cleanText(job.idea.cta || 'Voir plus', 60)
  const palette = resolvePalette(job.idea.category || job.idea.visualStyle)
  const safe = resolveSafeZones(job.render.width, job.render.safeZones)

  const segment = lines.length
    ? Math.max(1, Math.floor((durationInFrames - fps * 3) / lines.length))
    : Math.max(1, durationInFrames)

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background, fontFamily: fontStacks.body }}>
      <Background
        url={job.assets.backgroundVideo.url}
        scrim="linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.05) 38%, rgba(0,0,0,0.55) 100%)"
      />

      <AbsoluteFill
        style={{
          paddingTop: safe.topPx,
          paddingRight: safe.rightPx,
          paddingBottom: safe.bottomPx,
          paddingLeft: safe.leftPx,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <AnimatedBlock fadeFrames={18} riseFrames={22} rise={20}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 18px',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.92)',
              color: '#0b0b0b',
              fontFamily: fontStacks.body,
              fontSize: typographyScale.cta - 4,
              fontWeight: fontWeights.semibold,
              boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                backgroundColor: palette.accent,
              }}
            />
            {hook}
          </div>
        </AnimatedBlock>

        <div>
          {lines.length
            ? lines.map((line, index) => (
                <Sequence
                  key={`clean-line-${index}`}
                  from={index * segment}
                  durationInFrames={segment + fps}
                >
                  <AnimatedBlock fadeFrames={20} riseFrames={24} rise={18}>
                    <div
                      style={{
                        color: '#ffffff',
                        fontFamily: fontStacks.body,
                        fontSize: typographyScale.body,
                        lineHeight: 1.18,
                        fontWeight: fontWeights.medium,
                        letterSpacing: 0.2,
                        textShadow: '0 8px 28px rgba(0,0,0,0.6)',
                        maxWidth: 820,
                        marginBottom: 22,
                      }}
                    >
                      {line}
                    </div>
                  </AnimatedBlock>
                </Sequence>
              ))
            : null}

          <AnimatedBlock delay={Math.max(0, durationInFrames - fps * 3)} fadeFrames={16}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                color: '#ffffff',
                fontFamily: fontStacks.body,
                fontSize: typographyScale.cta,
                fontWeight: fontWeights.semibold,
                paddingBottom: 8,
                borderBottom: `2px solid ${palette.accent}`,
              }}
            >
              {cta}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  backgroundColor: palette.accent,
                  color: palette.accentContrast,
                  fontWeight: fontWeights.black,
                  fontSize: 22,
                }}
              >
                →
              </span>
            </div>
          </AnimatedBlock>
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          paddingLeft: safe.leftPx + 40,
          paddingRight: safe.rightPx + 40,
          paddingBottom: safe.bottomPx + 60,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Captions
          job={job}
          mode={job.render.captionMode || 'line'}
          style={{
            fontFamily: fontStacks.body,
            fontSize: typographyScale.caption - 2,
            fontWeight: fontWeights.semibold,
            textAlign: 'center',
            backgroundColor: 'rgba(11,11,11,0.62)',
            padding: '12px 22px',
            borderRadius: layout.cornerRadiusSmall,
          }}
        />
      </AbsoluteFill>

      <AudioMixer job={job} />
    </AbsoluteFill>
  )
}
