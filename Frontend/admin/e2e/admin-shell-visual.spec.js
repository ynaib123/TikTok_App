import { test, expect } from '@playwright/test'

// Suite skipped: targets the retired products module shell (/products,
// product-edit, product-create). Re-enable if the products surface returns.
test.skip(true, 'Products shell retired — see admin-products.spec.js.')

const adminSessionPayload = {
  token: 'playwright-admin-token',
  expiresInSeconds: 60 * 60,
  role: 'ADMIN',
  admin: {
    id: 1,
    nom: 'Youssef Naib',
    email: 'youssefnaib46@gmail.com',
    role: 'ADMIN',
  },
}

const catalogResponse = {
  items: [
    {
      id: 42,
      nom: 'Lampe Atelier',
      description: 'Piece de demonstration pour verrouiller le shell admin.',
      categorie: {
        id: 8,
        libelle: 'Maison',
      },
      prix: 189,
      prixAchat: 120,
      stock: 12,
      rating: 4.7,
      published: true,
      imageUrl: 'https://example.com/lampe.jpg',
      images: ['https://example.com/lampe.jpg'],
    },
    {
      id: 84,
      nom: 'Ampoule connectee SmartLight Lite',
      description: 'Produit hors ligne pour verrouiller les etats details.',
      categorie: {
        id: 12,
        libelle: 'Decoration',
      },
      prix: 57.32,
      prixAchat: 31,
      stock: 35,
      rating: 0,
      published: false,
      imageUrl: 'https://example.com/ampoule.jpg',
      images: [
        'https://example.com/ampoule.jpg',
        'https://example.com/ampoule-alt.jpg',
      ],
    },
  ],
  page: 1,
  size: 30,
  totalItems: 2,
  totalPages: 1,
}

const categoriesResponse = [
  { id: 8, libelle: 'Maison' },
  { id: 12, libelle: 'Decoration' },
]

async function mockAdminShellApi(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('admin-sidebar-collapsed', 'false')
  })

  await page.route('**/api/admins/csrf-token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'playwright-csrf-token',
        headerName: 'X-XSRF-TOKEN',
      }),
    })
  })

  await page.route('**/api/admins/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(adminSessionPayload),
    })
  })

  await page.route('**/api/admins/activity', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/api/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(categoriesResponse),
    })
  })

  await page.route(/.*\/api\/produits\/catalog\?.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(catalogResponse),
    })
  })

  await page.route(/.*\/api\/produits\/lookup\?ids=.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(catalogResponse.items),
    })
  })
}

async function openAdminRoute(page, path) {
  await mockAdminShellApi(page)
  await page.goto(path)
  await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}(#.*)?$`))
}

async function readComputedStyles(locator, properties) {
  return locator.evaluate((element, requestedProperties) => {
    const styles = window.getComputedStyle(element)
    return Object.fromEntries(
      requestedProperties.map((propertyName) => [propertyName, styles.getPropertyValue(propertyName)])
    )
  }, properties)
}

test('keeps the admin shell surfaces aligned across navbar and sidebars', async ({ page }) => {
  await openAdminRoute(page, '/products')

  const navbar = page.locator('.admin-navbar')
  const contextSidebar = page.locator('.admin-context-sidebar')
  const selectionSidebar = page.locator('.admin-product-selection-sidebar')

  await expect(navbar).toBeVisible()
  await expect(contextSidebar).toBeVisible()
  await expect(selectionSidebar).toBeVisible()

  const navbarStyles = await readComputedStyles(navbar, ['background-color', 'border-bottom-style'])
  const contextSidebarStyles = await readComputedStyles(contextSidebar, ['background-color', 'border-right-color', 'width'])
  const selectionSidebarStyles = await readComputedStyles(selectionSidebar, ['background-color', 'border-left-color', 'top'])

  expect(navbarStyles['background-color']).toBe('rgb(17, 17, 17)')
  expect(navbarStyles['border-bottom-style']).toBe('none')
  expect(contextSidebarStyles['background-color']).toBe('rgb(17, 17, 17)')
  expect(contextSidebarStyles['border-right-color']).toBe('rgba(255, 255, 255, 0.08)')
  expect(contextSidebarStyles.width).toBe('220px')
  expect(selectionSidebarStyles['background-color']).toBe('rgb(17, 17, 17)')
  expect(selectionSidebarStyles['border-left-color']).toBe('rgba(255, 255, 255, 0.08)')
  expect(selectionSidebarStyles.top).toBe('78px')
})

test('keeps the product create workspace visual contract stable', async ({ page }) => {
  await openAdminRoute(page, '/products/add')

  const createLayout = page.locator('.admin-product-create-form-layout')
  const previewCard = page.locator('.admin-product-preview-catalog-card').first()
  const descriptionField = page.locator('#product-description')

  await expect(createLayout).toBeVisible()
  await expect(previewCard).toBeVisible()
  await expect(descriptionField).toBeVisible()

  const createLayoutStyles = await readComputedStyles(createLayout, ['column-gap', 'grid-template-columns'])
  const previewCardStyles = await readComputedStyles(previewCard, ['background-color', 'border-radius'])
  const descriptionStyles = await readComputedStyles(descriptionField, ['min-height', 'background-color'])

  expect(createLayoutStyles['column-gap']).toBe('22px')
  expect(createLayoutStyles['grid-template-columns']).toContain('300px')
  expect(previewCardStyles['background-color']).toBe('rgb(23, 23, 23)')
  expect(previewCardStyles['border-radius']).toBe('24px')
  expect(descriptionStyles['min-height']).toBe('340px')
  expect(descriptionStyles['background-color']).toBe('rgba(0, 0, 0, 0)')
})

test('keeps unpublished detail rows on the same surface when selected', async ({ page }) => {
  await openAdminRoute(page, '/products')

  await page.getByRole('button', { name: /Basculer vers l'affichage details/i }).click()

  const unpublishedRow = page.locator('tr.admin-product-details-row.is-unpublished').filter({
    has: page.getByText('Ampoule connectee SmartLight Lite', { exact: true }),
  })
  const firstCell = unpublishedRow.locator('td').first()
  const lastCell = unpublishedRow.locator('td').last()

  await expect(unpublishedRow).toBeVisible()

  const backgroundBeforeSelection = await readComputedStyles(firstCell, ['background-color'])
  expect(backgroundBeforeSelection['background-color']).toBe('rgb(38, 38, 38)')

  await unpublishedRow.locator('input[type="checkbox"]').check({ force: true })
  await expect(unpublishedRow).toHaveClass(/is-selected/)

  const firstCellAfterSelection = await readComputedStyles(firstCell, ['background-color', 'border-left-color'])
  const lastCellAfterSelection = await readComputedStyles(lastCell, ['background-color', 'border-right-color'])

  expect(firstCellAfterSelection['background-color']).toBe(backgroundBeforeSelection['background-color'])
  expect(lastCellAfterSelection['background-color']).toBe(backgroundBeforeSelection['background-color'])
  expect(firstCellAfterSelection['border-left-color']).toBe('rgba(255, 255, 255, 0.16)')
  expect(lastCellAfterSelection['border-right-color']).toBe('rgba(255, 255, 255, 0.16)')
})

test('shows a visible loading fallback while lazy product sections resolve', async ({ page }) => {
  await mockAdminShellApi(page)
  await page.goto('/products/add')

  await expect(page.getByText('Chargement de la section produits...')).toBeVisible()
})
