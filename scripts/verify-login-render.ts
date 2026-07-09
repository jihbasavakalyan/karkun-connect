/**
 * Verifies /login renders in firestore mode (unauthenticated startup path).
 * Run: npm run verify:login-render
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(projectRoot, 'dist')
const port = 4173

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function startStaticServer(): Promise<{ close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const urlPath = request.url?.split('?')[0] ?? '/'
      const filePath =
        urlPath === '/' || !path.extname(urlPath)
          ? path.join(distDir, 'index.html')
          : path.join(distDir, urlPath)

      if (!existsSync(filePath)) {
        response.writeHead(404)
        response.end('Not found')
        return
      }

      const content = readFileSync(filePath)
      const ext = path.extname(filePath)
      const contentType =
        ext === '.js'
          ? 'application/javascript'
          : ext === '.css'
            ? 'text/css'
            : ext === '.svg'
              ? 'image/svg+xml'
              : 'text/html'

      response.writeHead(200, { 'Content-Type': contentType })
      response.end(content)
    })

    server.on('error', reject)
    server.listen(port, () => {
      resolve({
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()))
          }),
      })
    })
  })
}

async function main() {
  assert(existsSync(path.join(distDir, 'index.html')), 'Run npm run build before verify:login-render')

  const server = await startStaticServer()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  const consoleErrors: string[] = []
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message)
  })

  try {
    await page.goto(`http://127.0.0.1:${port}/login`, { waitUntil: 'networkidle', timeout: 30000 })

    const rootHtml = await page.locator('#root').innerHTML()
    assert(rootHtml.trim().length > 0, '/login #root must not be empty')

    await page.getByRole('button', { name: /administrator/i }).waitFor({ timeout: 10000 })
    await page.getByRole('button', { name: /rukn/i }).waitFor({ timeout: 10000 })

    await page.getByRole('button', { name: /rukn/i }).click()
    await page.getByLabel(/mobile number/i).waitFor({ timeout: 5000 })

    await page.getByRole('button', { name: /administrator/i }).click()
    await page.getByLabel(/email address/i).waitFor({ timeout: 5000 })

    const { refreshFirestoreAfterAuth } = await import('@/repositories/firestore/initialize')
    assert(typeof refreshFirestoreAfterAuth === 'function', 'refreshFirestoreAfterAuth must be exported')

    assert(
      consoleErrors.length === 0,
      `Unexpected page errors during /login render: ${consoleErrors.join('; ')}`,
    )

    console.log('Login render verification passed.')
  } finally {
    await browser.close()
    await server.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
