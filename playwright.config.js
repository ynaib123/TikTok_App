import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

function loadLocalPlaywrightEnv() {
  const envFilePath = path.resolve(process.cwd(), '.env.playwright.local')
  if (!fs.existsSync(envFilePath)) return

  const fileContents = fs.readFileSync(envFilePath, 'utf8')
  fileContents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const separatorIndex = line.indexOf('=')
      if (separatorIndex <= 0) return

      const key = line.slice(0, separatorIndex).trim()
      const rawValue = line.slice(separatorIndex + 1).trim()
      const value = rawValue.replace(/^['"]|['"]$/g, '')
      if (!key || process.env[key] != null) return
      process.env[key] = value
    })
}

loadLocalPlaywrightEnv()

const port = Number(process.env.PLAYWRIGHT_ADMIN_PORT || 5174)
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
