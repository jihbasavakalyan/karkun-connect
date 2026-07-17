/**
 * KC-007.1 Mission Control UI certification screenshots.
 * Usage: PREVIEW_URL=http://localhost:4173 npx vite-node scripts/capture-kc0071-screenshots.ts
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'docs', 'kc0071-ui-certification')
const BASE_URL = process.env.PREVIEW_URL ?? 'http://localhost:4173'

const ADMIN = { email: 'admin@demo.com', password: 'password' }
const RUKN = { email: 'rukn1@demo.com', password: 'password' }

type Shot = {
  name: string
  route: string
  width: number
  height: number
  role: 'admin' | 'rukn'
  openAssistant?: boolean
}

const SHOTS: Shot[] = [
  { name: 'admin-desktop', route: '/admin', width: 1440, height: 900, role: 'admin' },
  { name: 'admin-tablet', route: '/admin', width: 768, height: 1024, role: 'admin' },
  { name: 'admin-mobile', route: '/admin', width: 390, height: 844, role: 'admin' },
  { name: 'rukn-desktop', route: '/rukn', width: 1440, height: 900, role: 'rukn' },
  { name: 'rukn-tablet', route: '/rukn', width: 768, height: 1024, role: 'rukn' },
  { name: 'rukn-mobile', route: '/rukn', width: 390, height: 844, role: 'rukn' },
  {
    name: 'admin-assistant-desktop',
    route: '/admin',
    width: 1440,
    height: 900,
    role: 'admin',
    openAssistant: true,
  },
]

async function login(page: import('playwright').Page, creds: { email: string; password: string }) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Email Address').waitFor({ timeout: 15000 })
  await page.getByLabel('Email Address').fill(creds.email)
  await page.getByLabel('Password', { exact: true }).fill(creds.password)
  await page.getByRole('button', { name: 'Login' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 45000 })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  let context = await browser.newContext()
  let page = await context.newPage()
  let currentRole: 'admin' | 'rukn' | null = null

  for (const shot of SHOTS) {
    if (currentRole !== shot.role) {
      if (currentRole !== null) {
        await context.close()
        context = await browser.newContext()
        page = await context.newPage()
      }
      await login(page, shot.role === 'admin' ? ADMIN : RUKN)
      currentRole = shot.role
    }

    await page.setViewportSize({ width: shot.width, height: shot.height })
    await page.goto(`${BASE_URL}${shot.route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    if (shot.openAssistant) {
      const openBtn = page.getByRole('button', { name: /Open Assistant/i })
      if (await openBtn.count()) {
        await openBtn.first().click()
        await page.waitForTimeout(600)
      }
    }

    await page.screenshot({
      path: join(OUT_DIR, `${shot.name}.png`),
      fullPage: true,
    })
    console.log(`Captured ${shot.name}.png`)
  }

  await context.close()
  await browser.close()
  console.log(`Screenshots saved to ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
