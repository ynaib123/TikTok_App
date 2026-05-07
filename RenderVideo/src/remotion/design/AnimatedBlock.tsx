import React from 'react'
import { useFadeIn, useRise } from './animations.js'

export function AnimatedBlock({
  delay = 0,
  rise = 34,
  fadeFrames = 14,
  riseFrames = 18,
  className,
  style,
  children,
}: {
  delay?: number
  rise?: number
  fadeFrames?: number
  riseFrames?: number
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const opacity = useFadeIn({ delay, durationFrames: fadeFrames })
  const translateY = useRise({ delay, durationFrames: riseFrames, fromY: rise })

  return (
    <div
      className={className}
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
