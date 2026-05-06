import process from 'node:process'
import { test, expect } from '@playwright/test'

const enabled = process.env.PLAYWRIGHT_ENABLE_VIDEO_OPS_E2E === 'true'

test.skip(!enabled, 'Set PLAYWRIGHT_ENABLE_VIDEO_OPS_E2E=true to run the TikTok journey smoke test.')

test('runs the minimal TikTok journey from creation to prepare upload', async ({ page }) => {
  let nextIdeaId = 900
  let nextRunId = 3000
  let ideas = []
  let lastWorkflowRun = null

  const connectedAccount = [{
    id: 5,
    nickname: 'sandbox-account',
    openId: 'open-demo-1234567890',
    scope: 'user.info.basic,video.publish',
    environment: 'sandbox',
    status: 'connected',
  }]
  const serviceConnections = [
    { id: 11, providerKey: 'GROQ', active: true },
    { id: 12, providerKey: 'SHOTSTACK', active: true },
    { id: 13, providerKey: 'PEXELS', active: true },
  ]
  const buildReadiness = () => ({
    ready: true,
    connectedTikTokAccounts: connectedAccount.length,
    missingItems: [],
  })
  const buildIdeasPage = () => ({
    content: ideas,
    page: {
      size: 20,
      number: 0,
      totalElements: ideas.length,
      totalPages: ideas.length ? 1 : 0,
    },
  })
  const buildBootstrap = () => ({
    accountsOverview: {
      tiktokAccounts: connectedAccount,
      serviceConnections,
      readiness: buildReadiness(),
    },
    accountsReadiness: buildReadiness(),
    contentIdeas: buildIdeasPage(),
    manualActions: ideas
      .filter((idea) => idea.shotstackUrl || idea.uploadUrl)
      .map((idea) => ({
        id: idea.id,
        topic: idea.topic,
        shotstackUrl: idea.shotstackUrl || '',
        uploadUrl: idea.uploadUrl || '',
        workflowStatus: idea.pipelineStatus || '',
        tiktokStatus: idea.tiktokStatus || '',
        finalVideoStatus: idea.finalVideoStatus || '',
        shotstackStatus: idea.shotstackStatus || '',
        pipelineStatus: idea.pipelineStatus || '',
        lastError: null,
      })),
  })

  const buildStatus = (idea) => ({
    contentIdeaId: idea.id,
    topic: idea.topic,
    pipelineStage: String(idea.pipelineStatus || '').toUpperCase(),
    pipelineStageLabel: idea.pipelineStatus,
    shotstackStatus: idea.shotstackStatus || '',
    finalVideoStatus: idea.finalVideoStatus || '',
    tiktokStatus: idea.tiktokStatus || '',
    tiktokUploadStatus: idea.tiktokUploadStatus || '',
    tiktokAccountOpenId: idea.tiktokAccountOpenId || connectedAccount[0].openId,
    shotstackUrl: idea.shotstackUrl || '',
    uploadUrl: idea.uploadUrl || '',
    lastErrorMessage: null,
    lastWorkflowRun,
    lastEventMessage: lastWorkflowRun?.status === 'SUCCEEDED' ? 'Workflow termine avec succes.' : 'Workflow en cours.',
    lastEventSeverity: lastWorkflowRun?.status === 'SUCCEEDED' ? 'INFO' : 'WARN',
    lastUpdatedAt: new Date().toISOString(),
  })

  await page.route('**/api/admins/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    const method = route.request().method()

    if (method === 'GET' && pathname.endsWith('/csrf-token')) {
      await route.fulfill({
        json: {
          headerName: 'X-XSRF-TOKEN',
          token: 'playwright-csrf-token',
        },
      })
      return
    }

    if (method === 'POST' && pathname.endsWith('/login')) {
      await route.fulfill({
        json: {
          token: 'playwright-admin-token',
          expiresInSeconds: 60 * 60,
          role: 'ADMIN',
          admin: {
            email: 'admin@tiktokapp.local',
            nom: 'Video Ops Admin',
          },
        },
      })
      return
    }

    if (method === 'POST' && pathname.endsWith('/refresh')) {
      await route.fulfill({
        json: {
          token: 'playwright-admin-token',
          expiresInSeconds: 60 * 60,
          role: 'ADMIN',
          admin: {
            email: 'admin@tiktokapp.local',
            nom: 'Video Ops Admin',
          },
        },
      })
      return
    }

    if (method === 'POST' && pathname.endsWith('/logout')) {
      await route.fulfill({ json: {} })
      return
    }

    await route.fulfill({ status: 200, json: {} })
  })

  await page.route('**/api/video-ops/**', async (route) => {
    const { pathname } = new URL(route.request().url())
    const method = route.request().method()

    if (method === 'GET' && pathname.endsWith('/bootstrap')) {
      await route.fulfill({ json: buildBootstrap() })
      return
    }

    if (method === 'GET' && pathname.endsWith('/accounts/readiness')) {
      await route.fulfill({
        json: buildReadiness(),
      })
      return
    }

    if (method === 'GET' && pathname.endsWith('/observability')) {
      await route.fulfill({
        json: {
          recentRuns: lastWorkflowRun ? [lastWorkflowRun] : [],
          failedRuns: [],
          recentErrors: [],
          recentEvents: [],
          n8nContract: {
            healthy: true,
            source: 'service_connection',
            baseUrl: 'http://n8n:5678',
            workflowPaths: {
              mainPipeline: '/webhook/fused-idea-script',
              renderTemplateVideo: '/webhook/render-template-video',
              checkShotstack: '/webhook/check-shotstack',
              initPublishTikTok: '/webhook/init-publish-tiktok',
            },
            warnings: [],
            legacyCallbackSecretAllowed: false,
            stuckRunCount: 0,
          },
        },
      })
      return
    }

    if (method === 'GET' && pathname.endsWith('/tiktok-accounts')) {
      await route.fulfill({ json: connectedAccount })
      return
    }

    if (method === 'GET' && pathname.endsWith('/content-ideas')) {
      await route.fulfill({ json: buildIdeasPage() })
      return
    }

    if (method === 'GET' && pathname.endsWith('/manual-actions')) {
      const manualActions = ideas
        .filter((idea) => idea.shotstackUrl || idea.uploadUrl)
        .map((idea) => ({
          id: idea.id,
          topic: idea.topic,
          shotstackUrl: idea.shotstackUrl || '',
          uploadUrl: idea.uploadUrl || '',
          workflowStatus: idea.pipelineStatus || '',
          tiktokStatus: idea.tiktokStatus || '',
          finalVideoStatus: idea.finalVideoStatus || '',
          shotstackStatus: idea.shotstackStatus || '',
          pipelineStatus: idea.pipelineStatus || '',
          lastError: null,
        }))
      await route.fulfill({ json: manualActions })
      return
    }

    if (method === 'GET' && pathname.includes('/content-ideas/') && pathname.endsWith('/status')) {
      const ideaId = Number(pathname.split('/').slice(-2)[0])
      const idea = ideas.find((entry) => entry.id === ideaId)
      await route.fulfill({ json: buildStatus(idea) })
      return
    }

    if (method === 'GET' && pathname.includes('/workflow-runs/')) {
      await route.fulfill({
        json: lastWorkflowRun || {
          id: nextRunId,
          contentIdeaId: null,
          workflowType: 'MAIN_PIPELINE',
          status: 'SUCCEEDED',
          attemptNumber: 1,
          errorMessage: null,
          responsePayload: '{}',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      })
      return
    }

    if (method === 'POST' && pathname.endsWith('/workflows/main-pipeline')) {
      const body = JSON.parse(route.request().postData() || '{}')
      const idea = {
        id: ++nextIdeaId,
        category: body.category,
        topic: 'Food idea generated by Playwright',
        script: 'Script genere automatiquement',
        caption: 'Caption generee automatiquement',
        keyword: 'food',
        shotstackStatus: '',
        tiktokStatus: 'draft',
        finalVideoStatus: '',
        shotstackUrl: '',
        uploadUrl: '',
        tiktokAccountOpenId: body.tiktokAccountOpenId,
        pipelineStatus: 'script_ready',
        lastError: null,
      }
      ideas = [idea, ...ideas]
      lastWorkflowRun = {
        id: ++nextRunId,
        contentIdeaId: idea.id,
        workflowType: 'MAIN_PIPELINE',
        status: 'SUCCEEDED',
        attemptNumber: 1,
        errorMessage: null,
        responsePayload: '{}',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
      await route.fulfill({ json: { runId: lastWorkflowRun.id, workflowType: lastWorkflowRun.workflowType, status: 'ACCEPTED' } })
      return
    }

    if (method === 'POST' && pathname.endsWith('/workflows/check-shotstack')) {
      const body = JSON.parse(route.request().postData() || '{}')
      ideas = ideas.map((idea) => idea.id === Number(body.contentIdeaId)
        ? {
            ...idea,
            script: 'Script genere automatiquement',
            caption: 'Caption generee automatiquement',
            keyword: 'food',
            pipelineStatus: 'script_ready',
          }
        : idea)
      lastWorkflowRun = {
        id: ++nextRunId,
        contentIdeaId: Number(body.contentIdeaId),
        workflowType: 'CHECK_SHOTSTACK',
        status: 'SUCCEEDED',
        attemptNumber: 1,
        errorMessage: null,
        responsePayload: '{}',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
      await route.fulfill({ json: { runId: lastWorkflowRun.id, workflowType: lastWorkflowRun.workflowType, status: 'ACCEPTED' } })
      return
    }

    if (method === 'POST' && pathname.endsWith('/workflows/render-template')) {
      const body = JSON.parse(route.request().postData() || '{}')
      ideas = ideas.map((idea) => idea.id === Number(body.contentIdeaId)
        ? {
            ...idea,
            shotstackStatus: 'done',
            finalVideoStatus: 'ready',
            shotstackUrl: 'https://shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com/demo.mp4',
            pipelineStatus: 'render_ready',
          }
        : idea)
      lastWorkflowRun = {
        id: ++nextRunId,
        contentIdeaId: Number(body.contentIdeaId),
        workflowType: 'RENDER_TEMPLATE_VIDEO',
        status: 'SUCCEEDED',
        attemptNumber: 1,
        errorMessage: null,
        responsePayload: '{}',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
      await route.fulfill({ json: { runId: lastWorkflowRun.id, workflowType: lastWorkflowRun.workflowType, status: 'ACCEPTED' } })
      return
    }

    if (method === 'POST' && pathname.endsWith('/workflows/init-publish')) {
      const body = JSON.parse(route.request().postData() || '{}')
      ideas = ideas.map((idea) => idea.id === Number(body.contentIdeaId)
        ? {
            ...idea,
            uploadUrl: 'https://open-upload.tiktokapis.com/upload/demo',
            pipelineStatus: 'publish_initialized',
            tiktokUploadStatus: 'init_done',
          }
        : idea)
      lastWorkflowRun = {
        id: ++nextRunId,
        contentIdeaId: Number(body.contentIdeaId),
        workflowType: 'INIT_PUBLISH_TIKTOK',
        status: 'SUCCEEDED',
        attemptNumber: 1,
        errorMessage: null,
        responsePayload: '{}',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
      await route.fulfill({ json: { runId: lastWorkflowRun.id, workflowType: lastWorkflowRun.workflowType, status: 'ACCEPTED' } })
      return
    }

    await route.fulfill({ status: 200, json: {} })
  })

  await page.goto('/tiktok/creation')

  await expect(page.getByRole('heading', { name: 'Compte TikTok' })).toBeVisible()
  await page.getByRole('button', { name: 'Générer', exact: true }).click()
  await expect(page.getByText('Food idea generated by Playwright')).toBeVisible()
  await expect(page.getByText('Script genere automatiquement')).toBeVisible()
  await page.getByRole('button', { name: 'Générer la vidéo' }).click()
  await page.getByRole('button', { name: 'Valider la video' }).click()
  await expect(page.getByText('Apercu video')).toBeVisible()
  await page.getByRole('button', { name: 'Preparer upload' }).click()
  await expect(page.getByText('Upload URL')).toBeVisible()
  await expect(page.getByText('https://open-upload.tiktokapis.com/upload/demo')).toBeVisible()
})
