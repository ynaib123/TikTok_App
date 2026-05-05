import type { ReactNode } from 'react'

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'is-draft',
  success: 'is-published',
  warning: 'is-rendering',
  error: 'is-error',
  info: 'is-ready',
}

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`journey-status-pill ${TONE_CLASS[tone]}`}>{children}</span>
}
