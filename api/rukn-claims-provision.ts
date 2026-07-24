/**
 * KC-0100.3 — Provision Rukn JWT claims after first OTP (server-side Admin SDK).
 *
 * Browser → POST /api/rukn-claims-provision (Bearer ID token)
 * → verify phone → Active Rukn Master → setCustomUserClaims
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleRuknClaimsProvision } from '../src/server/ruknClaims/provisionHandler.js'

export const config = {
  includeFiles: ['src/server/ruknClaims/**'],
  api: {
    bodyParser: {
      sizeLimit: '4kb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const result = await handleRuknClaimsProvision({
    method: req.method,
    authorizationHeader:
      typeof req.headers.authorization === 'string' ? req.headers.authorization : null,
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
