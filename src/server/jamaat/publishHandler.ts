/**
 * Trusted Jamaat read-model publisher (Firebase Admin SDK).
 * Recomputes from Firestore. Never trusts client counts or generatedAt.
 */

import { getRuknClaimsAdmin } from '../ruknClaims/firebaseAdmin.js'
import {
  computeJamaatSituationCountsFromRecords,
  computeRuknNameDirectoryEntriesFromOfficers,
  type JamaatConnectionMetricRow,
  type JamaatOfficerMetricRow,
  type JamaatPersonMetricRow,
  type JamaatSituationCounts,
} from '../../lib/jamaat/jamaatSituationMetrics.js'

const SITUATION_PATH = 'settings/jamaatCurrentSituation'
const NAMES_PATH = 'settings/ruknNameDirectory'

export type JamaatPublishRequest = {
  method?: string
  authorizationHeader?: string | null
  body?: Record<string, unknown> | null
}

export type JamaatPublishResponse = {
  status: number
  body: Record<string, unknown>
  headers: Record<string, string>
}

export type JamaatPublishSource = {
  officers: JamaatOfficerMetricRow[]
  people: JamaatPersonMetricRow[]
  connections: JamaatConnectionMetricRow[]
}

export type JamaatPublishDeps = {
  verifyIdToken: (token: string) => Promise<unknown>
  loadSource: () => Promise<JamaatPublishSource>
  writeReadModels: (input: {
    generatedAt: string
    counts: JamaatSituationCounts
    names: { generatedAt: string; entries: { id: string; name: string }[] }
  }) => Promise<void>
  nowIso: () => string
}

function json(status: number, body: Record<string, unknown>): JamaatPublishResponse {
  return {
    status,
    body,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  }
}

function asPerson(id: string, data: Record<string, unknown>): JamaatPersonMetricRow {
  return {
    id,
    category: typeof data.category === 'string' ? data.category : undefined,
    isArchived: data.isArchived === true,
    archiveKind: typeof data.archiveKind === 'string' ? data.archiveKind : undefined,
    promotedToARuknId: typeof data.promotedToARuknId === 'string' ? data.promotedToARuknId : undefined,
    aRuknPromotionInProgress: data.aRuknPromotionInProgress === true,
  }
}

function asOfficer(id: string, data: Record<string, unknown>): JamaatOfficerMetricRow {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : undefined,
    officerKind: typeof data.officerKind === 'string' ? data.officerKind : undefined,
  }
}

function asConnection(data: Record<string, unknown>): JamaatConnectionMetricRow {
  return {
    status: typeof data.status === 'string' ? data.status : undefined,
    karkunId: typeof data.karkunId === 'string' ? data.karkunId : undefined,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  }
}

async function defaultLoadSource(): Promise<JamaatPublishSource> {
  const admin = getRuknClaimsAdmin()
  const [ruknsSnap, karkunsSnap, connectionsSnap] = await Promise.all([
    admin.db.collection('rukns').get(),
    admin.db.collection('karkuns').get(),
    admin.db.collection('connections').get(),
  ])
  return {
    officers: ruknsSnap.docs.map((doc) => asOfficer(doc.id, doc.data())),
    people: karkunsSnap.docs.map((doc) => asPerson(doc.id, doc.data())),
    connections: connectionsSnap.docs.map((doc) => asConnection(doc.data())),
  }
}

async function defaultWriteReadModels(input: {
  generatedAt: string
  counts: JamaatSituationCounts
  names: { generatedAt: string; entries: { id: string; name: string }[] }
}): Promise<void> {
  const admin = getRuknClaimsAdmin()
  const batch = admin.db.batch()
  batch.set(admin.db.doc(SITUATION_PATH), {
    rukns: input.counts.rukns,
    aRukns: input.counts.aRukns,
    karkuns: input.counts.karkuns,
    muttafiqeen: input.counts.muttafiqeen,
    connections: input.counts.connections,
    generatedAt: input.generatedAt,
  })
  batch.set(admin.db.doc(NAMES_PATH), {
    generatedAt: input.names.generatedAt,
    entries: input.names.entries,
  })
  await batch.commit()
}

export function createDefaultJamaatPublishDeps(): JamaatPublishDeps {
  return {
    verifyIdToken: async (token) => {
      const admin = getRuknClaimsAdmin()
      return admin.auth.verifyIdToken(token)
    },
    loadSource: defaultLoadSource,
    writeReadModels: defaultWriteReadModels,
    nowIso: () => new Date().toISOString(),
  }
}

export async function handleJamaatCurrentSituationPublish(
  input: JamaatPublishRequest,
  deps: JamaatPublishDeps = createDefaultJamaatPublishDeps(),
): Promise<JamaatPublishResponse> {
  if (input.method === 'OPTIONS') {
    return {
      status: 204,
      body: {},
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    }
  }

  if (input.method && input.method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' })
  }

  const header = input.authorizationHeader?.trim() ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match?.[1]) {
    return json(401, { ok: false, error: 'Missing Authorization Bearer token' })
  }

  let role: string
  try {
    const decoded = await deps.verifyIdToken(match[1])
    const record = decoded && typeof decoded === 'object' ? (decoded as Record<string, unknown>) : {}
    role = String(record.role || '')
  } catch (error) {
    console.error('[jamaat-read-model] token verification failed', {
      module: 'jamaatCurrentSituation',
      operation: 'publish',
      result: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
    return json(401, { ok: false, error: 'Invalid or expired token' })
  }

  if (role !== 'rukn' && role !== 'administrator') {
    return json(403, { ok: false, error: 'Insufficient role to refresh Jamaat situation' })
  }

  void input.body

  try {
    const generatedAt = deps.nowIso()
    const source = await deps.loadSource()
    const counts = computeJamaatSituationCountsFromRecords(source)
    const names = {
      generatedAt,
      entries: computeRuknNameDirectoryEntriesFromOfficers(source.officers),
    }
    await deps.writeReadModels({ generatedAt, counts, names })
    console.info('[jamaat-read-model] trusted publish ok', {
      module: 'jamaatCurrentSituation',
      operation: 'publish',
      result: 'ok',
      generatedAt,
      role,
    })
    return json(200, {
      ok: true,
      generatedAt,
      counts,
    })
  } catch (error) {
    console.error('[jamaat-read-model] trusted publish failed', {
      module: 'jamaatCurrentSituation',
      operation: 'publish',
      result: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
    return json(500, { ok: false, error: 'Jamaat situation refresh failed' })
  }
}
