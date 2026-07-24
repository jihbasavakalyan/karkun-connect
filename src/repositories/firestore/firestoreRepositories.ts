import { MOCK_CAMPAIGNS, type CampaignListItem } from '@/constants/mockMissions'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'
import type { ActivityLogEntry, AssignmentRecord } from '@/types/assignment'
import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import type { FollowUpRecord } from '@/types/followUp'
import type { GuidanceState } from '@/repositories/interfaces/ExecutionRepository'
import type { CommunicationState } from '@/repositories/interfaces/CommunicationRepository'
import type { BaitulMaalRecord } from '@/types/baitulMaal'
import type { IjtemaAttendanceRecord } from '@/types/ijtemaAttendance'
import type { WeeklyIjtemaEvent, WeeklyIjtemaSubmission } from '@/types/weeklyIjtema'
import type { JihPortalState } from '@/repositories/interfaces/ComplianceRepository'
import type { Rukn } from '@/data/ruknMaster'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { DatasetBackup } from '@/types/dataMigration'
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
  type DocumentData,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import { repositoryErr, repositoryOk, type RepositoryResult } from '@/repositories/errors'
import {
  DANGEROUS_CLEAR_BLOCKED_MESSAGE,
  isDangerousRepositoryClearAllowed,
} from '@/lib/preservation/dangerousClearGate'
import type { CampaignRepository } from '@/repositories/interfaces/CampaignRepository'
import type { RuknRepository } from '@/repositories/interfaces/RuknRepository'
import type { KarkunRepository, KarkunRegistryState } from '@/repositories/interfaces/KarkunRepository'
import type {
  AllocationResult,
  ConnectionMetaUpdate,
  ConnectionRepository,
  ConnectionState,
} from '@/repositories/interfaces/ConnectionRepository'
import {
  ASN_REPAIR_VERSION,
  deriveNextSequenceFromRecords,
  findAssignmentNumberCollisions,
  formatAssignmentNumber,
  planAsnCollisionRepair,
} from '@/lib/connections/assignmentNumber'
import {
  ACTIVE_INTEGRITY_VERSION,
  planActiveConnectionIntegrity,
} from '@/lib/connections/activeConnectionIntegrity'
import type { ExecutionRepository } from '@/repositories/interfaces/ExecutionRepository'
import type { CommunicationRepository } from '@/repositories/interfaces/CommunicationRepository'
import type { ComplianceRepository } from '@/repositories/interfaces/ComplianceRepository'
import type {
  BroadcastListRecord,
  MigrationBackupIndexEntry,
  SettingsRepository,
} from '@/repositories/interfaces/SettingsRepository'
import type { NewKarkunRequest } from '@/types/karkunRequest.types'
import { SyncCache } from '@/repositories/firestore/cache'
import {
  FIRESTORE_COLLECTIONS,
  FIRESTORE_DOCS,
  complianceBaitulMaalDocId,
  complianceIjtemaDocId,
  complianceWeeklyIjtemaEventDocId,
  complianceWeeklyIjtemaSubmissionDocId,
  executionAnnexureDocId,
  settingsBackupDocId,
  settingsBroadcastDocId,
} from '@/repositories/firestore/collections'
import {
  commitBatchSetDocuments,
  createBatch,
  mapFirestoreError,
  readCollection,
  readDoc,
  removeDoc,
  sanitizeForFirestore,
  stripMeta,
  writeDoc,
} from '@/repositories/firestore/firestoreHelpers'
import { markPendingWriteComplete, recordFirestoreConflict, trackPendingWrite } from '@/repositories/firestore/offlineSync'
import {
  markRepositoryReadiness,
  traceIncidentStage,
  traceRepositorySnapshot,
  traceSequencedIncidentStage,
} from '@/lib/incidentTraceCollector'
import { canonicalizeConnectionRecords } from '@/lib/connections/canonicalizeConnectionRecords'
import {
  kc00584CaptureAuthBeforeCritical,
  kc00584ProbeCriticalOp,
} from '@/lib/debug/kc00584PermissionProbe'
import { kc004cTraceRegistry } from '@/lib/debug/kc004cRegistryTrace'
import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'

type ConnectionMetaDoc = {
  nextSequence?: number
  asnRepairVersion?: number
  activeIntegrityVersion?: number
}

const campaignCache = new SyncCache<readonly CampaignListItem[]>(MOCK_CAMPAIGNS)
const ruknCache = new SyncCache<Rukn[]>([])
const karkunCache = new SyncCache<KarkunRegistryState>({ karkuns: [], nextKarkunNum: 1 })
const connectionCache = new SyncCache<ConnectionState>({ assignments: [], nextSequence: 1 })
const activityLogCache = new SyncCache<ActivityLogEntry[]>([])
/** KC-0058 — IDs already durable in Firestore (append-only writes skip these). */
const persistedActivityIds = new Set<string>()
const annexureCache = new SyncCache<SubmittedMeetingForm[]>([])
const followUpCache = new SyncCache<FollowUpRecord[]>([])
const guidanceCache = new SyncCache<GuidanceState>({ commitments: [], timelineEvents: [] })
const communicationCache = new SyncCache<CommunicationState | null>(null)
const baitulMaalCache = new SyncCache<BaitulMaalRecord[]>([])
const ijtemaCache = new SyncCache<IjtemaAttendanceRecord[]>([])
const weeklyIjtemaEventCache = new SyncCache<WeeklyIjtemaEvent[]>([])
const weeklyIjtemaSubmissionCache = new SyncCache<WeeklyIjtemaSubmission[]>([])
const jihPortalCache = new SyncCache<JihPortalState>({ registrations: {}, monthlyReports: {} })
const migrationVersionCache = new SyncCache<number | null>(null)
const broadcastCache = new SyncCache<BroadcastListRecord[]>([])
const karkunRequestCache = new SyncCache<NewKarkunRequest[]>([])
const backupIndexCache = new SyncCache<MigrationBackupIndexEntry[]>([])
const backupCache = new SyncCache<Map<string, DatasetBackup>>(new Map())

const snapshotUnsubscribers: Unsubscribe[] = []
let hydrateInFlight: Promise<void> | null = null
let hydrateRequestedWhileRunning = false
/** KC-004B — background-only hydrate; full hydrate awaits this to avoid cache races. */
let backgroundHydrateInFlight: Promise<void> | null = null

markRepositoryReadiness('connection_repository', 'UNINITIALIZED', {
  caller: 'firestoreRepositories.module',
  sourceOfTruth: 'Firestore',
})
markRepositoryReadiness('assignment_repository', 'UNINITIALIZED', {
  caller: 'firestoreRepositories.module',
  sourceOfTruth: 'Firestore',
})

const KC0084_PERSIST_LABELS = new Set([
  'compliance.ijtema',
  'compliance.baitulMaal',
  'compliance.weeklyIjtemaEvents',
  'compliance.weeklyIjtemaSubmissions',
  'executions.annexure',
])

/** KC-0098 — in-flight Firestore write chains + trailing work per label. */
const writeChains = new Map<string, Promise<void>>()
const writeTrailingWork = new Map<string, () => Promise<RepositoryResult<void>>>()

/** KC-0098 — dirty buffers so coalesced dumps never drop concurrent entity updates. */
const pendingAnnexureDirty = new Map<string, SubmittedMeetingForm>()
const pendingBaitulMaalDirty = new Map<string, BaitulMaalRecord>()
const pendingIjtemaDirty = new Map<string, IjtemaAttendanceRecord>()
const pendingWeeklyIjtemaEventDirty = new Map<string, WeeklyIjtemaEvent>()
const pendingWeeklyIjtemaSubmissionDirty = new Map<string, WeeklyIjtemaSubmission>()

async function queueWrite(label: string, work: () => Promise<RepositoryResult<void>>): Promise<void> {
  // KC-0098 — coalesce concurrent identical-label dumps onto one in-flight chain.
  // Latest scheduled work wins; callers that dump dirty sets should accumulate
  // into module pending maps (annexure / ijtema / baitul) before queueWrite.
  writeTrailingWork.set(label, work)
  const existing = writeChains.get(label)
  if (existing) {
    return existing
  }

  const chain = (async () => {
    try {
      for (;;) {
        const next = writeTrailingWork.get(label)
        if (!next) break
        writeTrailingWork.delete(label)
        await executeQueuedWrite(label, next)
      }
    } finally {
      writeChains.delete(label)
      const leftover = writeTrailingWork.get(label)
      if (leftover) {
        void queueWrite(label, leftover)
      }
    }
  })()

  writeChains.set(label, chain)
  return chain
}

async function executeQueuedWrite(
  label: string,
  work: () => Promise<RepositoryResult<void>>,
): Promise<void> {
  const diag = KC0084_PERSIST_LABELS.has(label)
  if (diag) {
    console.info('[KC-0084] Repository Save Started', { label })
  }
  trackPendingWrite()
  try {
    if (diag) {
      console.info('[KC-0084] Firestore Write Started', { label })
    }
    const result = await work()
    if (!result.ok) {
      if (result.error.code === 'Duplicate') {
        recordFirestoreConflict(label, result.error.cause)
      } else {
        // KC-0058.2 / KC-0084 — never swallow permission / storage failures silently.
        console.error(`[firestore:queueWrite:${label}]`, result.error.code, result.error.message, result.error.cause)
        const { emitExecutionPersistFailed } = await import('@/lib/executionPersistEvents')
        emitExecutionPersistFailed(label, result.error)
      }
    } else if (diag) {
      console.info('[KC-0084] Firestore Write Success', { label })
      console.info('[KC-0084] Repository Save Completed', { label })
    }
  } catch (error) {
    console.error(`[firestore:queueWrite:${label}:threw]`, error)
    const { emitExecutionPersistFailed } = await import('@/lib/executionPersistEvents')
    emitExecutionPersistFailed(label, error)
  } finally {
    markPendingWriteComplete()
  }
}

function isPermissionDeniedError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code: string }).code) === 'permission-denied'
  )
}

