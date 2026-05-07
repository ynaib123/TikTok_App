import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

export interface FadeInOptions {
  delay?: number
  durationFrames?: number
  startOpacity?: number
}

export function useFadeIn({ delay = 0, durationFrames = 14, startOpacity = 0 }: FadeInOptions = {}): number {
  const frame = useCurrentFrame()
  return interpolate(frame - delay, [0, durationFrames], [startOpacity, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
}

export interface RiseOptions {
  delay?: number
  durationFrames?: number
  fromY?: number
}

export function useRise({ delay = 0, durationFrames = 18, fromY = 34 }: RiseOptions = {}): number {
  const frame = useCurrentFrame()
  return interpolate(frame - delay, [0, durationFrames], [fromY, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
}

export interface ScaleInOptions {
  delay?: number
  durationFrames?: number
  fromScale?: number
}

export function useScaleIn({ delay = 0, durationFrames = 16, fromScale = 0.84 }: ScaleInOptions = {}): number {
  const frame = useCurrentFrame()
  return interpolate(frame - delay, [0, durationFrames], [fromScale, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.4)),
  })
}

export interface FadeOutOptions {
  startFrame: number
  durationFrames?: number
}

export function useFadeOut({ startFrame, durationFrames = 12 }: FadeOutOptions): number {
  const frame = useCurrentFrame()
  return interpolate(frame - startFrame, [0, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })
}

export function useDriftX({ delay = 0, durationFrames = 60, distance = 24 }: { delay?: number; durationFrames?: number; distance?: number } = {}): number {
  const frame = useCurrentFrame()
  return interpolate(frame - delay, [0, durationFrames], [0, distance], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  })
}

export interface PunchOptions {
  delay?: number
  durationFrames?: number
  overshoot?: number
}

export function usePunchIn({ delay = 0, durationFrames = 12, overshoot = 1.18 }: PunchOptions = {}): number {
  const frame = useCurrentFrame()
  const t = (frame - delay) / durationFrames
  if (t <= 0) return 0
  if (t >= 1) return 1
  return interpolate(t, [0, 0.6, 1], [0, overshoot, 1], {
    easing: Easing.inOut(Easing.cubic),
  })
}

export function useFramesFromMs(ms: number): number {
  const { fps } = useVideoConfig()
  return Math.round((ms / 1000) * fps)
}
