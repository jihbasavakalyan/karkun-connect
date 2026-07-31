/**
 * KC-036 — Master registry mobile existence API (read-only).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleKarkunMobileLookup } from '../src/server/karkunMobileLookup/lookupHandler.js'

export const config = {
  includeFiles: [
    'src/server/karkunMobileLookup/**',
    'src/server/ruknClaims/firebaseAdmin.ts',
  ],
  api: {
    bodyParser: {
      sizeLimit: '4kb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body =
    req.body && typeof req.body === 'object'
      ? (req.body as { mobile?: string })
      : null

  const result = await handleKarkunMobileLookup({
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
