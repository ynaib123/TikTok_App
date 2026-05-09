export interface RenderVideoSceneMedia {
  url: string
  provider?: string | null
  license?: string | null
  width?: number | null
  height?: number | null
  durationSec?: number | null
  qualityScore?: number | null
}

export interface RenderVideoScene {
  index: number
  durationSec: number
  text?: string | null
  emotion?: string | null
  mediaQuery?: string | null
  cameraMood?: string | null
  overlayPriority?: string | null
  textStyle?: {
    textX?: number | null
    textY?: number | null
    textColor?: string | null
    fontFamily?: string | null
    fontSize?: number | null
    fontWeight?: number | null
    uppercase?: boolean | null
    shadow?: 'none' | 'soft' | 'strong' | null
  } | null
  media: RenderVideoSceneMedia
}

export interface RenderVideoJob {
  contractVersion: '1.0.0' | '1.1.0'
  workflowRunId: number
  contentIdeaId: number
  source: string
  requestedAt: string
  idea: {
    category?: string | null
    topic: string
    hook?: string | null
    script: string
    caption: string
    keyword: string
    language?: string
    cta?: string | null
    visualStyle?: string | null
  }
  account?: {
    openId?: string | null
    nickname?: string | null
  }
  render: {
    templateId: string
    aspectRatio: '9:16'
    width: 720 | 1080
    height: 1280 | 1920
    fps: 24 | 25 | 30 | 60
    durationSec: number
    qualityProfile: 'draft' | 'standard' | 'high' | 'premium'
    captionMode?: 'none' | 'line' | 'karaoke' | 'word'
    sceneStrategy?: 'single-background' | 'timed-scenes' | 'mixed-media'
    safeZones?: {
      topPx?: number
      rightPx?: number
      bottomPx?: number
      leftPx?: number
    }
  }
  assets: {
    backgroundVideo: {
      url: string
      provider?: string | null
      license?: string | null
      width?: number | null
      height?: number | null
      durationSec?: number | null
      qualityScore?: number | null
    }
    voiceover?: {
      url?: string
      provider?: string | null
      voiceId?: string | null
    } | null
    music?: {
      url?: string
      volume?: number
    } | null
    captions?: Array<{
      text: string
      startMs: number
      endMs: number
    }>
    overlays?: Array<{
      kind: 'title' | 'subtitle' | 'cta' | 'logo' | 'badge'
      text?: string | null
      startMs?: number | null
      endMs?: number | null
    }>
    scenes?: RenderVideoScene[]
  }
  publication?: {
    title?: string | null
    privacyLevel?: string | null
  }
}
