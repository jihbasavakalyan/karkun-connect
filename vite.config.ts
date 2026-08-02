import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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

const pwaIcons = [72, 96, 128, 144, 152, 192, 384, 512].flatMap((size) => [
  {
    src: `/pwa/icon-${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: 'any' as const,
  },
  ...(size === 192 || size === 512
    ? [
        {
          src: `/pwa/icon-${size}.png`,
          sizes: `${size}x${size}`,
          type: 'image/png',
          purpose: 'maskable' as const,
        },
      ]
    : []),
])

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    digitalRafeeqTtsApiPlugin(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'offline.html',
        'pwa-icon.svg',
        'pwa/apple-touch-icon.png',
        'pwa/icon-72.png',
        'pwa/icon-96.png',
        'pwa/icon-128.png',
        'pwa/icon-144.png',
        'pwa/icon-152.png',
        'pwa/icon-192.png',
        'pwa/icon-384.png',
        'pwa/icon-512.png',
      ],
      manifest: {
        id: '/',
        name: 'Karkun Connect',
        short_name: 'KC',
        description: 'Campaign Execution Platform',
        theme_color: '#1b4332',
        background_color: '#1b4332',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['productivity', 'business'],
        icons: pwaIcons,
      },
      workbox: {
        // Pre-cache app shell + hashed assets. Do not cache Firebase/API traffic.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,webp}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/www\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
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
