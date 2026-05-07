import React from 'react'
import { Composition } from 'remotion'
import { TikTokProVertical } from './TikTokProVertical.js'
import type { RenderVideoJob } from '../renderJob.js'

const defaultJob: RenderVideoJob = {
  contractVersion: '1.0.0',
  workflowRunId: 1,
  contentIdeaId: 1,
  source: 'render-video-default',
  requestedAt: new Date(0).toISOString(),
  idea: {
    topic: 'Video TikTok',
    hook: 'Le hook apparait ici',
    script: 'Premier message. Deuxieme message. Troisieme message.',
    caption: 'Caption TikTok',
    keyword: 'business',
    language: 'fr',
    cta: 'Publie maintenant',
  },
  render: {
    templateId: 'tiktok-pro-vertical-v1',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    durationSec: 15,
    qualityProfile: 'premium',
    captionMode: 'line',
    sceneStrategy: 'single-background',
    safeZones: {
      topPx: 130,
      rightPx: 90,
      bottomPx: 160,
      leftPx: 90,
    },
  },
  assets: {
    backgroundVideo: {
      url: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_1440_2560_25fps.mp4',
      provider: 'pexels',
    },
    captions: [],
    overlays: [],
  },
}

export function RemotionRoot() {
  return (
    <Composition
      id="tiktok-pro-vertical"
      component={TikTokProVertical}
      defaultProps={{ job: defaultJob }}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={({ props }) => {
        const job = props.job as RenderVideoJob
        const fps = job.render.fps || 30
        return {
          durationInFrames: Math.max(1, Math.round(job.render.durationSec * fps)),
          fps,
          width: job.render.width,
          height: job.render.height,
        }
      }}
    />
  )
}
