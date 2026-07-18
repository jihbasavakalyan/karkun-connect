/**
 * KC-019 — Vercel serverless TTS endpoint.
 * Browser → /api/tts → VoiceService → Google Cloud (credentials stay on server).
 *
 * Note: ESM on Vercel requires explicit `.js` extensions for relative imports,
 * and includeFiles so `src/server/voice` is packaged with the function.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleTtsRequest } from '../src/server/voice/httpHandler.js'

export const config = {
  includeFiles: ['src/server/voice/**'],
  api: {
    bodyParser: {
      sizeLimit: '32kb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const result = await handleTtsRequest({
    method: req.method,
    body: req.body,
  })

  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value)
  }

  if (result.status === 200 && Buffer.isBuffer(result.body)) {
    res.status(200).send(result.body)
    return
  }

  if (result.status === 204) {
    res.status(204).end()
    return
  }

  res.status(result.status).json(result.body)
}
