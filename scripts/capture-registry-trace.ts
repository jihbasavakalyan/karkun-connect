import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const url = process.argv[2] ?? 'http://127.0.0.1:5173/'
const label = process.argv[3] ?? 'LOCAL'
const waitMs = Number(process.argv[4] ?? 15000)
const outPath = process.argv[5]

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const traces: unknown[] = []
  const warnings: string[] = []
  const errors: string[] = []

  page.on('console', (msg) => {
    const text = msg.text()
    if (text.includes('[KC-REGISTRY-TRACE]')) {
      const json = text.replace(/^.*\[KC-REGISTRY-TRACE\]\s*/, '')
      try {
        traces.push(JSON.parse(json))
      } catch {
        traces.push({ raw: text })
      }
    }
    if (text.includes('[kc-firestore]') || text.includes('[bootstrap]')) {
      warnings.push(text)
    }
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(waitMs)

  const fromWindow = await page.evaluate(() => {
    const w = window as unknown as { __KC_REGISTRY_TRACE__?: { snapshots: unknown[] } }
    return w.__KC_REGISTRY_TRACE__ ?? null
  })

  const report = {
    label,
    url,
    waitMs,
    capturedAt: new Date().toISOString(),
    consoleTraceCount: traces.length,
    windowSnapshotCount: fromWindow?.snapshots?.length ?? 0,
    warnings,
    errors,
    snapshots: fromWindow?.snapshots ?? traces,
  }

  const text = JSON.stringify(report, null, 2)
  if (outPath) {
    writeFileSync(outPath, text, 'utf8')
  }
  console.log(text)

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
