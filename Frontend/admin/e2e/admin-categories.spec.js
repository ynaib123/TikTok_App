import process from 'node:process'
import { test, expect } from '@playwright/test'

// Suite skipped: see admin-products.spec.js header. Categories belonged to the
// retired products module.
test.skip(true, 'Categories module retired — see admin-products.spec.js.')

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL || 'admin@myshop.com'
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD || '123456'

async function loginAsAdmin(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(adminEmail)
  await page.locator('#admin-password').fill(adminPassword)
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await expect(page).toHaveURL(/\/products$/)
}

test('creates and updates a category from the categories workspace', async ({ page }) => {
  const nonce = Date.now()
  const categoryName = `Categorie E2E ${nonce}`
  const updatedCategoryName = `Categorie E2E ${nonce} Mod`

  await loginAsAdmin(page)
  await page.goto('/categories')
  await expect(page).toHaveURL(/\/categories$/)

  await page.locator('#category-create-input').fill(categoryName)
  await page.getByLabel('Creer la categorie').click()

  await expect(page.getByText('Categorie creee avec succes.')).toBeVisible()
  await expect(page.locator('#category-edit-input')).toHaveValue(categoryName)

  await page.locator('#category-edit-input').fill(updatedCategoryName)
  await page.getByLabel('Enregistrer la categorie').click()

  await expect(page.getByText('Categorie mise a jour avec succes.')).toBeVisible()
  await expect(page.locator('#category-edit-input')).toHaveValue(updatedCategoryName)
})

test('logs out from the admin shell profile menu', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByLabel('Menu profil').click()
  await page.getByRole('menuitem', { name: 'Se deconnecter' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
})