/** Soft-read: permission denials become null so Rukn hydrate can proceed for admin-only docs. */
async function readDocSoft<T>(
  db: ReturnType<typeof getFirestoreDb>,
  path: string,
  id: string,
): Promise<T | null> {
  try {
    return await readDoc<T>(db, path, id)
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn(`[firestore:hydrate] soft-skip ${path}/${id} (permission-denied)`)
      return null
    }
    throw error
  }
}

async function getDocsSoft(
  query: Parameters<typeof getDocs>[0],
  label: string,
): Promise<{ docs: Awaited<ReturnType<typeof getDocs>>['docs'] }> {
  try {
    return await getDocs(query)
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn(`[firestore:hydrate] soft-skip ${label} (permission-denied)`)
      return { docs: [] }
    }
    throw error
  }
}

type ClientAuthScope = {
  role: string | null
  ruknId: string | null
}

async function resolveClientAuthScope(): Promise<ClientAuthScope> {
  try {
    const user = getFirebaseAuth().currentUser
    if (!user) return { role: null, ruknId: null }
    const token = await user.getIdTokenResult()
    const role = typeof token.claims.role === 'string' ? token.claims.role : null
    const ruknId = typeof token.claims.ruknId === 'string' ? token.claims.ruknId : null
    // KC-0100 — incomplete Rukn JWT must not fall through to admin-wide collection reads.
    if (role === 'rukn' && !ruknId) {
      console.error('[KC-0100] JWT role=rukn but ruknId claim missing — scoped reads will be empty', {
        uid: user.uid,
      })
    }
    return { role, ruknId }
  } catch {
    return { role: null, ruknId: null }
  }
}

/** KC-0100 — Rukn without ruknId must not attempt unfiltered collection gets. */
function isScopedRuknClient(scope: ClientAuthScope): scope is ClientAuthScope & {
  role: 'rukn'
  ruknId: string
} {
  return scope.role === 'rukn' && Boolean(scope.ruknId)
}

type KarkunOwnershipRow = { id: string; assignedRuknId: string }

/** KC-0058.2 / KC-0064 — shared Rukn write scoping for full and targeted karkun commits. */
function filterKarkunsForClientWrite(
  karkuns: readonly KarkunRegistryRecord[],
  scope: ClientAuthScope,
  ownershipSnapshot: readonly KarkunOwnershipRow[],
): KarkunRegistryRecord[] {
  const isRuknClient = scope.role === 'rukn' && Boolean(scope.ruknId)
  if (!isRuknClient) {
    return [...karkuns]
  }
  const previouslyMine = new Set(
    ownershipSnapshot
      .filter((row) => row.assignedRuknId === scope.ruknId)
      .map((row) => row.id),
  )
  return karkuns.filter(
    (karkun) => karkun.assignedRuknId === scope.ruknId || previouslyMine.has(karkun.id),
  )
}

/**
 * KC-0058.2 — Rukn cannot run unfiltered collection gets under document-scoped rules.
 * Load own assigned + Available pool via equality filters that match security rules.
 */
async function readKarkunsForClient(
  db: ReturnType<typeof getFirestoreDb>,
): Promise<KarkunRegistryRecord[]> {
  const scope = await resolveClientAuthScope()
  if (scope.role === 'rukn' && !scope.ruknId) {
    console.error('[KC-0100] readKarkunsForClient blocked — missing ruknId claim')
    return []
  }
  if (isScopedRuknClient(scope)) {
    const [mineSnap, availableSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, FIRESTORE_COLLECTIONS.karkuns),
          where('assignedRuknId', '==', scope.ruknId),
        ),
      ),
      getDocs(
        query(collection(db, FIRESTORE_COLLECTIONS.karkuns), where('assignedRuknId', '==', '')),
      ),
    ])
    const byId = new Map<string, KarkunRegistryRecord>()
    for (const snapshot of [...mineSnap.docs, ...availableSnap.docs]) {
      byId.set(snapshot.id, stripMeta<KarkunRegistryRecord>(snapshot.data()))
    }
    console.info('[KC-0100] readKarkunsForClient', {
      ruknId: scope.ruknId,
      mine: mineSnap.size,
      available: availableSnap.size,
      merged: byId.size,
    })
    return [...byId.values()]
  }
  return readCollection<KarkunRegistryRecord>(db, FIRESTORE_COLLECTIONS.karkuns)
}

async function readConnectionsForClient(
  db: ReturnType<typeof getFirestoreDb>,
): Promise<AssignmentRecord[]> {
  const scope = await resolveClientAuthScope()
  if (scope.role === 'rukn' && !scope.ruknId) {
    console.error('[KC-0100] readConnectionsForClient blocked — missing ruknId claim')
    return []
  }
  if (isScopedRuknClient(scope)) {
    const snap = await getDocs(
      query(
        collection(db, FIRESTORE_COLLECTIONS.connections),
        where('ruknId', '==', scope.ruknId),
      ),
    )
    const rows = snap.docs.map((item) => stripMeta<AssignmentRecord>(item.data()))
    const active = rows.filter((row) => row.status === 'Active').length
    console.info('[KC-0100] readConnectionsForClient', {
      ruknId: scope.ruknId,
      total: rows.length,
      active,
    })
    return rows
  }
  return readCollection<AssignmentRecord>(db, FIRESTORE_COLLECTIONS.connections)
}

async function readRuknsForClient(db: ReturnType<typeof getFirestoreDb>): Promise<Rukn[]> {
  const scope = await resolveClientAuthScope()
  if (scope.role === 'rukn' && !scope.ruknId) {
    console.error('[KC-0100] readRuknsForClient blocked — missing ruknId claim')
    return []
  }
  if (isScopedRuknClient(scope)) {
    // Critical-path hard read — missing doc is empty; permission-denied must throw.
    const own = await readDoc<Rukn>(db, FIRESTORE_COLLECTIONS.rukns, scope.ruknId)
    return own ? [own] : []
  }
  return readCollection<Rukn>(db, FIRESTORE_COLLECTIONS.rukns)
}

async function readActivityLogsForClient(
  db: ReturnType<typeof getFirestoreDb>,
): Promise<ActivityLogEntry[]> {
  const scope = await resolveClientAuthScope()
  if (scope.role === 'rukn' && !scope.ruknId) {
    return []
  }
  if (isScopedRuknClient(scope)) {
    try {
      const snap = await getDocs(
        query(
          collection(db, FIRESTORE_COLLECTIONS.activityLogs),
          where('ruknId', '==', scope.ruknId),
        ),
      )
      return snap.docs.map((item) => stripMeta<ActivityLogEntry>(item.data()))
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        console.warn('[firestore:hydrate] soft-skip activityLogs (permission-denied)')
        return []
      }
      throw error
    }
  }
  try {
    return await readCollection<ActivityLogEntry>(db, FIRESTORE_COLLECTIONS.activityLogs)
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn('[firestore:hydrate] soft-skip activityLogs (permission-denied)')
      return []
    }
    throw error
  }
}

async function readFollowUpsForClient(
  db: ReturnType<typeof getFirestoreDb>,
): Promise<FollowUpRecord[]> {
  const scope = await resolveClientAuthScope()
  if (scope.role === 'rukn' && !scope.ruknId) {
    return []
  }
  if (isScopedRuknClient(scope)) {
    try {
      const snap = await getDocs(
        query(
          collection(db, FIRESTORE_COLLECTIONS.followUps),
          where('ruknId', '==', scope.ruknId),
        ),
      )
      return snap.docs.map((item) => stripMeta<FollowUpRecord>(item.data()))
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        console.warn('[firestore:hydrate] soft-skip followUps (permission-denied)')
        return []
      }
      throw error
    }
  }
  try {
    return await readCollection<FollowUpRecord>(db, FIRESTORE_COLLECTIONS.followUps)
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn('[firestore:hydrate] soft-skip followUps (permission-denied)')
      return []
    }
    throw error
  }
}

