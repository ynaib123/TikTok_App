import React from 'react'
import { Composition, staticFile } from 'remotion'
import { TikTokProVertical } from './TikTokProVertical.js'
import { TikTokBoldStory } from './TikTokBoldStory.js'
import { TikTokCleanMinimal } from './TikTokCleanMinimal.js'
import { TikTokSceneSequence } from './TikTokSceneSequence.js'
import type { RenderVideoJob } from '../renderJob.js'

// Clips locaux dans `public/` pour la preview studio. En prod, les URLs viennent
// du backend (Pexels/R2). Le studio proxifie les video/HEAD requests et certains
// CDN externes répondent 403 — d'où l'usage de fichiers locaux pour le dev.
const localClip1 = staticFile('scene1.mp4')
const localClip2 = staticFile('scene2.mp4')
const localClip3 = staticFile('scene3.mp4')
const localClip4 = staticFile('scene4.mp4')

const defaultJob: RenderVideoJob = {
  contractVersion: '1.0.0',
  workflowRunId: 1,
  contentIdeaId: 1,
  source: 'render-video-default',
  requestedAt: new Date(0).toISOString(),
  idea: {
    category: 'business',
    topic: 'Video TikTok',
    hook: '3 leviers que personne ne te dit',
    script: 'Voici trois leviers. Le premier change tout. Le deuxieme te fait gagner. Le troisieme verrouille.',
    caption: 'Caption TikTok',
    keyword: 'business',
    language: 'fr',
    cta: 'Suis pour la suite',
  },
  render: {
    templateId: 'tiktok-pro-vertical',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    fps: 30,
    durationSec: 12,
    qualityProfile: 'premium',
    captionMode: 'none',
    sceneStrategy: 'single-background',
  },
  assets: {
    backgroundVideo: { url: localClip1, provider: 'local' },
    captions: [],
    overlays: [],
    scenes: [
      {
        index: 0,
        durationSec: 3,
        text: 'Voici trois leviers',
        emotion: 'urgent',
        media: { url: localClip1, provider: 'local' },
      },
      {
        index: 1,
        durationSec: 3,
        text: 'Le premier change tout',
        emotion: 'reveal',
        media: { url: localClip2, provider: 'local' },
      },
      {
        index: 2,
        durationSec: 3,
        text: 'Le deuxieme te fait gagner',
        emotion: 'energetic',
        media: { url: localClip3, provider: 'local' },
      },
      {
        index: 3,
        durationSec: 3,
        text: 'Le troisieme verrouille',
        emotion: 'finale',
        media: { url: localClip4, provider: 'local' },
      },
    ],
  },
}

function calculateMetadata({ props }: { props: { job: RenderVideoJob } }) {
  const job = props.job
  const fps = job.render.fps || 30
  return {
    durationInFrames: Math.max(1, Math.round(job.render.durationSec * fps)),
    fps,
    width: job.render.width,
    height: job.render.height,
  }
}

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="tiktok-pro-vertical"
        component={TikTokProVertical}
        defaultProps={{ job: defaultJob }}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="tiktok-bold-story"
        component={TikTokBoldStory}
        defaultProps={{
          job: { ...defaultJob, render: { ...defaultJob.render, templateId: 'tiktok-bold-story' } },
        }}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="tiktok-clean-minimal"
        component={TikTokCleanMinimal}
        defaultProps={{
          job: { ...defaultJob, render: { ...defaultJob.render, templateId: 'tiktok-clean-minimal' } },
        }}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="tiktok-scene-sequence"
        component={TikTokSceneSequence}
        defaultProps={{
          job: {
            ...defaultJob,
            render: {
              ...defaultJob.render,
              templateId: 'tiktok-scene-sequence',
              sceneStrategy: 'timed-scenes',
            },
          },
        }}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateMetadata}
      />
    </>
  )
}
