import process from 'node:process'
import { test, expect } from '@playwright/test'

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL || 'admin@myshop.com'
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD || '123456'

async function loginAsAdmin(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(adminEmail)
  await page.locator('#admin-password').fill(adminPassword)
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await expect(page).toHaveURL(/\/products$/)
}

test('opens the clients directory from the admin shell', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/clients')

  await expect(page).toHaveURL(/\/clients$/)
  await expect(page.getByRole('searchbox', { name: 'Rechercher un client' })).toBeVisible()
  await expect(page.getByLabel(/Filtres clients/i)).toBeVisible()
  await expect(page.getByLabel(/Trier les clients/i)).toBeVisible()
  await expect(page.getByLabel(/Clients par page/i)).toBeVisible()
})

test('selects a client and hydrates the client sidebar details', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/clients')

  const clientListItems = page.locator('.admin-client-list-item')
  await expect(clientListItems.first()).toBeVisible()

  const firstClient = clientListItems.first()
  const clientName = (await firstClient.locator('.admin-client-list-copy strong').innerText()).trim()
  const clientEmail = (await firstClient.locator('.admin-client-list-copy span').innerText()).trim()

  await firstClient.click()

  const sidebar = page.locator('.admin-client-selection-sidebar')
  await expect(page).toHaveURL(/\/clients\/\d+$/)
  await expect(sidebar).toBeVisible()
  await expect(page.locator('.admin-selection-sidebar-hero-title')).toContainText(clientName)
  await expect(page.getByText(clientEmail, { exact: true }).first()).toBeVisible()

  const mailButton = page.getByLabel('Contacter par email')
  await expect(mailButton).toBeVisible()
  await expect(mailButton).toHaveAttribute('href', new RegExp(`^mailto:${clientEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))

  await expect(page.getByText('Contacts')).toBeVisible()
  await expect(page.getByText('Adresses')).toBeVisible()
  await expect(page.getByText('Paiement')).toBeVisible()
  await expect(page.getByText('Commandes')).toBeVisible()
})