async function applyCriticalHydratePayload(input: {
  campaigns: CampaignListItem[]
  rukns: Rukn[]
  karkuns: KarkunRegistryRecord[]
  karkunCounter: { nextKarkunNum: number } | null
  assignments: AssignmentRecord[]
  connectionMeta: ConnectionMetaDoc | null
}): Promise<void> {
  const {
    campaigns,
    rukns,
    karkuns,
    karkunCounter,
    assignments,
    connectionMeta,
  } = input

  if (campaigns.length > 0) {
    campaignCache.set(campaigns)
  } else {
    campaignCache.set(MOCK_CAMPAIGNS)
  }

  ruknCache.set(rukns)
  kc004cTraceRegistry({
    caller: 'applyCriticalHydratePayload',
    phase: 'before-karkunCache.set',
    before: karkunCache.get().karkuns.length,
    firestoreCount: karkuns.length,
  })
  karkunCache.set({
    karkuns,
    nextKarkunNum: karkunCounter?.nextKarkunNum ?? 1,
  })
  kc004cTraceRegistry({
    caller: 'applyCriticalHydratePayload',
    phase: 'after-karkunCache.set',
    firestoreCount: karkuns.length,
    after: karkunCache.get().karkuns.length,
    extra: { nextKarkunNum: karkunCounter?.nextKarkunNum ?? 1 },
  })

  const { records: identityCanonical, duplicates: connectionDuplicates } =
    canonicalizeConnectionRecords(assignments)
  if (connectionDuplicates.length > 0) {
    console.warn(
      '[KC-002] assignmentId duplicates collapsed at Firestore hydrate',
      connectionDuplicates,
    )
  }

  const metaNext = connectionMeta?.nextSequence ?? 1
  const repairVersion = connectionMeta?.asnRepairVersion ?? 0
  const asnCollisions = findAssignmentNumberCollisions(identityCanonical)
  let hydratedAssignments = identityCanonical
  const derivedSequence = deriveNextSequenceFromRecords(identityCanonical)
  let nextSequence = Math.max(metaNext, derivedSequence)

  if (asnCollisions.length > 0 && repairVersion < ASN_REPAIR_VERSION) {
    const planned = planAsnCollisionRepair(identityCanonical, nextSequence)
    hydratedAssignments = planned.records
    nextSequence = planned.report.nextSequence
    console.warn('[KC-002] repairing duplicate assignmentNumbers at hydrate', {
      collisionGroups: planned.report.collisionGroups,
      reassigned: planned.report.reassigned,
      nextSequence: planned.report.nextSequence,
    })
    void queueWrite('connections-asn-repair', async () => {
      const repairDb = getFirestoreDb()
      const batch = createBatch(repairDb)
      for (const assignment of planned.records) {
        batch.set(
          doc(repairDb, FIRESTORE_COLLECTIONS.connections, assignment.assignmentId),
          sanitizeForFirestore(assignment),
        )
      }
      batch.set(
        doc(repairDb, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.connectionMeta),
        sanitizeForFirestore({
          nextSequence: planned.report.nextSequence,
          asnRepairVersion: ASN_REPAIR_VERSION,
          activeIntegrityVersion: connectionMeta?.activeIntegrityVersion ?? 0,
        }),
        { merge: true },
      )
      await batch.commit()
      return repositoryOk(undefined)
    })
  } else if (asnCollisions.length > 0) {
    console.warn('[KC-002] assignmentNumber collisions remain after prior repair version', asnCollisions)
  }

  const activeIntegrityVersion = connectionMeta?.activeIntegrityVersion ?? 0
  const activeIntegrity = planActiveConnectionIntegrity(hydratedAssignments)
  if (
    activeIntegrity.needsWrite &&
    (activeIntegrityVersion < ACTIVE_INTEGRITY_VERSION || activeIntegrity.report.superseded > 0)
  ) {
    hydratedAssignments = activeIntegrity.records
    console.warn('[KC-003] superseding duplicate Active connections at hydrate', {
      groupsRepaired: activeIntegrity.report.groupsRepaired,
      superseded: activeIntegrity.report.superseded,
      changes: activeIntegrity.report.changes,
    })
    void queueWrite('connections-active-integrity', async () => {
      const repairDb = getFirestoreDb()
      const batch = createBatch(repairDb)
      for (const change of activeIntegrity.report.changes) {
        const record = activeIntegrity.records.find((item) => item.assignmentId === change.assignmentId)
        if (!record) continue
        batch.set(
          doc(repairDb, FIRESTORE_COLLECTIONS.connections, record.assignmentId),
          sanitizeForFirestore(record),
        )
      }
      batch.set(
        doc(repairDb, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.connectionMeta),
        sanitizeForFirestore({
          nextSequence,
          asnRepairVersion: Math.max(repairVersion, ASN_REPAIR_VERSION),
          activeIntegrityVersion: ACTIVE_INTEGRITY_VERSION,
        }),
        { merge: true },
      )
      await batch.commit()
      return repositoryOk(undefined)
    })
  }

  connectionCache.set({
    assignments: hydratedAssignments,
    nextSequence,
  })
  traceSequencedIncidentStage('repository_cache_update_complete', {
    connectionCount: hydratedAssignments.length,
    assignmentCount: hydratedAssignments.length,
    sourceOfTruth: 'Firestore',
    duplicatesCanonicalized: connectionDuplicates.length,
    asnCollisions: asnCollisions.length,
  })
  markRepositoryReadiness(
    'connection_repository',
    hydratedAssignments.length > 0 ? 'LOADED' : 'LOADED_EMPTY',
    {
      caller: 'hydrateFirestoreCachesOnce',
      sourceOfTruth: 'Firestore',
    },
  )
  markRepositoryReadiness(
    'assignment_repository',
    hydratedAssignments.length > 0 ? 'LOADED' : 'LOADED_EMPTY',
    {
      caller: 'hydrateFirestoreCachesOnce',
      sourceOfTruth: 'Firestore',
    },
  )
  traceRepositorySnapshot('connection_repository', {
    caller: 'hydrateFirestoreCachesOnce',
    sourceOfTruth: 'Firestore',
    connectionCount: hydratedAssignments.length,
    assignmentCount: hydratedAssignments.length,
    nextSequence,
  })
}

function applyBackgroundHydratePayload(input: {
  activityLogs: ActivityLogEntry[]
  executionSnapshots: { docs: Awaited<ReturnType<typeof getDocs>>['docs'] }
  followUps: FollowUpRecord[]
  communication: CommunicationState | null
  complianceSnapshots: { docs: Awaited<ReturnType<typeof getDocs>>['docs'] }
  migrationVersion: { version: number | null } | null
  settingsSnapshots: { docs: Awaited<ReturnType<typeof getDocs>>['docs'] }
}): void {
  const {
    activityLogs,
    executionSnapshots,
    followUps,
    communication,
    complianceSnapshots,
    migrationVersion,
    settingsSnapshots,
  } = input

  activityLogCache.set(activityLogs)
  for (const entry of activityLogs) {
    persistedActivityIds.add(entry.id)
  }

  const annexureForms: SubmittedMeetingForm[] = []
  let guidance: GuidanceState | null = null
  for (const snapshot of executionSnapshots.docs) {
    if (snapshot.id === FIRESTORE_DOCS.guidanceState) {
      guidance = stripMeta<GuidanceState>(snapshot.data() as DocumentData)
      continue
    }
    if (snapshot.id.startsWith('annexure_')) {
      annexureForms.push(stripMeta<SubmittedMeetingForm>(snapshot.data() as DocumentData))
    }
  }
  annexureCache.set(annexureForms)
  followUpCache.set(followUps)
  guidanceCache.set(guidance ?? { commitments: [], timelineEvents: [] })
  if (communication) {
    communicationCache.set(communication)
  }

  const baitulMaal: BaitulMaalRecord[] = []
  const ijtema: IjtemaAttendanceRecord[] = []
  const weeklyIjtemaEvents: WeeklyIjtemaEvent[] = []
  const weeklyIjtemaSubmissions: WeeklyIjtemaSubmission[] = []
  let jihPortal: JihPortalState | null = null
  for (const snapshot of complianceSnapshots.docs) {
    const data = snapshot.data() as DocumentRecord
    if (data._docType === 'baitulMaal') {
      baitulMaal.push(data.record as BaitulMaalRecord)
    } else if (data._docType === 'ijtema') {
      ijtema.push(data.record as IjtemaAttendanceRecord)
    } else if (data._docType === 'weeklyIjtemaEvent') {
      weeklyIjtemaEvents.push(data.record as WeeklyIjtemaEvent)
    } else if (data._docType === 'weeklyIjtemaSubmission') {
      weeklyIjtemaSubmissions.push(data.record as WeeklyIjtemaSubmission)
    } else if (data._docType === 'jihPortal') {
      jihPortal = normalizeJihPortalState(data.record)
    }
  }
  baitulMaalCache.set(baitulMaal)
  ijtemaCache.set(ijtema)
  weeklyIjtemaEventCache.set(weeklyIjtemaEvents)
  weeklyIjtemaSubmissionCache.set(weeklyIjtemaSubmissions)
  if (jihPortal) {
    jihPortalCache.set(jihPortal)
  }

  migrationVersionCache.set(migrationVersion?.version ?? null)
  kc004cTraceRegistry({
    caller: 'applyBackgroundHydratePayload',
    phase: 'migrationVersion-applied',
    migrationVersion: migrationVersion?.version ?? null,
    extra: {
      note: 'Too late if runProductionDataMigration already decided using null version',
    },
  })

  const broadcastLists: BroadcastListRecord[] = []
  let backupIndex: MigrationBackupIndexEntry[] = []
  let karkunRequests: NewKarkunRequest[] = []
  const backupMap = new Map<string, DatasetBackup>()
  for (const snapshot of settingsSnapshots.docs) {
    if (snapshot.id.startsWith('broadcast_')) {
      broadcastLists.push(stripMeta<BroadcastListRecord>(snapshot.data() as DocumentData))
      continue
    }
    if (snapshot.id.startsWith('backup_')) {
      const backup = stripMeta<DatasetBackup>(snapshot.data() as DocumentData)
      if (backup.id) {
        backupMap.set(backup.id, backup)
      }
      continue
    }
    if (snapshot.id === FIRESTORE_DOCS.backupIndex) {
      backupIndex = (snapshot.data() as { entries: MigrationBackupIndexEntry[] }).entries ?? []
    }
    if (snapshot.id === FIRESTORE_DOCS.karkunRequests) {
      karkunRequests =
        (snapshot.data() as { requests: NewKarkunRequest[] }).requests ?? []
    }
  }
  broadcastCache.set(broadcastLists)
  backupIndexCache.set(backupIndex)
  backupCache.set(backupMap)
  karkunRequestCache.set(karkunRequests)
}

function markConnectionRepositoriesLoading(caller: string): void {
  markRepositoryReadiness('connection_repository', 'LOADING', {
    caller,
    reason: 'reading connections collection',
    sourceOfTruth: 'Firestore',
  })
  markRepositoryReadiness('assignment_repository', 'LOADING', {
    caller,
    reason: 'reading connections collection',
    sourceOfTruth: 'Firestore',
  })
}

function markConnectionRepositoriesFailed(caller: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  markRepositoryReadiness('connection_repository', 'FAILED', {
    caller,
    sourceOfTruth: 'Firestore',
    error: message,
  })
  markRepositoryReadiness('assignment_repository', 'FAILED', {
    caller,
    sourceOfTruth: 'Firestore',
    error: message,
  })
}

