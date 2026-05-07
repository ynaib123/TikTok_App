import React from 'react'
import { AbsoluteFill, OffthreadVideo } from 'remotion'

export function Background({
  url,
  scrim,
  vignette = false,
}: {
  url: string
  scrim: string
  vignette?: boolean
}) {
  return (
    <>
      <AbsoluteFill>
        <OffthreadVideo
          src={url}
          startFrom={0}
          volume={0}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ background: scrim }} />

      {vignette ? (
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      ) : null}
    </>
  )
}
