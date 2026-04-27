import process from 'node:process'
import { test, expect } from '@playwright/test'

const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL || 'admin@myshop.com'
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD || '123456'
const demoImageUrl = process.env.PLAYWRIGHT_PRODUCT_IMAGE_URL || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80'

async function loginAsAdmin(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(adminEmail)
  await page.locator('#admin-password').fill(adminPassword)
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await expect(page).toHaveURL(/\/products$/)
}

test('redirects anonymous admin users to the login page', async ({ page }) => {
  await page.goto('/products')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
})

test('logs in and reaches the products management page', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page.getByRole('searchbox', { name: 'Rechercher un produit' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Choisir un mode d'ajout/i })).toBeVisible()
})

test('creates a product from the manual workspace', async ({ page }) => {
  const nonce = Date.now()
  const productName = `Produit E2E ${nonce}`
  const categoryName = `Categorie E2E ${nonce}`

  await loginAsAdmin(page)
  await page.goto('/products/add')
  await expect(page).toHaveURL(/\/products\/add$/)

  await page.locator('#product-name').fill(productName)
  await page.locator('#product-description').fill('Produit cree automatiquement par le smoke test Playwright.')
  await page.locator('#product-category').fill(categoryName)
  await page.getByRole('button', { name: 'Ajouter la categorie' }).click()
  await page.locator('#product-purchase-price').fill('120')
  await page.locator('#product-sale-price').fill('180')
  await page.locator('#product-stock').fill('7')
  await page.locator('#product-image-url').fill(demoImageUrl)
  await page.getByRole('button', { name: "Ajouter l'URL" }).click()
  await page.getByRole('button', { name: 'Creer', exact: true }).click()

  await expect(page).toHaveURL(/\/products$/)
  await expect(page.getByText('Produit cree avec succes.')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Rechercher un produit' }).fill(productName)
  await expect(page.getByRole('heading', { name: productName })).toBeVisible()
})

test('navigates to categories from a dirty create draft', async ({ page }) => {
  const adminNav = page.getByRole('navigation', { name: 'Navigation principale admin' })

  await loginAsAdmin(page)
  await page.goto('/products/add')
  await page.locator('#product-name').fill(`Brouillon E2E ${Date.now()}`)

  await adminNav.getByRole('button', { name: 'Categorie', exact: true }).click()
  await expect(page).toHaveURL(/\/categories$/)
})

test('deletes a selected product through the confirmation modal', async ({ page }) => {
  const nonce = Date.now()
  const productName = `Produit Delete E2E ${nonce}`
  const categoryName = `Categorie Delete E2E ${nonce}`

  await loginAsAdmin(page)
  await page.goto('/products/add')

  await page.locator('#product-name').fill(productName)
  await page.locator('#product-description').fill('Produit temporaire cree pour valider la suppression Playwright.')
  await page.locator('#product-category').fill(categoryName)
  await page.getByRole('button', { name: 'Ajouter la categorie' }).click()
  await page.locator('#product-purchase-price').fill('80')
  await page.locator('#product-sale-price').fill('130')
  await page.locator('#product-stock').fill('4')
  await page.locator('#product-image-url').fill(demoImageUrl)
  await page.getByRole('button', { name: "Ajouter l'URL" }).click()
  await page.getByRole('button', { name: 'Creer', exact: true }).click()

  await expect(page).toHaveURL(/\/products$/)
  await page.getByRole('searchbox', { name: 'Rechercher un produit' }).fill(productName)
  await expect(page.getByRole('heading', { name: productName })).toBeVisible()

  await page.getByLabel(`Selectionner ${productName}`).check()
  await page.getByRole('button', { name: 'Supprimer les produits selectionnes' }).click()
  const deleteDialog = page.getByRole('dialog', { name: 'Supprimer ce produit' })
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByRole('button', { name: 'Supprimer', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Supprimer ce produit' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: productName })).toHaveCount(0)
})