function readCriticalHydratePayload(db: ReturnType<typeof getFirestoreDb>) {
  // KC-0058.3 — critical path hard-fails. Soft reads are forbidden here.
  // KC-0058.4 — probe wraps each op (behavior unchanged: still fail-fast via Promise.all).
  return (async () => {
    const scope = await resolveClientAuthScope()
    await kc00584CaptureAuthBeforeCritical(scope)
    markStartupLifecycle('firestore.first_critical_read.start', {
      role: scope.role,
      ruknId: scope.ruknId,
    })

    const [
      campaigns,
      rukns,
      karkuns,
      karkunCounter,
      assignments,
      connectionMeta,
    ] = await Promise.all([
      kc00584ProbeCriticalOp({
        label: 'critical.campaigns',
        repository: 'CampaignFirestoreRepository / hydrate',
        method: 'readCollection(campaigns)',
        firestoreApi: 'getDocs',
        collection: FIRESTORE_COLLECTIONS.campaigns,
        query: `collection(db, "${FIRESTORE_COLLECTIONS.campaigns}")`,
        run: () => readCollection<CampaignListItem>(db, FIRESTORE_COLLECTIONS.campaigns),
      }),
      kc00584ProbeCriticalOp({
        label: 'critical.rukns',
        repository: 'RuknFirestoreRepository / hydrate',
        method: 'readRuknsForClient()',
        firestoreApi: scope.role === 'rukn' ? 'getDoc' : 'getDocs',
        collection: FIRESTORE_COLLECTIONS.rukns,
        query:
          scope.role === 'rukn' && scope.ruknId
            ? `doc(db, "rukns", "${scope.ruknId}")`
            : `collection(db, "${FIRESTORE_COLLECTIONS.rukns}")`,
        documentPath:
          scope.role === 'rukn' && scope.ruknId ? `rukns/${scope.ruknId}` : null,
        run: () => readRuknsForClient(db),
      }),
      kc00584ProbeCriticalOp({
        label: 'critical.karkuns',
        repository: 'KarkunFirestoreRepository / hydrate',
        method: 'readKarkunsForClient()',
        firestoreApi: 'getDocs',
        collection: FIRESTORE_COLLECTIONS.karkuns,
        query:
          scope.role === 'rukn' && scope.ruknId
            ? `where assignedRuknId=="${scope.ruknId}" OR assignedRuknId==""`
            : `collection(db, "${FIRESTORE_COLLECTIONS.karkuns}")`,
        run: () => readKarkunsForClient(db),
      }),
      kc00584ProbeCriticalOp({
        label: 'critical.settings.karkunCounter',
        repository: 'Settings / hydrate',
        method: 'readDoc(karkunCounter)',
        firestoreApi: 'getDoc',
        collection: FIRESTORE_COLLECTIONS.settings,
        query: `doc(db, "settings", "${FIRESTORE_DOCS.karkunCounter}")`,
        documentPath: `${FIRESTORE_COLLECTIONS.settings}/${FIRESTORE_DOCS.karkunCounter}`,
        run: () =>
          readDoc<{ nextKarkunNum: number }>(
            db,
            FIRESTORE_COLLECTIONS.settings,
            FIRESTORE_DOCS.karkunCounter,
          ),
      }),
      kc00584ProbeCriticalOp({
        label: 'critical.connections',
        repository: 'ConnectionFirestoreRepository / hydrate',
        method: 'readConnectionsForClient()',
        firestoreApi: 'getDocs',
        collection: FIRESTORE_COLLECTIONS.connections,
        query:
          scope.role === 'rukn' && scope.ruknId
            ? `where ruknId=="${scope.ruknId}"`
            : `collection(db, "${FIRESTORE_COLLECTIONS.connections}")`,
        run: () => readConnectionsForClient(db),
      }),
      kc00584ProbeCriticalOp({
        label: 'critical.settings.connectionMeta',
        repository: 'Settings / hydrate',
        method: 'readDoc(connectionMeta)',
        firestoreApi: 'getDoc',
        collection: FIRESTORE_COLLECTIONS.settings,
        query: `doc(db, "settings", "${FIRESTORE_DOCS.connectionMeta}")`,
        documentPath: `${FIRESTORE_COLLECTIONS.settings}/${FIRESTORE_DOCS.connectionMeta}`,
        run: () =>
          readDoc<ConnectionMetaDoc>(
            db,
            FIRESTORE_COLLECTIONS.settings,
            FIRESTORE_DOCS.connectionMeta,
          ),
      }),
    ])

    markStartupLifecycle('firestore.first_critical_read.complete', {
      connectionCount: Array.isArray(assignments) ? assignments.length : 0,
    })

    return {
      campaigns,
      rukns,
      karkuns,
      karkunCounter,
      assignments,
      connectionMeta,
    }
  })()
}

function readBackgroundHydratePayload(db: ReturnType<typeof getFirestoreDb>) {
  return Promise.all([
    readActivityLogsForClient(db),
    getDocsSoft(collection(db, FIRESTORE_COLLECTIONS.executions), 'executions'),
    readFollowUpsForClient(db),
    readDocSoft<CommunicationState>(db, FIRESTORE_COLLECTIONS.communications, FIRESTORE_DOCS.communicationState),
    getDocsSoft(collection(db, FIRESTORE_COLLECTIONS.compliance), 'compliance'),
    readDocSoft<{ version: number | null }>(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.migrationVersion),
    getDocsSoft(collection(db, FIRESTORE_COLLECTIONS.settings), 'settings'),
  ]).then(
    ([
      activityLogs,
      executionSnapshots,
      followUps,
      communication,
      complianceSnapshots,
      migrationVersion,
      settingsSnapshots,
    ]) => ({
      activityLogs,
      executionSnapshots,
      followUps,
      communication,
      complianceSnapshots,
      migrationVersion,
      settingsSnapshots,
    }),
  )
}

export type PhasedStartupHydrateHandle = {
  /** Resolves when critical collections are read + applied. */
  critical: Promise<void>
  /** Resolves when background collections are read + applied (started in parallel with critical). */
  background: Promise<void>
}

/**
 * KC-004B — start critical + background Firestore reads in parallel.
 * Await `critical` to unlock ProtectedRoute; await `background` before listeners.
 * Each collection is read once (no duplicate getDocs).
 */
