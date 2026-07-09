/**
 * M6 Phase 3 visual evidence — capture every major screen.
 * Usage: npm run preview (separate terminal), then npm run capture:phase3
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'docs', 'm6-phase3-evidence')
const BASE_URL = process.env.PREVIEW_URL ?? 'http://localhost:4173'

const ADMIN = { email: 'admin@demo.com', password: 'password' }
const RUKN = { email: 'rukn1@demo.com', password: 'password' }

type Shot = {
  name: string
  route: string
  role: 'admin' | 'rukn' | 'guest'
  width: number
  height: number
}

const ROUTES: Omit<Shot, 'width' | 'height'>[] = [
  { name: 'login', route: '/login', role: 'guest' },
  { name: 'admin-home', route: '/admin', role: 'admin' },
  { name: 'admin-campaign', route: '/admin/campaign', role: 'admin' },
  { name: 'admin-rukn', route: '/admin/rukn', role: 'admin' },
  { name: 'admin-karkun', route: '/admin/karkun', role: 'admin' },
  { name: 'admin-connections', route: '/admin/assignments', role: 'admin' },
  { name: 'admin-communication', route: '/admin/communication', role: 'admin' },
  { name: 'admin-compliance', route: '/admin/compliance', role: 'admin' },
  { name: 'admin-execution', route: '/admin/execution', role: 'admin' },
  { name: 'admin-follow-up', route: '/admin/follow-up', role: 'admin' },
  { name: 'admin-lists', route: '/admin/lists', role: 'admin' },
  { name: 'admin-settings', route: '/admin/settings', role: 'admin' },
  { name: 'admin-help', route: '/admin/help', role: 'admin' },
  { name: 'rukn-home', route: '/rukn', role: 'rukn' },
  { name: 'rukn-connect', route: '/rukn/available-karkun', role: 'rukn' },
  { name: 'rukn-connected', route: '/rukn/my-karkun', role: 'rukn' },
  { name: 'rukn-campaign-record', route: '/rukn/campaign-record', role: 'rukn' },
]

const VIEWPORTS = [
  { suffix: 'desktop', width: 1280, height: 800 },
  { suffix: 'mobile', width: 390, height: 844 },
] as const

const SHOTS: Shot[] = ROUTES.flatMap((route) =>
  VIEWPORTS.map((viewport) => ({
    ...route,
    name: `${route.name}-${viewport.suffix}`,
    width: viewport.width,
    height: viewport.height,
  })),
)

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
  let currentRole: 'admin' | 'rukn' | 'guest' | null = null

  for (const shot of SHOTS) {
    if (currentRole !== shot.role) {
      if (currentRole !== null) {
        await context.close()
        context = await browser.newContext()
        page = await context.newPage()
      }

      if (shot.role === 'admin') {
        await login(page, ADMIN)
      } else if (shot.role === 'rukn') {
        await login(page, RUKN)
      }

      currentRole = shot.role
    }

    await page.setViewportSize({ width: shot.width, height: shot.height })
    await page.goto(`${BASE_URL}${shot.route}`)
    await page.waitForTimeout(900)
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
