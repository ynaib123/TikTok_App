import { test, expect } from '@playwright/test'

async function seedAdminSession(page) {
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
}

async function mockAccountsApi(page) {
  await page.route('**/api/admins/csrf-token', async (route) => {
    await route.fulfill({
      json: {
        token: 'playwright-csrf-token',
        headerName: 'X-XSRF-TOKEN',
      },
    })
  })

  await page.route('**/api/admins/refresh', async (route) => {
    await route.fulfill({
      json: {
        token: 'playwright-admin-token',
        expiresInSeconds: 60 * 60,
        role: 'ADMIN',
        admin: { email: 'admin@tiktokapp.local', nom: 'Video Ops Admin' },
      },
    })
  })

  // Catch-all enregistré EN PREMIER : Playwright matche les handlers en LIFO,
  // donc les routes spécifiques ci-dessous l'override. Sans ce catch-all,
  // /api/video-ops/health, /readiness, etc. tapent le vrai backend → 401 →
  // clearAdminSession() dans adminApiClient → redirect /login.
  await page.route('**/api/video-ops/**', async (route) => {
    await route.fulfill({ json: {} })
  })

  await page.route('**/api/video-ops/accounts', async (route) => {
    await route.fulfill({
      json: {
        tiktokAccounts: [],
        serviceConnections: [],
        readiness: {
          ready: false,
          connectedTikTokAccounts: 0,
          missingItems: ['TikTok', 'Groq', 'Shotstack', 'Pexels'],
        },
      },
    })
  })
}

async function openGroqModal(page) {
  await page.getByRole('button', { name: '+ Connecter un service' }).click()
  await page.getByRole('button', { name: 'Groq API key' }).click()
  return page.getByRole('dialog', { name: 'Connecter Groq' })
}

test('opens and closes the accounts service modal through accessible controls', async ({
  page,
}) => {
  await seedAdminSession(page)
  await mockAccountsApi(page)
  await page.goto('/accounts')

  const dialog = await openGroqModal(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Authentification')).toBeVisible()

  const backdrop = page.locator('.accounts-modal-backdrop')
  await expect(backdrop).toBeVisible()
  await expect(backdrop).toHaveAttribute('type', 'button')
  await expect(backdrop).toHaveAttribute('aria-label', /Fermer la fen.tre/)

  const backdropBox = await backdrop.boundingBox()
  expect(backdropBox?.width ?? 0).toBeGreaterThan(900)
  expect(backdropBox?.height ?? 0).toBeGreaterThan(500)

  await backdrop.click({ position: { x: 20, y: 20 } })
  await expect(page.getByRole('dialog', { name: 'Connecter Groq' })).toHaveCount(0)

  const reopenedDialog = await openGroqModal(page)
  await expect(reopenedDialog).toBeVisible()
  await reopenedDialog.getByRole('button', { name: 'Fermer' }).click()
  await expect(page.getByRole('dialog', { name: 'Connecter Groq' })).toHaveCount(0)
})
