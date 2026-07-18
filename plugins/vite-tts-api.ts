/**
 * Vite middleware that hosts /api/tts during local development.
 * Production uses Vercel serverless `api/tts.ts`.
 */

import type { Plugin } from 'vite'

async function readJsonBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return { text: raw }
  }
}

export function digitalRafeeqTtsApiPlugin(): Plugin {
  return {
    name: 'digital-rafeeq-tts-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (url !== '/api/tts') {
          next()
          return
        }

        try {
          const { handleTtsRequest } = await server.ssrLoadModule('/src/server/voice/httpHandler.ts')
          const body = req.method === 'POST' ? await readJsonBody(req) : undefined
          const result = await handleTtsRequest({ method: req.method, body })

          for (const [key, value] of Object.entries(result.headers as Record<string, string>)) {
            res.setHeader(key, value)
          }
          res.statusCode = result.status

          if (result.status === 204) {
            res.end()
            return
          }

          if (Buffer.isBuffer(result.body)) {
            res.end(result.body)
            return
          }

          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(result.body))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              error: 'tts_unavailable',
              message: 'آواز دستیاب نہیں، براہ کرم دوبارہ کوشش کریں۔',
              detail: error instanceof Error ? error.message : 'unknown',
            }),
          )
        }
      })
    },
  }
}
