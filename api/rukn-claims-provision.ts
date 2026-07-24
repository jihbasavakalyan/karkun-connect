/**
 * KC-0100.3 — Provision Rukn JWT claims after first OTP (server-side Admin SDK).
 * KC-0100.5 — GET returns safe Admin credential diagnostics.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleRuknClaimsProvision } from '../src/server/ruknClaims/provisionHandler.js'

export const config = {
  includeFiles: ['src/server/ruknClaims/**', 'src/lib/auth/authPipelineTrace.ts'],
  api: {
    bodyParser: {
      sizeLimit: '4kb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const traceHeader = req.headers['x-kc-trace-id']
  const result = await handleRuknClaimsProvision({
    method: req.method,
    authorizationHeader:
      typeof req.headers.authorization === 'string' ? req.headers.authorization : null,
    traceId: typeof traceHeader === 'string' ? traceHeader : null,
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
