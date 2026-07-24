/**
 * Capture KC-0109 before/after Admin dashboard IA screenshots.
 * Run: npx vite-node scripts/capture-kc0109-command-center-screenshots.ts
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'docs', 'kc0109-command-center-evidence')

async function shot(page: import('playwright').Page, fixture: string, out: string, selector: string) {
  await page.goto(pathToFileURL(join(OUT_DIR, fixture)).href)
  await page.locator(selector).screenshot({ path: join(OUT_DIR, out) })
  console.log(`Wrote ${out}`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()

  {
    const context = await browser.newContext({ viewport: { width: 1100, height: 1600 } })
    const page = await context.newPage()
    await shot(page, 'before-fixture.html', 'admin-dashboard-before-desktop.png', '#admin-dashboard-before')
    await shot(page, 'after-fixture.html', 'admin-dashboard-after-desktop.png', '#admin-dashboard-after')
    await context.close()
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 1600 } })
    const page = await context.newPage()
    await shot(page, 'before-fixture.html', 'admin-dashboard-before-mobile.png', '#admin-dashboard-before')
    await shot(page, 'after-fixture.html', 'admin-dashboard-after-mobile.png', '#admin-dashboard-after')
    await context.close()
  }

  await browser.close()
  console.log('KC-0109 before/after screenshots captured.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
