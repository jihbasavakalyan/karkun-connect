/**
 * Pre-OTP Rukn login eligibility — privileged Admin SDK lookup by mobile.
 * Does not mint JWT claims. Does not list the rukns collection.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleRuknLoginEligibility } from '../src/server/ruknClaims/eligibilityHandler.js'

export const config = {
  includeFiles: ['src/server/ruknClaims/**', 'src/lib/officerIdentity.ts', 'src/lib/officerMobileEligibility.ts'],
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

  const result = await handleRuknLoginEligibility({
    method: req.method,
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
