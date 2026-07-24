/**
 * Capture KC-0102E before/after executive dashboard fixtures.
 * Run: npx vite-node scripts/capture-kc0102e-screenshots.ts
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'docs', 'kc-0102e-evidence')

async function capture(name: string, file: string, width: number) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width, height: 1600 } })
  const page = await context.newPage()
  await page.goto(pathToFileURL(join(OUT_DIR, file)).href)
  await page.screenshot({
    path: join(OUT_DIR, name),
    fullPage: true,
  })
  await browser.close()
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  await capture('before-desktop.png', 'before-fixture.html', 1280)
  await capture('after-desktop.png', 'after-fixture.html', 1280)
  await capture('after-mobile.png', 'after-fixture.html', 390)
  console.log('KC-0102E evidence screenshots captured.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
