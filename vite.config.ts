import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { digitalRafeeqTtsApiPlugin } from './plugins/vite-tts-api.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveBuildSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA
  if (process.env.VITE_GIT_SHA) return process.env.VITE_GIT_SHA
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), digitalRafeeqTtsApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __KC_BUILD_SHA__: JSON.stringify(resolveBuildSha()),
    __KC_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    // Emit dist/.vite/manifest.json so deploy checks can match hashed chunks to index.html.
    manifest: true,
    assetsDir: 'assets',
  },
})
