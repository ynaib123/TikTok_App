export const fontStacks = {
  display: '"Inter", "Helvetica Neue", "Arial Black", Arial, sans-serif',
  body: '"Inter", "Helvetica Neue", Arial, sans-serif',
  serif: '"Playfair Display", "Times New Roman", Georgia, serif',
  mono: '"JetBrains Mono", "Menlo", "Consolas", monospace',
} as const

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const

export const typographyScale = {
  hookSmall: 30,
  hook: 38,
  hookLarge: 46,
  bodySmall: 38,
  body: 50,
  bodyLarge: 64,
  display: 78,
  cta: 36,
  ctaLarge: 44,
  caption: 36,
} as const

export interface SafeZones {
  topPx: number
  rightPx: number
  bottomPx: number
  leftPx: number
}

export const officialTikTokSafeZones1080: SafeZones = {
  topPx: 220,
  rightPx: 180,
  bottomPx: 380,
  leftPx: 80,
}

export const officialTikTokSafeZones720: SafeZones = {
  topPx: 150,
  rightPx: 120,
  bottomPx: 260,
  leftPx: 60,
}

export function resolveSafeZones(width: number, override?: Partial<SafeZones>): SafeZones {
  const base = width >= 1080 ? officialTikTokSafeZones1080 : officialTikTokSafeZones720
  return {
    topPx: override?.topPx ?? base.topPx,
    rightPx: override?.rightPx ?? base.rightPx,
    bottomPx: override?.bottomPx ?? base.bottomPx,
    leftPx: override?.leftPx ?? base.leftPx,
  }
}

export interface CategoryPalette {
  primary: string
  primaryContrast: string
  accent: string
  accentContrast: string
  background: string
  surface: string
  surfaceContrast: string
  scrimGradient: string
}

const defaultPalette: CategoryPalette = {
  primary: '#ffffff',
  primaryContrast: '#080808',
  accent: '#ff2d55',
  accentContrast: '#ffffff',
  background: '#090909',
  surface: 'rgba(255,255,255,0.14)',
  surfaceContrast: '#ffffff',
  scrimGradient:
    'linear-gradient(180deg, rgba(0,0,0,0.54) 0%, rgba(0,0,0,0.12) 32%, rgba(0,0,0,0.7) 100%)',
}

const palettes: Record<string, CategoryPalette> = {
  default: defaultPalette,
  business: {
    ...defaultPalette,
    accent: '#0a84ff',
    accentContrast: '#ffffff',
    surface: 'rgba(10,132,255,0.18)',
  },
  finance: {
    ...defaultPalette,
    accent: '#30d158',
    accentContrast: '#062b12',
    surface: 'rgba(48,209,88,0.18)',
  },
  tech: {
    ...defaultPalette,
    accent: '#5e5ce6',
    accentContrast: '#ffffff',
    surface: 'rgba(94,92,230,0.20)',
  },
  lifestyle: {
    ...defaultPalette,
    accent: '#ff9f0a',
    accentContrast: '#241400',
    surface: 'rgba(255,159,10,0.20)',
  },
  fitness: {
    ...defaultPalette,
    accent: '#ff453a',
    accentContrast: '#ffffff',
    surface: 'rgba(255,69,58,0.22)',
  },
  food: {
    ...defaultPalette,
    accent: '#ff9500',
    accentContrast: '#1a0c00',
    surface: 'rgba(255,149,0,0.22)',
  },
  beauty: {
    ...defaultPalette,
    accent: '#ff375f',
    accentContrast: '#ffffff',
    surface: 'rgba(255,55,95,0.22)',
  },
  education: {
    ...defaultPalette,
    accent: '#64d2ff',
    accentContrast: '#001a26',
    surface: 'rgba(100,210,255,0.20)',
  },
  travel: {
    ...defaultPalette,
    accent: '#5ac8fa',
    accentContrast: '#001a26',
    surface: 'rgba(90,200,250,0.20)',
  },
  entertainment: {
    ...defaultPalette,
    accent: '#bf5af2',
    accentContrast: '#ffffff',
    surface: 'rgba(191,90,242,0.22)',
  },
}

function normalizeCategoryKey(value: string | null | undefined): string {
  if (!value) return 'default'
  const lower = value.toLowerCase().trim()
  if (palettes[lower]) return lower
  if (lower.includes('business') || lower.includes('entrepren')) return 'business'
  if (lower.includes('finance') || lower.includes('argent') || lower.includes('money')) return 'finance'
  if (lower.includes('tech') || lower.includes('ia') || lower.includes('ai') || lower.includes('dev')) return 'tech'
  if (lower.includes('lifestyle') || lower.includes('vie')) return 'lifestyle'
  if (lower.includes('fit') || lower.includes('sport') || lower.includes('gym')) return 'fitness'
  if (lower.includes('food') || lower.includes('cuisine') || lower.includes('recette')) return 'food'
  if (lower.includes('beauty') || lower.includes('beaute') || lower.includes('skin')) return 'beauty'
  if (lower.includes('edu') || lower.includes('learn') || lower.includes('cours')) return 'education'
  if (lower.includes('travel') || lower.includes('voyage')) return 'travel'
  if (lower.includes('movie') || lower.includes('film') || lower.includes('music') || lower.includes('show')) return 'entertainment'
  return 'default'
}

export function resolvePalette(category: string | null | undefined): CategoryPalette {
  return palettes[normalizeCategoryKey(category)]
}

export const layout = {
  cornerRadiusSmall: 14,
  cornerRadiusMedium: 22,
  cornerRadiusLarge: 32,
  badgePadding: '14px 22px',
  blockPadding: '20px 26px',
  ctaPadding: '20px 28px',
  textShadow: '0 12px 40px rgba(0,0,0,0.55)',
  blockShadow: '0 16px 48px rgba(0,0,0,0.32)',
} as const

export function cleanText(value: string | null | undefined, max = 120): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export function splitScript(script: string, max = 96, limit = 4): string[] {
  return String(script || '')
    .split(/[.!?\n]/)
    .map((line) => cleanText(line, max))
    .filter(Boolean)
    .slice(0, limit)
}

export function splitWords(text: string, max = 28): string[] {
  return cleanText(text, 4000)
    .split(/\s+/)
    .map((word) => word.slice(0, max))
    .filter(Boolean)
}
