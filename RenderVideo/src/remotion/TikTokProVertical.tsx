import React from 'react'
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion'
import type { RenderVideoJob } from '../renderJob.js'
import { AnimatedBlock } from './design/AnimatedBlock.js'
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

export function TikTokProVertical({ job }: { job: RenderVideoJob }) {
  const { fps, durationInFrames } = useVideoConfig()
  const lines = splitScript(job.idea.script, 96, 3)
  const hook = cleanText(job.idea.hook || lines[0] || job.idea.topic, 110)
  const cta = cleanText(job.idea.cta || 'Suis la suite', 72)
  const palette = resolvePalette(job.idea.category || job.idea.visualStyle)
  const safe = resolveSafeZones(job.render.width, job.render.safeZones)
  const segment = Math.max(1, Math.floor(durationInFrames / Math.max(1, lines.length || 1)))

  return (
    <AbsoluteFill style={{ backgroundColor: palette.background, fontFamily: fontStacks.body }}>
      <Background url={job.assets.backgroundVideo.url} scrim={palette.scrimGradient} />

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
        <AnimatedBlock>
          <div
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              padding: layout.badgePadding,
              borderRadius: layout.cornerRadiusMedium,
              backgroundColor: palette.surface,
              color: palette.surfaceContrast,
              fontFamily: fontStacks.display,
              fontSize: typographyScale.hook,
              lineHeight: 1.12,
              fontWeight: fontWeights.extrabold,
              boxShadow: layout.blockShadow,
              borderLeft: `4px solid ${palette.accent}`,
            }}
          >
            {hook}
          </div>
        </AnimatedBlock>

        <div>
          {lines.length
            ? lines.map((line, index) => (
                <Sequence
                  key={`${line}-${index}`}
                  from={index * segment}
                  durationInFrames={segment + fps}
                >
                  <AnimatedBlock delay={6}>
                    <div
                      style={{
                        color: palette.primary,
                        fontFamily: fontStacks.display,
                        fontSize: typographyScale.bodyLarge,
                        lineHeight: 1.04,
                        fontWeight: fontWeights.black,
                        textShadow: layout.textShadow,
                        maxWidth: 880,
                        marginBottom: 22,
                      }}
                    >
                      {line}
                    </div>
                  </AnimatedBlock>
                </Sequence>
              ))
            : null}

          <AnimatedBlock delay={Math.max(0, durationInFrames - fps * 4)}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: layout.ctaPadding,
                borderRadius: layout.cornerRadiusSmall,
                backgroundColor: palette.primary,
                color: palette.primaryContrast,
                fontFamily: fontStacks.display,
                fontSize: typographyScale.ctaLarge,
                fontWeight: fontWeights.black,
                boxShadow: `0 18px 48px ${palette.accent}55`,
              }}
            >
              {cta}
            </div>
          </AnimatedBlock>
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          paddingLeft: safe.leftPx,
          paddingRight: safe.rightPx,
          paddingBottom: safe.bottomPx + 40,
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
            fontFamily: fontStacks.display,
            fontSize: typographyScale.caption,
            textAlign: 'center',
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
