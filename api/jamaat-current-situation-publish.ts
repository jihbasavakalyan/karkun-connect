/**
 * Trusted publisher for settings/jamaatCurrentSituation + settings/ruknNameDirectory.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleJamaatCurrentSituationPublish } from '../src/server/jamaat/publishHandler.js'

export const config = {
  includeFiles: [
    'src/server/jamaat/**',
    'src/server/ruknClaims/firebaseAdmin.ts',
    'src/lib/jamaat/jamaatSituationMetrics.ts',
  ],
  api: {
    bodyParser: {
      sizeLimit: '4kb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null
  const result = await handleJamaatCurrentSituationPublish({
    method: req.method,
    authorizationHeader:
      typeof req.headers.authorization === 'string' ? req.headers.authorization : null,
    body,
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
