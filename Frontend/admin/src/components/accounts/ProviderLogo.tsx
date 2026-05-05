import type { JSX } from 'react'

const LOGOS: Record<string, JSX.Element> = {
  tiktok: (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="#25F4EE"
        d="M21.7 9.2v3.4a8.6 8.6 0 0 1-5-1.6v7.4a6.4 6.4 0 1 1-6.4-6.4c.4 0 .8 0 1.2.1v3.5a3 3 0 1 0 2.1 2.8V4h3.4a5.2 5.2 0 0 0 4.7 5.2z"
      />
      <path
        fill="#FE2C55"
        d="M23.7 7.2V10.6a8.6 8.6 0 0 1-5-1.6v7.4a6.4 6.4 0 1 1-6.4-6.4c.4 0 .8 0 1.2.1v3.5a3 3 0 1 0 2.1 2.8V2h3.4a5.2 5.2 0 0 0 4.7 5.2z"
      />
      <path
        fill="#fff"
        d="M22.7 8.2V11.6a8.6 8.6 0 0 1-5-1.6v7.4a6.4 6.4 0 1 1-6.4-6.4c.4 0 .8 0 1.2.1v3.5a3 3 0 1 0 2.1 2.8V3h3.4a5.2 5.2 0 0 0 4.7 5.2z"
      />
    </svg>
  ),
  groq: (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="#F55036" />
      <path
        fill="#fff"
        d="M16 8a5.5 5.5 0 0 0-5.5 5.5v5A5.5 5.5 0 0 0 16 24h2v-3h-2a2.5 2.5 0 0 1-2.5-2.5v-5A2.5 2.5 0 0 1 16 11h2a2.5 2.5 0 0 1 2.5 2.5V15h3v-1.5A5.5 5.5 0 0 0 18 8z"
      />
    </svg>
  ),
  shotstack: (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#0BD394" />
      <path fill="#0B1320" d="M12 9l9 7-9 7z" />
    </svg>
  ),
  pexels: (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#05A081" />
      <path
        fill="#fff"
        d="M12 8h6.5a4.5 4.5 0 0 1 0 9H15v7h-3V8zm3 3v3h3.5a1.5 1.5 0 0 0 0-3H15z"
      />
    </svg>
  ),
}

export function ProviderLogo({ providerKey }: { providerKey: string }) {
  const key = String(providerKey || '').toLowerCase()
  const logo = LOGOS[key]
  if (logo) {
    return (
      <div className={`accounts-glyph accounts-glyph-${key} accounts-glyph-logo`}>
        {logo}
      </div>
    )
  }
  const letter = (providerKey || '?').charAt(0).toUpperCase()
  return <div className={`accounts-glyph accounts-glyph-${key}`}>{letter}</div>
}
