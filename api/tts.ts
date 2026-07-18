/**
 * KC-019 — Vercel serverless TTS endpoint.
 * Browser → /api/tts → VoiceService → Google Cloud (credentials stay on server).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleTtsRequest } from '../src/server/voice/httpHandler'

export const config = {
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
