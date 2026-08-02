/**
 * KC-039 — PWA wiring smoke (build artifacts + source contracts).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

const root = process.cwd()
const viteConfig = readFileSync(resolve(root, 'vite.config.ts'), 'utf8')
assert(viteConfig.includes('VitePWA'), 'vite-plugin-pwa configured')
assert(viteConfig.includes("short_name: 'KC'"), 'manifest short_name KC')
assert(viteConfig.includes("display: 'standalone'"), 'manifest standalone')
assert(viteConfig.includes('NetworkOnly'), 'API/Firestore network-only caching')

const indexHtml = readFileSync(resolve(root, 'index.html'), 'utf8')
assert(indexHtml.includes('apple-touch-icon'), 'apple-touch-icon link')
assert(indexHtml.includes('theme-color'), 'theme-color meta')
assert(indexHtml.includes('Karkun Connect'), 'app title Karkun Connect')

assert(existsSync(resolve(root, 'public/offline.html')), 'offline.html present')
assert(existsSync(resolve(root, 'public/pwa-icon.svg')), 'branded pwa-icon.svg')

for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
  assert(existsSync(resolve(root, `public/pwa/icon-${size}.png`)), `icon-${size}.png`)
}

const appSrc = readFileSync(resolve(root, 'src/App.tsx'), 'utf8')
assert(appSrc.includes('PwaRuntimeChrome'), 'PwaRuntimeChrome mounted')

const chrome = readFileSync(resolve(root, 'src/components/pwa/PwaRuntimeChrome.tsx'), 'utf8')
assert(chrome.includes('beforeinstallprompt'), 'install prompt listener')
assert(chrome.includes('30 * 24'), '30-day dismiss')
assert(chrome.includes('You are currently offline'), 'offline copy')
assert(chrome.includes('A new version is available'), 'update prompt')

const dist = resolve(root, 'dist')
if (existsSync(dist)) {
  const files = readdirSync(dist)
  const webmanifest = files.find((f) => f.endsWith('.webmanifest') || f === 'manifest.webmanifest')
  assert(Boolean(webmanifest), `dist webmanifest emitted (${webmanifest ?? 'missing'})`)
  assert(
    files.some((f) => f.startsWith('sw') || f.includes('workbox') || f === 'sw.js'),
    'service worker / workbox asset in dist',
  )
} else {
  console.log('SKIP: dist/ not present — run npm run build before full artifact checks')
}

console.log('\nKC-039 PWA verification passed.')
