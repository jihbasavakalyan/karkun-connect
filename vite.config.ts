import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { digitalRafeeqTtsApiPlugin } from './plugins/vite-tts-api.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), digitalRafeeqTtsApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Emit dist/.vite/manifest.json so deploy checks can match hashed chunks to index.html.
    manifest: true,
    assetsDir: 'assets',
  },
})
