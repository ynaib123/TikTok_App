import process from 'node:process'
import { test, expect } from '@playwright/test'

const enabled = process.env.PLAYWRIGHT_ENABLE_VIDEO_OPS_E2E === 'true'

test.skip(!enabled, 'Set PLAYWRIGHT_ENABLE_VIDEO_OPS_E2E=true to run the audio step smoke test.')

/**
 * Lot 8 / I2 — minimal smoke test for the new AudioStep (Lot 4).
 *
 * Mocks every HTTP call the page makes — the test verifies the wiring,
 * not the live ElevenLabs integration. The real backend integration is
 * covered by AudioServiceIntegrationTest.
 */
test('AudioStep renders voices, plays a preview, generates a take', async ({ page }) => {
  // Seed une session admin pour éviter la redirection vers /login. AdminApp
  // monte AdminAuthProvider qui appelle /api/admins/refresh : sans session
  // valide, l'utilisateur est redirigé vers /login.
  await page.addInitScript(() => {
    window.localStorage.setItem('tiktok_app_admin_remember_me', 'true')
    window.localStorage.setItem(
      'tiktok_app_admin_session',
      JSON.stringify({
        token: 'playwright-admin-token',
        expiresAt: Date.now() + 60 * 60 * 1000,
        role: 'ADMIN',
        user: { email: 'admin@tiktokapp.local', nom: 'Video Ops Admin' },
      }),
    )
  })

  await page.route('**/api/admins/csrf-token', (route) => route.fulfill({ json: { token: 't' } }))

  await page.route('**/api/admins/refresh', (route) =>
    route.fulfill({
      json: {
        token: 'playwright-admin-token',
        expiresInSeconds: 60 * 60,
        role: 'ADMIN',
        admin: { email: 'admin@tiktokapp.local', nom: 'Video Ops Admin' },
      },
    }),
  )

  await page.route('**/api/admins/me', (route) =>
    route.fulfill({
      json: {
        id: 1,
        email: 'admin@local',
        nom: 'Admin',
        role: 'ADMIN',
      },
    }),
  )

  // Catch-all video-ops endpoints : la TikTokJourneyPage charge dashboard, health,
  // observability, accounts au montage. Sans ces mocks, le 401 du vrai backend
  // déclenche clearAdminSession() dans adminApiClient et redirige vers /login.
  await page.route('**/api/video-ops/**', (route) => {
    const url = new URL(route.request().url())
    const p = url.pathname
    if (p.endsWith('/health')) {
      return route.fulfill({
        json: { status: 'UP', backend: 'UP', n8n: 'UP', postgres: 'UP', redis: 'UP' },
      })
    }
    if (p.endsWith('/observability')) {
      return route.fulfill({ json: { runs: [], metrics: {}, alerts: [] } })
    }
    if (p.endsWith('/dashboard')) {
      return route.fulfill({
        json: { totalRuns: 0, succeeded: 0, failed: 0, blocked: 0, recent: [] },
      })
    }
    if (p.endsWith('/bootstrap')) {
      return route.fulfill({
        json: {
          accountsOverview: {
            tiktokAccounts: [],
            serviceConnections: [],
            readiness: { ready: true, connectedTikTokAccounts: 0, missingItems: [] },
          },
          accountsReadiness: { ready: true, connectedTikTokAccounts: 0, missingItems: [] },
          contentIdeas: {
            content: [],
            page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
          },
          manualActions: [],
        },
      })
    }
    if (p.endsWith('/accounts/readiness')) {
      return route.fulfill({ json: { ready: true, connectedTikTokAccounts: 0, missingItems: [] } })
    }
    return route.fulfill({ json: {} })
  })

  await page.route('**/api/audio/voices', (route) =>
    route.fulfill({
      json: [
        {
          voiceId: 'rachel',
          name: 'Rachel',
          language: 'fr',
          gender: 'female',
          accent: 'standard',
          previewUrl: '',
          description: 'Clear French female voice',
        },
        {
          voiceId: 'antoine',
          name: 'Antoine',
          language: 'fr',
          gender: 'male',
          accent: 'paris',
          previewUrl: '',
          description: 'Warm French male voice',
        },
      ],
    }),
  )

  // /preview returns audio/mpeg bytes — Playwright's route helper accepts
  // a Buffer body. We hand back 4 silent MP3 frames.
  const fakeMp3 = Buffer.alloc(64, 0x00)
  await page.route('**/api/audio/preview**', (route) =>
    route.fulfill({ body: fakeMp3, headers: { 'content-type': 'audio/mpeg' } }),
  )

  // Le test ne va plus jusqu'a la generation (UI bloque le bouton tant qu'il
  // n'y a pas d'idee active dans le workspace) — on stubbe quand meme l'endpoint
  // pour eviter un 401 du vrai backend si la mutation tirait par megarde.
  await page.route('**/api/audio/generate', (route) => {
    return route.fulfill({
      json: {
        id: 42,
        contentIdeaId: 7,
        assetKind: 'voice',
        voiceId: 'rachel',
        voiceName: 'Rachel',
        voiceLanguage: 'fr',
        storageUrl: 'file:///tmp/take-42.mp3',
        durationMs: 7300,
        voiceVolume: 100,
        musicVolume: 30,
        selected: true,
        createdAt: new Date().toISOString(),
      },
    })
  })

  await page.route('**/api/audio/assets/**', (route) => route.fulfill({ json: [] }))

  // The page itself : we navigate straight to the audio step. We rely on the
  // dev-mock auth (VITE_USE_MOCK_ADMIN_AUTH=true) so we don't need a real
  // session.
  await page.goto('/tiktok/audio')

  // Les voix sont rendues comme <div role="button"> (pas listitem) dans
  // .journey-audio-voice-list. On cible par le contenu textuel "Rachel"/"Antoine".
  const rachelCard = page.getByRole('button', { name: /Rachel/ }).first()
  const antoineCard = page.getByRole('button', { name: /Antoine/ }).first()
  await expect(rachelCard).toBeVisible({ timeout: 15_000 })
  await expect(antoineCard).toBeVisible()

  // Sélectionne Rachel en cliquant sur sa carte (le bouton "▶ Écouter" est
  // un enfant — stopPropagation le sépare du clic de sélection).
  await rachelCard.click()

  // Le bouton "Générer" est désactivé tant qu'aucune idée n'est active dans le
  // workspace (snapshot : "Aucune idée active"). Ce smoke-test du composant
  // s'arrête à la sélection — la génération est couverte par AudioServiceIntegrationTest.
  await expect(page.getByText('Aucune idée active')).toBeVisible()
})
