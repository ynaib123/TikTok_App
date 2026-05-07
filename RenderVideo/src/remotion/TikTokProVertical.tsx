import React from 'react'
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import type { RenderVideoJob } from '../renderJob.js'

function cleanText(value: string | null | undefined, max = 120) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function scriptLines(script: string) {
  return String(script || '')
    .split(/[.!?\n]/)
    .map((line) => cleanText(line, 96))
    .filter(Boolean)
    .slice(0, 3)
}

function AnimatedText({ children, delay = 0, className }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame - delay, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const translateY = interpolate(frame - delay, [0, 18], [34, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })

  return (
    <div className={className} style={{ opacity, transform: `translateY(${translateY}px)` }}>
      {children}
    </div>
  )
}

export function TikTokProVertical({ job }: { job: RenderVideoJob }) {
  const { fps, durationInFrames } = useVideoConfig()
  const lines = scriptLines(job.idea.script)
  const hook = cleanText(job.idea.hook || lines[0] || job.idea.topic, 110)
  const cta = cleanText(job.idea.cta || 'Suis la suite', 72)
  const safe = job.render.safeZones || {}
  const segment = Math.max(1, Math.floor(durationInFrames / Math.max(1, lines.length || 1)))

  return (
    <AbsoluteFill style={{ backgroundColor: '#090909', fontFamily: 'Inter, Arial, sans-serif' }}>
      <AbsoluteFill>
        <OffthreadVideo
          src={job.assets.backgroundVideo.url}
          startFrom={0}
          volume={0}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.54) 0%, rgba(0,0,0,0.12) 32%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      <AbsoluteFill
        style={{
          paddingTop: Math.max(120, safe.topPx || 0),
          paddingRight: Math.max(86, safe.rightPx || 0),
          paddingBottom: Math.max(150, safe.bottomPx || 0),
          paddingLeft: Math.max(86, safe.leftPx || 0),
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <AnimatedText className="hook">
          <div
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              padding: '16px 22px',
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.14)',
              color: '#fff',
              fontSize: 34,
              lineHeight: 1.12,
              fontWeight: 800,
              letterSpacing: 0,
              boxShadow: '0 14px 44px rgba(0,0,0,0.24)',
              backdropFilter: 'blur(14px)',
            }}
          >
            {hook}
          </div>
        </AnimatedText>

        <div>
          {lines.length ? lines.map((line, index) => (
            <Sequence key={`${line}-${index}`} from={index * segment} durationInFrames={segment + fps}>
              <AnimatedText delay={6} className="script-line">
                <div
                  style={{
                    color: '#fff',
                    fontSize: 58,
                    lineHeight: 1.02,
                    fontWeight: 900,
                    letterSpacing: 0,
                    textShadow: '0 10px 34px rgba(0,0,0,0.5)',
                    maxWidth: 880,
                    marginBottom: 22,
                  }}
                >
                  {line}
                </div>
              </AnimatedText>
            </Sequence>
          )) : null}

          <AnimatedText delay={Math.max(0, durationInFrames - fps * 4)} className="cta">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 28px',
                borderRadius: 16,
                backgroundColor: '#fff',
                color: '#080808',
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: 0,
              }}
            >
              {cta}
            </div>
          </AnimatedText>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
