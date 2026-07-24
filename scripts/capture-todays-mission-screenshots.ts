/**
 * Capture Today's Mission presentation fixture screenshots.
 * Run: npx vite-node scripts/capture-todays-mission-screenshots.ts
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'docs', 'todays-mission-evidence')
const FIXTURE = pathToFileURL(join(OUT_DIR, 'fixture.html')).href

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()

  // Desktop compact card
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    await page.goto(FIXTURE)
    await page.locator('[aria-label="Today\'s Mission"]').screenshot({
      path: join(OUT_DIR, 'todays-mission-desktop.png'),
    })
    await page.locator('[aria-label="All Tasks"]').screenshot({
      path: join(OUT_DIR, 'all-tasks-desktop.png'),
    })
    await context.close()
  }

  // Mobile compact card
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } })
    const page = await context.newPage()
    await page.goto(FIXTURE)
    await page.locator('[aria-label="Today\'s Mission"]').screenshot({
      path: join(OUT_DIR, 'todays-mission-mobile.png'),
    })
    await context.close()
  }

  await browser.close()
  console.log("Today's Mission screenshots captured.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
