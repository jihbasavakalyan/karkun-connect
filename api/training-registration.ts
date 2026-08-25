import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleTrainingRegistration } from '../src/server/trainingRegistration/handler.js'

export const config = {
  includeFiles: [
    'src/server/trainingRegistration/**',
    'src/server/ruknClaims/firebaseAdmin.ts',
    'src/lib/publicRegistration/event.ts',
    'src/lib/publicRegistration/types.ts',
    'src/lib/publicRegistration/adminTracking.ts',
    'src/lib/publicRegistration/labels.ts',
  ],
  api: {
    bodyParser: {
      sizeLimit: '32kb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null
  const result = await handleTrainingRegistration({
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