export function beginPhasedStartupHydrate(): PhasedStartupHydrateHandle {
  if (backgroundHydrateInFlight || hydrateInFlight) {
    const shared = hydrateInFlight ?? backgroundHydrateInFlight!
    return {
      critical: shared,
      background: shared,
    }
  }

  traceIncidentStage('beginPhasedStartupHydrate:start', {
    caller: 'beginPhasedStartupHydrate',
    sourceOfTruth: 'Firestore',
  })
  markConnectionRepositoriesLoading('beginPhasedStartupHydrate')

  const db = getFirestoreDb()
  const criticalReads = readCriticalHydratePayload(db)
  const backgroundReads = readBackgroundHydratePayload(db)

  const critical = (async () => {
    try {
      const payload = await criticalReads
      await applyCriticalHydratePayload(payload)
      traceIncidentStage('hydrateCriticalFirestoreCaches:complete', {
        caller: 'beginPhasedStartupHydrate',
        sourceOfTruth: 'Firestore',
        connectionCount: payload.assignments.length,
      })
    } catch (error) {
      markConnectionRepositoriesFailed('beginPhasedStartupHydrate', error)
      traceIncidentStage('hydrateCriticalFirestoreCaches:failed', {
        caller: 'beginPhasedStartupHydrate',
        sourceOfTruth: 'Firestore',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })()

  const background = (async () => {
    try {
      const payload = await backgroundReads
      applyBackgroundHydratePayload(payload)
      traceIncidentStage('hydrateBackgroundFirestoreCaches:complete', {
        caller: 'beginPhasedStartupHydrate',
        sourceOfTruth: 'Firestore',
      })
    } catch (error) {
      traceIncidentStage('hydrateBackgroundFirestoreCaches:failed', {
        caller: 'beginPhasedStartupHydrate',
        sourceOfTruth: 'Firestore',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })()

  backgroundHydrateInFlight = background.finally(() => {
    backgroundHydrateInFlight = null
  })

  return { critical, background }
}

/** KC-004B — collections required before ProtectedRoute / dashboard gate. */
export async function hydrateCriticalFirestoreCaches(): Promise<void> {
  const { critical } = beginPhasedStartupHydrate()
  await critical
}

/** KC-004B — non-blocking collections; must not gate dashboard render. */
export async function hydrateBackgroundFirestoreCaches(): Promise<void> {
  if (backgroundHydrateInFlight) {
    return backgroundHydrateInFlight
  }
  if (hydrateInFlight) {
    return hydrateInFlight
  }
  const { background } = beginPhasedStartupHydrate()
  return background
}

async function hydrateFirestoreCachesOnce(): Promise<void> {
  traceIncidentStage('hydrateFirestoreCachesOnce:start', {
    caller: 'hydrateFirestoreCachesOnce',
    sourceOfTruth: 'Firestore',
  })
  markConnectionRepositoriesLoading('hydrateFirestoreCachesOnce')

  try {
    const db = getFirestoreDb()
    const [
      campaigns,
      rukns,
      karkuns,
      karkunCounter,
      assignments,
      connectionMeta,
      activityLogs,
      executionSnapshots,
      followUps,
      communication,
      complianceSnapshots,
      migrationVersion,
      settingsSnapshots,
    ] = await Promise.all([
      readCollection<CampaignListItem>(db, FIRESTORE_COLLECTIONS.campaigns),
      readRuknsForClient(db),
      readKarkunsForClient(db),
      // Critical collections — hard-fail (KC-0058.3). Soft only for optional below.
      readDoc<{ nextKarkunNum: number }>(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.karkunCounter),
      readConnectionsForClient(db),
      readDoc<ConnectionMetaDoc>(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.connectionMeta),
      readActivityLogsForClient(db),
      getDocsSoft(collection(db, FIRESTORE_COLLECTIONS.executions), 'executions'),
      readFollowUpsForClient(db),
      readDocSoft<CommunicationState>(db, FIRESTORE_COLLECTIONS.communications, FIRESTORE_DOCS.communicationState),
      getDocsSoft(collection(db, FIRESTORE_COLLECTIONS.compliance), 'compliance'),
      readDocSoft<{ version: number | null }>(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.migrationVersion),
      getDocsSoft(collection(db, FIRESTORE_COLLECTIONS.settings), 'settings'),
    ])

    await applyCriticalHydratePayload({
      campaigns,
      rukns,
      karkuns,
      karkunCounter,
      assignments,
      connectionMeta,
    })
    applyBackgroundHydratePayload({
      activityLogs,
      executionSnapshots,
      followUps,
      communication,
      complianceSnapshots,
      migrationVersion,
      settingsSnapshots,
    })
    traceIncidentStage('hydrateFirestoreCachesOnce:complete', {
      caller: 'hydrateFirestoreCachesOnce',
      sourceOfTruth: 'Firestore',
      connectionCount: assignments.length,
    })
  } catch (error) {
    markConnectionRepositoriesFailed('hydrateFirestoreCachesOnce', error)
    traceIncidentStage('hydrateFirestoreCachesOnce:failed', {
      caller: 'hydrateFirestoreCachesOnce',
      sourceOfTruth: 'Firestore',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export async function hydrateFirestoreCaches(): Promise<void> {
  traceIncidentStage('hydrateFirestoreCaches:enter', {
    caller: 'hydrateFirestoreCaches',
    sourceOfTruth: 'Firestore',
  })
  // Avoid racing a phased background hydrate (different cache writers).
  if (backgroundHydrateInFlight) {
    try {
      await backgroundHydrateInFlight
    } catch {
      // Full hydrate will re-read; surface errors from the full path.
    }
  }
  if (hydrateInFlight) {
    hydrateRequestedWhileRunning = true
    traceIncidentStage('hydrateFirestoreCaches:already_in_flight', {
      caller: 'hydrateFirestoreCaches',
      sourceOfTruth: 'Firestore',
    })
    return hydrateInFlight
  }

  hydrateInFlight = (async () => {
    do {
      hydrateRequestedWhileRunning = false
      await hydrateFirestoreCachesOnce()
    } while (hydrateRequestedWhileRunning)
  })().finally(() => {
    hydrateInFlight = null
  })

  return hydrateInFlight
}

type DocumentRecord = {
  _docType:
    | 'baitulMaal'
    | 'ijtema'
    | 'jihPortal'
    | 'weeklyIjtemaEvent'
    | 'weeklyIjtemaSubmission'
  record: unknown
}

function normalizePersistedMap<T>(value: unknown): Record<string, T> {
  if (Array.isArray(value)) {
    const result: Record<string, T> = {}
    for (const entry of value) {
      if (Array.isArray(entry) && typeof entry[0] === 'string') {
        result[entry[0]] = entry[1] as T
      }
    }
    return result
  }

  if (value && typeof value === 'object') {
    return { ...(value as Record<string, T>) }
  }

  return {}
}

function normalizeJihPortalState(value: unknown): JihPortalState {
  const state = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    registrations: normalizePersistedMap(state.registrations),
    monthlyReports: normalizePersistedMap(state.monthlyReports),
  }
}

export function startFirestoreSnapshotListeners(onRemoteChange: () => void): void {
  traceIncidentStage('startFirestoreSnapshotListeners:enter', {
    caller: 'startFirestoreSnapshotListeners',
    sourceOfTruth: 'Snapshot Listener',
  })
  stopFirestoreSnapshotListeners()
  const db = getFirestoreDb()

  // KC-027G: each onSnapshot fires once immediately with current server/cache
  // data. That initial burst must NOT trigger a full hydrate+store rebuild —
  // startup already hydrated. Only subsequent remote changes refresh stores.
  const seenInitialSnapshot = new Set<string>()

  const watchCollection = (path: string, handler: () => void) => {
    snapshotUnsubscribers.push(
      onSnapshot(collection(db, path), () => {
        if (!seenInitialSnapshot.has(path)) {
          seenInitialSnapshot.add(path)
          traceIncidentStage('snapshot_listener:initial_suppressed', {
            caller: 'onSnapshot',
            sourceOfTruth: 'Snapshot Listener',
            path,
          })
          return
        }
        traceIncidentStage('snapshot_listener:fired', {
          caller: 'onSnapshot',
          sourceOfTruth: 'Snapshot Listener',
          path,
        })
        handler()
      }),
    )
  }

  const watchQuery = (label: string, q: Query, handler: () => void) => {
    snapshotUnsubscribers.push(
      onSnapshot(q, () => {
        if (!seenInitialSnapshot.has(label)) {
          seenInitialSnapshot.add(label)
          traceIncidentStage('snapshot_listener:initial_suppressed', {
            caller: 'onSnapshot',
            sourceOfTruth: 'Snapshot Listener',
            path: label,
          })
          return
        }
        traceIncidentStage('snapshot_listener:fired', {
          caller: 'onSnapshot',
          sourceOfTruth: 'Snapshot Listener',
          path: label,
        })
        handler()
      }),
    )
  }

  void (async () => {
    const scope = await resolveClientAuthScope()
    if (scope.role === 'rukn' && scope.ruknId) {
      // KC-0058.2 — listeners must match document-scoped rules (no unfiltered gets).
      watchQuery(
        `connections:rukn:${scope.ruknId}`,
        query(
          collection(db, FIRESTORE_COLLECTIONS.connections),
          where('ruknId', '==', scope.ruknId),
        ),
        onRemoteChange,
      )
      watchQuery(
        `karkuns:mine:${scope.ruknId}`,
        query(
          collection(db, FIRESTORE_COLLECTIONS.karkuns),
          where('assignedRuknId', '==', scope.ruknId),
        ),
        onRemoteChange,
      )
      watchQuery(
        'karkuns:available',
        query(collection(db, FIRESTORE_COLLECTIONS.karkuns), where('assignedRuknId', '==', '')),
        onRemoteChange,
      )
      watchQuery(
        `activityLogs:rukn:${scope.ruknId}`,
        query(
          collection(db, FIRESTORE_COLLECTIONS.activityLogs),
          where('ruknId', '==', scope.ruknId),
        ),
        onRemoteChange,
      )
      watchQuery(
        `followUps:rukn:${scope.ruknId}`,
        query(
          collection(db, FIRESTORE_COLLECTIONS.followUps),
          where('ruknId', '==', scope.ruknId),
        ),
        onRemoteChange,
      )
      watchCollection(FIRESTORE_COLLECTIONS.executions, onRemoteChange)
      watchCollection(FIRESTORE_COLLECTIONS.compliance, onRemoteChange)
      return
    }

    watchCollection(FIRESTORE_COLLECTIONS.connections, onRemoteChange)
    watchCollection(FIRESTORE_COLLECTIONS.karkuns, onRemoteChange)
    watchCollection(FIRESTORE_COLLECTIONS.rukns, onRemoteChange)
    watchCollection(FIRESTORE_COLLECTIONS.activityLogs, onRemoteChange)
    watchCollection(FIRESTORE_COLLECTIONS.followUps, onRemoteChange)
    watchCollection(FIRESTORE_COLLECTIONS.executions, onRemoteChange)
    watchCollection(FIRESTORE_COLLECTIONS.compliance, onRemoteChange)
    watchCollection(FIRESTORE_COLLECTIONS.communications, onRemoteChange)
    watchCollection(FIRESTORE_COLLECTIONS.settings, onRemoteChange)
  })()
}

export function stopFirestoreSnapshotListeners(): void {
  while (snapshotUnsubscribers.length > 0) {
    snapshotUnsubscribers.pop()?.()
  }
}

export function subscribeToFirestoreCacheChanges(listener: () => void): () => void {
  const unsubs = [
    connectionCache.subscribe(listener),
    karkunCache.subscribe(listener),
    ruknCache.subscribe(listener),
    annexureCache.subscribe(listener),
    followUpCache.subscribe(listener),
    guidanceCache.subscribe(listener),
    communicationCache.subscribe(listener),
    baitulMaalCache.subscribe(listener),
    ijtemaCache.subscribe(listener),
    weeklyIjtemaEventCache.subscribe(listener),
    weeklyIjtemaSubmissionCache.subscribe(listener),
    jihPortalCache.subscribe(listener),
    activityLogCache.subscribe(listener),
    broadcastCache.subscribe(listener),
    karkunRequestCache.subscribe(listener),
  ]
  return () => unsubs.forEach((unsub) => unsub())
}

export class CampaignFirestoreRepository implements CampaignRepository {
  getAll(): RepositoryResult<readonly CampaignListItem[]> {
    return repositoryOk(campaignCache.get())
  }

  getById(id: string): RepositoryResult<CampaignListItem | undefined> {
    return repositoryOk(campaignCache.get().find((campaign) => campaign.id === id))
  }

  getActive(): RepositoryResult<CampaignListItem | undefined> {
    return repositoryOk(campaignCache.get().find((campaign) => campaign.id === ACTIVE_CAMPAIGN_ID))
  }
}

export class RuknFirestoreRepository implements RuknRepository {
  loadAll(): RepositoryResult<Rukn[]> {
    return repositoryOk([...ruknCache.get()])
  }

  saveAll(rukns: Rukn[]): RepositoryResult<void> {
    ruknCache.set([...rukns])
    void queueWrite('rukns', async () => {
      const scope = await resolveClientAuthScope()
      // KC-0086 — /rukns writes are administrator-only. Rukn clients must not
      // attempt a full-collection rewrite (permission-denied + false Save failure).
      if (scope.role === 'rukn') {
        console.info('[KC-0086] Skipping rukn.saveAll for Rukn client')
        return repositoryOk(undefined)
      }
      const db = getFirestoreDb()
      const writes = rukns.map((rukn) => ({
        path: FIRESTORE_COLLECTIONS.rukns,
        id: rukn.id,
        data: rukn,
      }))
      return commitBatchSetDocuments(db, writes)
    })
    return repositoryOk(undefined)
  }

  /** KC-0064 — awaited upsert of specific rukn docs (no full-collection rewrite). */
  async commitRuknDocuments(rukns: readonly Rukn[]): Promise<RepositoryResult<void>> {
    try {
      if (rukns.length === 0) {
        return repositoryOk(undefined)
      }
      const db = getFirestoreDb()
      const cached = ruknCache.get()
      const byId = new Map(cached.map((rukn) => [rukn.id, rukn]))
      for (const rukn of rukns) {
        byId.set(rukn.id, rukn)
      }
      trackPendingWrite()
      try {
        const writes = rukns.map((rukn) => ({
          path: FIRESTORE_COLLECTIONS.rukns,
          id: rukn.id,
          data: rukn,
        }))
        const result = await commitBatchSetDocuments(db, writes)
        if (!result.ok) {
          return result
        }
      } finally {
        markPendingWriteComplete()
      }
      ruknCache.set([...byId.values()])
      return repositoryOk(undefined)
    } catch (error) {
      return mapFirestoreError(error)
    }
  }

  clear(): RepositoryResult<void> {
    // KC-0058 — refuse permanent Rukn deletes.
    if (!isDangerousRepositoryClearAllowed()) {
      return repositoryErr('Permission', DANGEROUS_CLEAR_BLOCKED_MESSAGE)
    }
    ruknCache.set([])
    void queueWrite('rukns', async () => {
      const db = getFirestoreDb()
      const existing = await readCollection<Rukn>(db, FIRESTORE_COLLECTIONS.rukns)
      const batch = createBatch(db)
      for (const rukn of existing) {
        batch.delete(doc(db, FIRESTORE_COLLECTIONS.rukns, rukn.id))
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  exists(): RepositoryResult<boolean> {
    return repositoryOk(ruknCache.get().length > 0 || ruknCache.getHydrated())
  }
}

export class KarkunFirestoreRepository implements KarkunRepository {
  loadState(): RepositoryResult<KarkunRegistryState> {
    const state = karkunCache.get()
    return repositoryOk({ karkuns: [...state.karkuns], nextKarkunNum: state.nextKarkunNum })
  }

  saveState(state: KarkunRegistryState): RepositoryResult<void> {
    // KC-0056 — never persist a lagging counter (guards stale clients).
    let maxExisting = 0
    for (const karkun of state.karkuns) {
      const match = /^kr-(\d+)$/i.exec(karkun.id)
      if (!match) continue
      const num = Number.parseInt(match[1]!, 10)
      if (Number.isFinite(num) && num > maxExisting) maxExisting = num
    }
    const healedNext = Math.max(1, state.nextKarkunNum || 1, maxExisting + 1)
    const healedState: KarkunRegistryState = {
      karkuns: state.karkuns,
      nextKarkunNum: healedNext,
    }

    // Snapshot ownership before cache overwrite (Rukn release must still write cleared docs).
    const ownershipSnapshot = karkunCache.get().karkuns.map((karkun) => ({
      id: karkun.id,
      assignedRuknId: karkun.assignedRuknId,
    }))

    kc004cTraceRegistry({
      caller: 'KarkunFirestoreRepository.saveState',
      phase: 'upsert-without-orphan-delete',
      before: karkunCache.get().karkuns.length,
      after: healedState.karkuns.length,
      extra: {
        nextKarkunNum: healedState.nextKarkunNum,
        requestedNextKarkunNum: state.nextKarkunNum,
        note: 'Firestore batch.set only; existing docs not in state are not deleted',
      },
    })
    karkunCache.set({ karkuns: [...healedState.karkuns], nextKarkunNum: healedState.nextKarkunNum })
    void queueWrite('karkuns', async () => {
      const db = getFirestoreDb()
      const scope = await resolveClientAuthScope()
      const isRuknClient = scope.role === 'rukn' && Boolean(scope.ruknId)

      const toWrite = filterKarkunsForClientWrite(healedState.karkuns, scope, ownershipSnapshot)

      if (toWrite.length === 0 && isRuknClient) {
        return repositoryOk(undefined)
      }

      const writes = toWrite.map((karkun) => ({
        path: FIRESTORE_COLLECTIONS.karkuns,
        id: karkun.id,
        data: karkun,
      }))
      const batchResult = await commitBatchSetDocuments(db, writes)
      if (!batchResult.ok) {
        return batchResult
      }
      // Counter is administrator-owned; Rukn profile/connect must not touch it.
      if (!isRuknClient) {
        const counterResult = await writeDoc(
          db,
          FIRESTORE_COLLECTIONS.settings,
          FIRESTORE_DOCS.karkunCounter,
          sanitizeForFirestore({
            nextKarkunNum: healedState.nextKarkunNum,
          }) as object,
        )
        if (!counterResult.ok) {
          return counterResult
        }
      }
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  /** KC-0064 — awaited upsert of specific karkun docs (no karkunCounter / full registry). */
  async commitKarkunDocuments(
    karkuns: readonly KarkunRegistryRecord[],
  ): Promise<RepositoryResult<void>> {
    try {
      if (karkuns.length === 0) {
        return repositoryOk(undefined)
      }
      const db = getFirestoreDb()
      const scope = await resolveClientAuthScope()
      const ownershipSnapshot = karkunCache.get().karkuns.map((karkun) => ({
        id: karkun.id,
        assignedRuknId: karkun.assignedRuknId,
      }))
      const toWrite = filterKarkunsForClientWrite(karkuns, scope, ownershipSnapshot)
      if (toWrite.length === 0) {
        return repositoryOk(undefined)
      }

      const cached = karkunCache.get()
      const byId = new Map(cached.karkuns.map((karkun) => [karkun.id, karkun]))
      for (const karkun of toWrite) {
        byId.set(karkun.id, karkun)
      }

      trackPendingWrite()
      try {
        const writes = toWrite.map((karkun) => ({
          path: FIRESTORE_COLLECTIONS.karkuns,
          id: karkun.id,
          data: karkun,
        }))
        const result = await commitBatchSetDocuments(db, writes)
        if (!result.ok) {
          return result
        }
      } finally {
        markPendingWriteComplete()
      }

      karkunCache.set({
        karkuns: [...byId.values()],
        nextKarkunNum: cached.nextKarkunNum,
      })
      return repositoryOk(undefined)
    } catch (error) {
      return mapFirestoreError(error)
    }
  }

  async upsertRecord(karkun: KarkunRegistryRecord): Promise<RepositoryResult<void>> {
    const state = karkunCache.get()
    const nextKarkuns = state.karkuns.some((item) => item.id === karkun.id)
      ? state.karkuns.map((item) => (item.id === karkun.id ? karkun : item))
      : [...state.karkuns, karkun]
    karkunCache.set({ karkuns: nextKarkuns, nextKarkunNum: state.nextKarkunNum })
    const db = getFirestoreDb()
    return writeDoc(db, FIRESTORE_COLLECTIONS.karkuns, karkun.id, sanitizeForFirestore(karkun) as object)
  }

  clear(): RepositoryResult<void> {
    // KC-0058 — refuse permanent Karkun deletes.
    if (!isDangerousRepositoryClearAllowed()) {
      return repositoryErr('Permission', DANGEROUS_CLEAR_BLOCKED_MESSAGE)
    }
    karkunCache.set({ karkuns: [], nextKarkunNum: 1 })
    void queueWrite('karkuns', async () => {
      const db = getFirestoreDb()
      const existing = await readCollection<KarkunRegistryRecord>(db, FIRESTORE_COLLECTIONS.karkuns)
      const batch = createBatch(db)
      for (const karkun of existing) {
        batch.delete(doc(db, FIRESTORE_COLLECTIONS.karkuns, karkun.id))
      }
      batch.delete(doc(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.karkunCounter))
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  exists(): RepositoryResult<boolean> {
    return repositoryOk(karkunCache.get().karkuns.length > 0)
  }

  /** KC-004H — durable Firestore count for migration existence decisions. */
  async resolveRegistryCount(): Promise<RepositoryResult<number>> {
    try {
      const db = getFirestoreDb()
      const snapshot = await getCountFromServer(collection(db, FIRESTORE_COLLECTIONS.karkuns))
      return repositoryOk(snapshot.data().count)
    } catch (error) {
      return mapFirestoreError(error)
    }
  }
}

export class ConnectionFirestoreRepository implements ConnectionRepository {
  loadState(): RepositoryResult<ConnectionState> {
    const state = connectionCache.get()
    traceRepositorySnapshot('connection_repository', {
      caller: 'ConnectionFirestoreRepository.loadState',
      sourceOfTruth: 'Firestore',
      connectionCount: state.assignments.length,
      assignmentCount: state.assignments.length,
      nextSequence: state.nextSequence,
    })
    return repositoryOk({
      assignments: [...state.assignments],
      nextSequence: state.nextSequence,
    })
  }

  saveState(state: ConnectionState): RepositoryResult<void> {
    const cachedNext = connectionCache.get().nextSequence
    // KC-002: nextSequence is owned solely by allocateNextAssignmentNumber / setNextSequence.
    // Never overwrite connectionMeta from a stale client cache on document saves.
    const nextSequence = Math.max(cachedNext, state.nextSequence)
    traceRepositorySnapshot('connection_repository', {
      caller: 'ConnectionFirestoreRepository.saveState',
      sourceOfTruth: 'Derived Calculation',
      connectionCount: state.assignments.length,
      assignmentCount: state.assignments.length,
      nextSequence,
    })
    connectionCache.set({
      assignments: [...state.assignments],
      nextSequence,
    })
    void queueWrite('connections', async () => {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      // KC-002: upsert only — never delete remote connections absent from a partial client set.
      for (const assignment of state.assignments) {
        batch.set(
          doc(db, FIRESTORE_COLLECTIONS.connections, assignment.assignmentId),
          sanitizeForFirestore(assignment),
        )
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  async allocateNextAssignmentNumber(): Promise<RepositoryResult<AllocationResult>> {
    try {
      const db = getFirestoreDb()
      const metaRef = doc(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.connectionMeta)
      // KC-0053: floor against max ASN already present in cached docs so a lagging
      // connectionMeta.nextSequence cannot mint a colliding Assignment Number.
      const fromDocs = deriveNextSequenceFromRecords(connectionCache.get().assignments)
      const floor = Math.max(1, connectionCache.get().nextSequence, fromDocs)

      const allocated = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(metaRef)
        const meta = snapshot.exists() ? (stripMeta<ConnectionMetaDoc>(snapshot.data()) ?? {}) : {}
        const remoteNext = Number(meta.nextSequence)
        const current = Math.max(
          floor,
          Number.isFinite(remoteNext) && remoteNext >= 1 ? remoteNext : 1,
        )
        const assignmentNumber = formatAssignmentNumber(current)
        const nextSequence = current + 1
        transaction.set(
          metaRef,
          sanitizeForFirestore({
            nextSequence,
            asnRepairVersion: meta.asnRepairVersion ?? ASN_REPAIR_VERSION,
          }),
          { merge: true },
        )
        return { assignmentNumber, nextSequence }
      })

      connectionCache.set({
        ...connectionCache.get(),
        nextSequence: allocated.nextSequence,
      })
      return repositoryOk(allocated)
    } catch (error) {
      return mapFirestoreError(error)
    }
  }

  /** KC-0055 — awaited connection upserts only (no settings/ASN meta). */
  async commitConnectionDocuments(
    documents: readonly AssignmentRecord[],
  ): Promise<RepositoryResult<void>> {
    try {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      const cached = connectionCache.get()
      const byId = new Map(cached.assignments.map((item) => [item.assignmentId, item]))
      for (const document of documents) {
        byId.set(document.assignmentId, document)
        batch.set(
          doc(db, FIRESTORE_COLLECTIONS.connections, document.assignmentId),
          sanitizeForFirestore(document),
        )
      }
      trackPendingWrite()
      try {
        await batch.commit()
      } finally {
        markPendingWriteComplete()
      }
      connectionCache.set({
        assignments: [...byId.values()],
        nextSequence: cached.nextSequence,
      })
      return repositoryOk(undefined)
    } catch (error) {
      return mapFirestoreError(error)
    }
  }

  async setNextSequence(
    nextSequence: number,
    meta?: ConnectionMetaUpdate,
  ): Promise<RepositoryResult<void>> {
    try {
      const db = getFirestoreDb()
      const metaRef = doc(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.connectionMeta)
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(metaRef)
        const existing = snapshot.exists()
          ? (stripMeta<ConnectionMetaDoc>(snapshot.data()) ?? {})
          : {}
        const remoteNext = Number(existing.nextSequence)
        const monotonic = Math.max(
          nextSequence,
          Number.isFinite(remoteNext) && remoteNext >= 1 ? remoteNext : 1,
        )
        transaction.set(
          metaRef,
          sanitizeForFirestore({
            nextSequence: monotonic,
            asnRepairVersion: meta?.asnRepairVersion ?? existing.asnRepairVersion ?? ASN_REPAIR_VERSION,
          }),
          { merge: true },
        )
      })
      connectionCache.set({
        ...connectionCache.get(),
        nextSequence: Math.max(connectionCache.get().nextSequence, nextSequence),
      })
      return repositoryOk(undefined)
    } catch (error) {
      return mapFirestoreError(error)
    }
  }

  clear(): RepositoryResult<void> {
    // KC-0058 — refuse permanent connection/assignment deletes.
    if (!isDangerousRepositoryClearAllowed()) {
      return repositoryErr('Permission', DANGEROUS_CLEAR_BLOCKED_MESSAGE)
    }
    traceRepositorySnapshot('connection_repository', {
      caller: 'ConnectionFirestoreRepository.clear',
      sourceOfTruth: 'Derived Calculation',
      connectionCount: 0,
      assignmentCount: 0,
      nextSequence: 1,
    })
    connectionCache.set({ assignments: [], nextSequence: 1 })
    void queueWrite('connections', async () => {
      const db = getFirestoreDb()
      const existing = await readCollection<AssignmentRecord>(db, FIRESTORE_COLLECTIONS.connections)
      const batch = createBatch(db)
      for (const assignment of existing) {
        batch.delete(doc(db, FIRESTORE_COLLECTIONS.connections, assignment.assignmentId))
      }
      batch.delete(doc(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.connectionMeta))
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  loadActivityLog(): RepositoryResult<ActivityLogEntry[]> {
    return repositoryOk([...activityLogCache.get()])
  }

  saveActivityLog(entries: ActivityLogEntry[]): RepositoryResult<void> {
    activityLogCache.set([...entries])
    // KC-0058 — append-only: never rewrite existing activity documents.
    const toCreate = entries.filter((entry) => !persistedActivityIds.has(entry.id))
    if (toCreate.length === 0) {
      return repositoryOk(undefined)
    }
    for (const entry of toCreate) {
      persistedActivityIds.add(entry.id)
    }
    void queueWrite('activityLogs', async () => {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const entry of toCreate) {
        batch.set(doc(db, FIRESTORE_COLLECTIONS.activityLogs, entry.id), sanitizeForFirestore(entry))
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clearActivityLog(): RepositoryResult<void> {
    // KC-0058 — activity is append-only; refuse wipe.
    if (!isDangerousRepositoryClearAllowed()) {
      return repositoryErr('Permission', DANGEROUS_CLEAR_BLOCKED_MESSAGE)
    }
    activityLogCache.set([])
    void queueWrite('activityLogs', async () => {
      const db = getFirestoreDb()
      const existing = await readCollection<ActivityLogEntry>(db, FIRESTORE_COLLECTIONS.activityLogs)
      const batch = createBatch(db)
      for (const entry of existing) {
        batch.delete(doc(db, FIRESTORE_COLLECTIONS.activityLogs, entry.id))
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }
}

export class ExecutionFirestoreRepository implements ExecutionRepository {
  loadAnnexureForms(): RepositoryResult<SubmittedMeetingForm[]> {
    return repositoryOk([...annexureCache.get()])
  }

  saveAnnexureForms(forms: SubmittedMeetingForm[]): RepositoryResult<void> {
    // KC-0084 — merge dirty forms into cache; write only the dirty set to Firestore.
    const merged = new Map(annexureCache.get().map((form) => [form.id, form] as const))
    for (const form of forms) {
      merged.set(form.id, form)
      pendingAnnexureDirty.set(form.id, form)
    }
    annexureCache.set([...merged.values()])
    void queueWrite('executions.annexure', async () => {
      const dirty = [...pendingAnnexureDirty.values()]
      pendingAnnexureDirty.clear()
      if (dirty.length === 0) {
        return repositoryOk(undefined)
      }
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const form of dirty) {
        batch.set(
          doc(db, FIRESTORE_COLLECTIONS.executions, executionAnnexureDocId(form.id)),
          sanitizeForFirestore(form),
        )
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clearAnnexureForms(): RepositoryResult<void> {
    annexureCache.set([])
    return repositoryOk(undefined)
  }

  loadFollowUps(): RepositoryResult<FollowUpRecord[]> {
    return repositoryOk([...followUpCache.get()])
  }

  saveFollowUps(records: FollowUpRecord[]): RepositoryResult<void> {
    followUpCache.set([...records])
    void queueWrite('followUps', async () => {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const record of records) {
        batch.set(doc(db, FIRESTORE_COLLECTIONS.followUps, record.followUpId), sanitizeForFirestore(record))
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clearFollowUps(): RepositoryResult<void> {
    followUpCache.set([])
    return repositoryOk(undefined)
  }

  loadGuidanceState(): RepositoryResult<GuidanceState> {
    const state = guidanceCache.get()
    return repositoryOk({
      commitments: [...state.commitments],
      timelineEvents: [...state.timelineEvents],
    })
  }

  saveGuidanceState(state: GuidanceState): RepositoryResult<void> {
    guidanceCache.set({
      commitments: [...state.commitments],
      timelineEvents: [...state.timelineEvents],
    })
    void queueWrite('executions.guidance', async () => {
      const db = getFirestoreDb()
      return writeDoc(db, FIRESTORE_COLLECTIONS.executions, FIRESTORE_DOCS.guidanceState, state)
    })
    return repositoryOk(undefined)
  }

  clearGuidanceState(): RepositoryResult<void> {
    guidanceCache.set({ commitments: [], timelineEvents: [] })
    return repositoryOk(undefined)
  }
}

export class CommunicationFirestoreRepository implements CommunicationRepository {
  loadState(fallback: CommunicationState): RepositoryResult<CommunicationState> {
    return repositoryOk(communicationCache.get() ?? fallback)
  }

  saveState(state: CommunicationState): RepositoryResult<void> {
    communicationCache.set(state)
    void queueWrite('communications', async () => {
      const db = getFirestoreDb()
      return writeDoc(db, FIRESTORE_COLLECTIONS.communications, FIRESTORE_DOCS.communicationState, state)
    })
    return repositoryOk(undefined)
  }

  clear(): RepositoryResult<void> {
    communicationCache.set(null)
    return repositoryOk(undefined)
  }
}

export class ComplianceFirestoreRepository implements ComplianceRepository {
  loadBaitulMaal(): RepositoryResult<BaitulMaalRecord[]> {
    return repositoryOk([...baitulMaalCache.get()])
  }

  saveBaitulMaal(records: BaitulMaalRecord[]): RepositoryResult<void> {
    // KC-0084 — merge dirty records into cache; write only the dirty set to Firestore.
    const merged = new Map(
      baitulMaalCache.get().map((record) => [`${record.karkunId}:${record.monthKey}`, record] as const),
    )
    for (const record of records) {
      const key = `${record.karkunId}:${record.monthKey}` as `${string}:${string}`
      merged.set(key, record)
      pendingBaitulMaalDirty.set(key, record)
    }
    baitulMaalCache.set([...merged.values()])
    void queueWrite('compliance.baitulMaal', async () => {
      const dirty = [...pendingBaitulMaalDirty.values()]
      pendingBaitulMaalDirty.clear()
      if (dirty.length === 0) {
        return repositoryOk(undefined)
      }
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const record of dirty) {
        batch.set(
          doc(
            db,
            FIRESTORE_COLLECTIONS.compliance,
            complianceBaitulMaalDocId(record.karkunId, record.monthKey),
          ),
          sanitizeForFirestore({ _docType: 'baitulMaal', record }),
        )
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clearBaitulMaal(): RepositoryResult<void> {
    baitulMaalCache.set([])
    return repositoryOk(undefined)
  }

  loadIjtema(): RepositoryResult<IjtemaAttendanceRecord[]> {
    return repositoryOk([...ijtemaCache.get()])
  }

  saveIjtema(records: IjtemaAttendanceRecord[]): RepositoryResult<void> {
    // KC-0084 — merge dirty records into cache; write only the dirty set to Firestore.
    const merged = new Map(
      ijtemaCache
        .get()
        .map((record) => [`${record.karkunId}:${record.weekEndingDate}`, record] as const),
    )
    for (const record of records) {
      const key = `${record.karkunId}:${record.weekEndingDate}` as `${string}:${string}`
      merged.set(key, record)
      pendingIjtemaDirty.set(key, record)
    }
    ijtemaCache.set([...merged.values()])
    void queueWrite('compliance.ijtema', async () => {
      const dirty = [...pendingIjtemaDirty.values()]
      pendingIjtemaDirty.clear()
      if (dirty.length === 0) {
        return repositoryOk(undefined)
      }
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const record of dirty) {
        batch.set(
          doc(
            db,
            FIRESTORE_COLLECTIONS.compliance,
            complianceIjtemaDocId(record.karkunId, record.weekEndingDate),
          ),
          sanitizeForFirestore({ _docType: 'ijtema', record }),
        )
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clearIjtema(): RepositoryResult<void> {
    ijtemaCache.set([])
    return repositoryOk(undefined)
  }

  loadWeeklyIjtemaEvents(): RepositoryResult<WeeklyIjtemaEvent[]> {
    return repositoryOk([...weeklyIjtemaEventCache.get()])
  }

  saveWeeklyIjtemaEvents(events: WeeklyIjtemaEvent[]): RepositoryResult<void> {
    const merged = new Map(weeklyIjtemaEventCache.get().map((event) => [event.id, event] as const))
    for (const event of events) {
      merged.set(event.id, event)
      pendingWeeklyIjtemaEventDirty.set(event.id, event)
    }
    weeklyIjtemaEventCache.set([...merged.values()])
    void queueWrite('compliance.weeklyIjtemaEvents', async () => {
      const dirty = [...pendingWeeklyIjtemaEventDirty.values()]
      pendingWeeklyIjtemaEventDirty.clear()
      if (dirty.length === 0) {
        return repositoryOk(undefined)
      }
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const event of dirty) {
        batch.set(
          doc(
            db,
            FIRESTORE_COLLECTIONS.compliance,
            complianceWeeklyIjtemaEventDocId(event.id),
          ),
          sanitizeForFirestore({ _docType: 'weeklyIjtemaEvent', record: event }),
        )
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clearWeeklyIjtemaEvents(): RepositoryResult<void> {
    weeklyIjtemaEventCache.set([])
    return repositoryOk(undefined)
  }

  loadWeeklyIjtemaSubmissions(): RepositoryResult<WeeklyIjtemaSubmission[]> {
    return repositoryOk([...weeklyIjtemaSubmissionCache.get()])
  }

  saveWeeklyIjtemaSubmissions(submissions: WeeklyIjtemaSubmission[]): RepositoryResult<void> {
    const merged = new Map(
      weeklyIjtemaSubmissionCache.get().map((item) => [item.id, item] as const),
    )
    for (const submission of submissions) {
      merged.set(submission.id, submission)
      pendingWeeklyIjtemaSubmissionDirty.set(submission.id, submission)
    }
    weeklyIjtemaSubmissionCache.set([...merged.values()])
    void queueWrite('compliance.weeklyIjtemaSubmissions', async () => {
      const dirty = [...pendingWeeklyIjtemaSubmissionDirty.values()]
      pendingWeeklyIjtemaSubmissionDirty.clear()
      if (dirty.length === 0) {
        return repositoryOk(undefined)
      }
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const submission of dirty) {
        batch.set(
          doc(
            db,
            FIRESTORE_COLLECTIONS.compliance,
            complianceWeeklyIjtemaSubmissionDocId(submission.eventId, submission.ruknId),
          ),
          sanitizeForFirestore({ _docType: 'weeklyIjtemaSubmission', record: submission }),
        )
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clearWeeklyIjtemaSubmissions(): RepositoryResult<void> {
    weeklyIjtemaSubmissionCache.set([])
    return repositoryOk(undefined)
  }

  loadJihPortal(): RepositoryResult<JihPortalState> {
    const state = jihPortalCache.get()
    return repositoryOk({
      registrations: { ...state.registrations },
      monthlyReports: { ...state.monthlyReports },
    })
  }

  saveJihPortal(state: JihPortalState): RepositoryResult<void> {
    const normalized = normalizeJihPortalState(state)
    jihPortalCache.set({
      registrations: { ...normalized.registrations },
      monthlyReports: { ...normalized.monthlyReports },
    })
    void queueWrite('compliance.jihPortal', async () => {
      const db = getFirestoreDb()
      return writeDoc(db, FIRESTORE_COLLECTIONS.compliance, FIRESTORE_DOCS.jihPortalState, sanitizeForFirestore({
        _docType: 'jihPortal',
        record: normalized,
      }))
    })
    return repositoryOk(undefined)
  }

  clearJihPortal(): RepositoryResult<void> {
    jihPortalCache.set({ registrations: {}, monthlyReports: {} })
    return repositoryOk(undefined)
  }
}

export class SettingsFirestoreRepository implements SettingsRepository {
  getMigrationVersion(): RepositoryResult<number | null> {
    return repositoryOk(migrationVersionCache.get())
  }

  /** KC-004D — durable read when phased background hydrate has not filled the cache yet. */
  async resolveMigrationVersion(): Promise<RepositoryResult<number | null>> {
    const cached = migrationVersionCache.get()
    if (cached !== null) {
      return repositoryOk(cached)
    }
    try {
      const db = getFirestoreDb()
      const docData = await readDoc<{ version: number | null }>(
        db,
        FIRESTORE_COLLECTIONS.settings,
        FIRESTORE_DOCS.migrationVersion,
      )
      const version = docData?.version ?? null
      if (version !== null) {
        migrationVersionCache.set(version)
      }
      return repositoryOk(version)
    } catch (error) {
      return mapFirestoreError(error)
    }
  }

  setMigrationVersion(version: number): RepositoryResult<void> {
    migrationVersionCache.set(version)
    void queueWrite('settings.migrationVersion', async () => {
      const db = getFirestoreDb()
      return writeDoc(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.migrationVersion, { version })
    })
    return repositoryOk(undefined)
  }

  clearMigrationVersion(): RepositoryResult<void> {
    migrationVersionCache.set(null)
    return repositoryOk(undefined)
  }

  loadBroadcastLists(): RepositoryResult<BroadcastListRecord[]> {
    return repositoryOk([...broadcastCache.get()])
  }

  saveBroadcastLists(lists: BroadcastListRecord[]): RepositoryResult<void> {
    broadcastCache.set([...lists])
    void queueWrite('settings.broadcastLists', async () => {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const list of lists) {
        batch.set(
          doc(db, FIRESTORE_COLLECTIONS.settings, settingsBroadcastDocId(list.id)),
          sanitizeForFirestore(list),
        )
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clearBroadcastLists(): RepositoryResult<void> {
    broadcastCache.set([])
    return repositoryOk(undefined)
  }

  loadMigrationBackupIndex(): RepositoryResult<MigrationBackupIndexEntry[]> {
    return repositoryOk([...backupIndexCache.get()])
  }

  saveMigrationBackupIndex(entries: MigrationBackupIndexEntry[]): RepositoryResult<void> {
    backupIndexCache.set([...entries])
    void queueWrite('settings.backupIndex', async () => {
      const db = getFirestoreDb()
      return writeDoc(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.backupIndex, { entries })
    })
    return repositoryOk(undefined)
  }

  loadMigrationBackup(id: string): RepositoryResult<DatasetBackup | null> {
    return repositoryOk(backupCache.get().get(id) ?? null)
  }

  saveMigrationBackup(backup: DatasetBackup): RepositoryResult<void> {
    const map = new Map(backupCache.get())
    map.set(backup.id, backup)
    backupCache.set(map)
    void queueWrite('settings.backup', async () => {
      const db = getFirestoreDb()
      return writeDoc(db, FIRESTORE_COLLECTIONS.settings, settingsBackupDocId(backup.id), sanitizeForFirestore(backup))
    })
    return repositoryOk(undefined)
  }

  removeMigrationBackup(id: string): RepositoryResult<void> {
    const map = new Map(backupCache.get())
    map.delete(id)
    backupCache.set(map)
    void queueWrite('settings.backup.remove', async () => {
      const db = getFirestoreDb()
      return removeDoc(db, FIRESTORE_COLLECTIONS.settings, settingsBackupDocId(id))
    })
    return repositoryOk(undefined)
  }

  loadKarkunRequests(): RepositoryResult<NewKarkunRequest[]> {
    return repositoryOk([...karkunRequestCache.get()])
  }

  saveKarkunRequests(requests: NewKarkunRequest[]): RepositoryResult<void> {
    karkunRequestCache.set([...requests])
    void queueWrite('settings.karkunRequests', async () => {
      const db = getFirestoreDb()
      return writeDoc(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.karkunRequests, {
        requests,
      })
    })
    return repositoryOk(undefined)
  }

  clearKarkunRequests(): RepositoryResult<void> {
    karkunRequestCache.set([])
    return repositoryOk(undefined)
  }
}

export async function clearAllFirestoreCachesForTests(): Promise<void> {
  stopFirestoreSnapshotListeners()
  campaignCache.reset(MOCK_CAMPAIGNS)
  ruknCache.reset([])
  karkunCache.reset({ karkuns: [], nextKarkunNum: 1 })
  connectionCache.reset({ assignments: [], nextSequence: 1 })
  activityLogCache.reset([])
  annexureCache.reset([])
  followUpCache.reset([])
  guidanceCache.reset({ commitments: [], timelineEvents: [] })
  communicationCache.reset(null)
  baitulMaalCache.reset([])
  ijtemaCache.reset([])
  weeklyIjtemaEventCache.reset([])
  weeklyIjtemaSubmissionCache.reset([])
  jihPortalCache.reset({ registrations: {}, monthlyReports: {} })
  migrationVersionCache.reset(null)
  broadcastCache.reset([])
  backupIndexCache.reset([])
  backupCache.reset(new Map())
  karkunRequestCache.reset([])
}
