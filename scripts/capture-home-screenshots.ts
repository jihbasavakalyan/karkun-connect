/**
 * One-off screenshot capture for M6 Phase 1A Revision 1 visual evidence.
 * Usage: npx vite-node scripts/capture-home-screenshots.ts
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'docs', 'm6-phase1a-revision1-evidence')
const BASE_URL = process.env.PREVIEW_URL ?? 'http://localhost:4173'

const ADMIN = { email: 'admin@demo.com', password: 'password' }
const RUKN = { email: 'rukn1@demo.com', password: 'password' }

type Shot = { name: string; route: string; width: number; height: number; role: 'admin' | 'rukn' }

const SHOTS: Shot[] = [
  { name: 'admin-desktop-after', route: '/admin', width: 1280, height: 800, role: 'admin' },
  { name: 'admin-mobile-after', route: '/admin', width: 390, height: 844, role: 'admin' },
  { name: 'rukn-desktop-after', route: '/rukn', width: 1280, height: 800, role: 'rukn' },
  { name: 'rukn-mobile-after', route: '/rukn', width: 390, height: 844, role: 'rukn' },
]

async function login(page: import('playwright').Page, creds: { email: string; password: string }) {
  await page.goto(`${BASE_URL}/login`)
  await page.getByLabel('Email Address').fill(creds.email)
  await page.getByLabel('Password', { exact: true }).fill(creds.password)
  await page.getByRole('button', { name: 'Login' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'))
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
    await page.goto(`${BASE_URL}${shot.route}`)
    await page.waitForTimeout(800)
    await page.screenshot({
      path: join(OUT_DIR, `${shot.name}.png`),
      fullPage: false,
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
