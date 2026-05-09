import { useEffect, useMemo, useRef, useState } from 'react'

interface WaveformProps {
  src: string | null
  height?: number
  bars?: number
  color?: string
  background?: string
  ariaLabel?: string
}

/**
 * Lightweight Canvas waveform : decodes the audio source via Web Audio,
 * downsamples it into `bars` peaks and paints them as vertical pills.
 *
 * Doesn't depend on WaveSurfer/peaks.js — that would pull ~80 KB of vendor
 * code for a one-shot preview component. The decode is one-shot per `src`
 * and the painted canvas is reused (no re-render of the waveform on volume
 * slider drags, which keeps the mixer responsive).
 */
export default function Waveform({
  src,
  height = 64,
  bars = 96,
  color = '#22d3ee',
  background = 'rgba(255, 255, 255, 0.06)',
  ariaLabel = 'Forme d\'onde',
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDecoding, setIsDecoding] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!src) {
      setPeaks(null)
      setError(null)
      return
    }
    let cancelled = false
    setIsDecoding(true)
    setError(null)

    const decode = async () => {
      try {
        const response = await fetch(src, { credentials: 'include' })
        if (!response.ok) throw new Error(`audio fetch ${response.status}`)
        const buffer = await response.arrayBuffer()
        const ctxClass = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
        if (!ctxClass) throw new Error('Web Audio API indisponible')
        if (!audioContextRef.current) audioContextRef.current = new ctxClass()
        const audio = await audioContextRef.current.decodeAudioData(buffer.slice(0))
        if (cancelled) return
        const channel = audio.getChannelData(0)
        const blockSize = Math.max(1, Math.floor(channel.length / bars))
        const out: number[] = new Array(bars)
        for (let i = 0; i < bars; i++) {
          let sum = 0
          const start = i * blockSize
          const end = Math.min(channel.length, start + blockSize)
          for (let j = start; j < end; j++) sum += Math.abs(channel[j])
          out[i] = sum / Math.max(1, end - start)
        }
        const peak = Math.max(...out, 0.0001)
        const normalized = out.map((v) => v / peak)
        setPeaks(normalized)
      } catch (ex) {
        if (cancelled) return
        setError((ex as Error).message)
        setPeaks(null)
      } finally {
        if (!cancelled) setIsDecoding(false)
      }
    }
    void decode()
    return () => { cancelled = true }
  }, [src, bars])

  const widthPerBar = useMemo(() => 4, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const cssWidth = bars * widthPerBar
    canvas.width = cssWidth * dpr
    canvas.height = height * dpr
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, cssWidth, height)
    if (!peaks) return
    ctx.fillStyle = color
    const center = height / 2
    for (let i = 0; i < peaks.length; i++) {
      const v = peaks[i]
      const barHeight = Math.max(2, v * height * 0.92)
      const x = i * widthPerBar + 1
      const y = center - barHeight / 2
      ctx.beginPath()
      const r = (widthPerBar - 2) / 2
      ctx.fillRect(x, y, widthPerBar - 2, barHeight)
      ctx.arc(x + r, y, r, Math.PI, 0)
      ctx.arc(x + r, y + barHeight, 0, 0, Math.PI)
      ctx.fill()
    }
  }, [peaks, bars, height, color, background, widthPerBar])

  return (
    <div role="img" aria-label={ariaLabel} style={{ position: 'relative' }}>
      <canvas ref={canvasRef} />
      {isDecoding ? (
        <div style={overlayStyle('Décodage...')}>Décodage...</div>
      ) : null}
      {error ? (
        <div style={overlayStyle(error)}>Forme d'onde indisponible : {error}</div>
      ) : null}
    </div>
  )
}

function overlayStyle(_label: string): React.CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.45)',
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    pointerEvents: 'none',
  }
}
