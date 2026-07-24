/**
 * Capture KC-0108 presentation screenshots.
 * Run: npx vite-node scripts/capture-kc0108-monthly-baitul-maal-screenshots.ts
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'docs', 'kc0108-monthly-baitul-maal-evidence')
const FIXTURE = pathToFileURL(join(OUT_DIR, 'fixture.html')).href

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const page = await (await browser.newContext({ viewport: { width: 980, height: 1400 } })).newPage()
  await page.goto(FIXTURE)

  const shots = [
    ['admin-cycle-management.png', '#admin-mgmt'],
    ['rukn-submission.png', '#rukn-submission'],
    ['monthly-report.png', '#monthly-report'],
    ['dashboard-kpi.png', '#dashboard-kpi'],
  ] as const

  for (const [name, selector] of shots) {
    await page.locator(selector).screenshot({ path: join(OUT_DIR, name) })
    console.log(`Wrote ${name}`)
  }

  await browser.close()
  console.log('KC-0108 screenshots captured.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
