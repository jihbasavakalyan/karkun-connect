/**
 * KC-027 — Vercel serverless STT endpoint.
 * Browser → /api/stt → VoiceService → Google Cloud Speech-to-Text.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleSttRequest } from '../src/server/voice/sttHttpHandler.js'

export const config = {
  includeFiles: ['src/server/voice/**'],
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const result = await handleSttRequest({
    method: req.method,
    body: req.body,
  })

  for (const [key, value] of Object.entries(result.headers)) {
    res.setHeader(key, value)
  }

  if (result.status === 204) {
    res.status(204).end()
    return
  }

  res.status(result.status).json(result.body)
}
