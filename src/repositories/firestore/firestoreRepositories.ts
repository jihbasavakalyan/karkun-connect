import { MOCK_CAMPAIGNS, type CampaignListItem } from '@/constants/mockMissions'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'
import type { ActivityLogEntry, AssignmentRecord } from '@/types/assignment'
import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import type { FollowUpRecord } from '@/types/followUp'
import type { GuidanceState } from '@/repositories/interfaces/ExecutionRepository'
import type { CommunicationState } from '@/repositories/interfaces/CommunicationRepository'
import type { BaitulMaalRecord } from '@/types/baitulMaal'
import type { IjtemaAttendanceRecord } from '@/types/ijtemaAttendance'
import type { JihPortalState } from '@/repositories/interfaces/ComplianceRepository'
import type { Rukn } from '@/data/ruknMaster'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { DatasetBackup } from '@/types/dataMigration'
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import { repositoryOk, type RepositoryResult } from '@/repositories/errors'
import type { CampaignRepository } from '@/repositories/interfaces/CampaignRepository'
import type { RuknRepository } from '@/repositories/interfaces/RuknRepository'
import type { KarkunRepository, KarkunRegistryState } from '@/repositories/interfaces/KarkunRepository'
import type { ConnectionRepository, ConnectionState } from '@/repositories/interfaces/ConnectionRepository'
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
  executionAnnexureDocId,
  settingsBackupDocId,
  settingsBroadcastDocId,
} from '@/repositories/firestore/collections'
import {
  createBatch,
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

function deriveNextSequenceFromRecords(records: AssignmentRecord[]): number {
  let max = 0
  for (const record of records) {
    const match = record.assignmentNumber.match(/ASN-(\d+)/i)
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10))
    }
  }
  return max + 1
}

const campaignCache = new SyncCache<readonly CampaignListItem[]>(MOCK_CAMPAIGNS)
const ruknCache = new SyncCache<Rukn[]>([])
const karkunCache = new SyncCache<KarkunRegistryState>({ karkuns: [], nextKarkunNum: 1 })
const connectionCache = new SyncCache<ConnectionState>({ assignments: [], nextSequence: 1 })
const activityLogCache = new SyncCache<ActivityLogEntry[]>([])
const annexureCache = new SyncCache<SubmittedMeetingForm[]>([])
const followUpCache = new SyncCache<FollowUpRecord[]>([])
const guidanceCache = new SyncCache<GuidanceState>({ commitments: [], timelineEvents: [] })
const communicationCache = new SyncCache<CommunicationState | null>(null)
const baitulMaalCache = new SyncCache<BaitulMaalRecord[]>([])
const ijtemaCache = new SyncCache<IjtemaAttendanceRecord[]>([])
const jihPortalCache = new SyncCache<JihPortalState>({ registrations: {}, monthlyReports: {} })
const migrationVersionCache = new SyncCache<number | null>(null)
const broadcastCache = new SyncCache<BroadcastListRecord[]>([])
const karkunRequestCache = new SyncCache<NewKarkunRequest[]>([])
const backupIndexCache = new SyncCache<MigrationBackupIndexEntry[]>([])
const backupCache = new SyncCache<Map<string, DatasetBackup>>(new Map())

const snapshotUnsubscribers: Unsubscribe[] = []
let hydrateInFlight: Promise<void> | null = null
let hydrateRequestedWhileRunning = false

markRepositoryReadiness('connection_repository', 'UNINITIALIZED', {
  caller: 'firestoreRepositories.module',
  sourceOfTruth: 'Firestore',
})
markRepositoryReadiness('assignment_repository', 'UNINITIALIZED', {
  caller: 'firestoreRepositories.module',
  sourceOfTruth: 'Firestore',
})

async function queueWrite(label: string, work: () => Promise<RepositoryResult<void>>): Promise<void> {
  trackPendingWrite()
  try {
    const result = await work()
    if (!result.ok && result.error.code === 'Duplicate') {
      recordFirestoreConflict(label, result.error.cause)
    }
  } finally {
    markPendingWriteComplete()
  }
}

async function hydrateFirestoreCachesOnce(): Promise<void> {
  traceIncidentStage('hydrateFirestoreCachesOnce:start', {
    caller: 'hydrateFirestoreCachesOnce',
    sourceOfTruth: 'Firestore',
  })
  markRepositoryReadiness('connection_repository', 'LOADING', {
    caller: 'hydrateFirestoreCachesOnce',
    reason: 'reading connections collection',
    sourceOfTruth: 'Firestore',
  })
  markRepositoryReadiness('assignment_repository', 'LOADING', {
    caller: 'hydrateFirestoreCachesOnce',
    reason: 'reading connections collection',
    sourceOfTruth: 'Firestore',
  })

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
      readCollection<Rukn>(db, FIRESTORE_COLLECTIONS.rukns),
      readCollection<KarkunRegistryRecord>(db, FIRESTORE_COLLECTIONS.karkuns),
      readDoc<{ nextKarkunNum: number }>(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.karkunCounter),
      readCollection<AssignmentRecord>(db, FIRESTORE_COLLECTIONS.connections),
      readDoc<{ nextSequence: number }>(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.connectionMeta),
      readCollection<ActivityLogEntry>(db, FIRESTORE_COLLECTIONS.activityLogs),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.executions)),
      readCollection<FollowUpRecord>(db, FIRESTORE_COLLECTIONS.followUps),
      readDoc<CommunicationState>(db, FIRESTORE_COLLECTIONS.communications, FIRESTORE_DOCS.communicationState),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.compliance)),
      readDoc<{ version: number | null }>(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.migrationVersion),
      getDocs(collection(db, FIRESTORE_COLLECTIONS.settings)),
    ])

    if (campaigns.length > 0) {
      campaignCache.set(campaigns)
    } else {
      campaignCache.set(MOCK_CAMPAIGNS)
    }

    ruknCache.set(rukns)
    karkunCache.set({
      karkuns,
      nextKarkunNum: karkunCounter?.nextKarkunNum ?? 1,
    })

    const { records: canonicalAssignments, duplicates: connectionDuplicates } =
      canonicalizeConnectionRecords(assignments)
    if (connectionDuplicates.length > 0) {
      console.warn(
        '[KC-028A] connection duplicates detected at Firestore hydrate (first layer)',
        connectionDuplicates,
      )
    }
    const derivedSequence = deriveNextSequenceFromRecords(canonicalAssignments)
    connectionCache.set({
      assignments: canonicalAssignments,
      nextSequence: Math.max(connectionMeta?.nextSequence ?? 1, derivedSequence),
    })
    traceSequencedIncidentStage('repository_cache_update_complete', {
      connectionCount: canonicalAssignments.length,
      assignmentCount: canonicalAssignments.length,
      sourceOfTruth: 'Firestore',
      duplicatesCanonicalized: connectionDuplicates.length,
    })
    markRepositoryReadiness(
      'connection_repository',
      canonicalAssignments.length > 0 ? 'LOADED' : 'LOADED_EMPTY',
      {
        caller: 'hydrateFirestoreCachesOnce',
        sourceOfTruth: 'Firestore',
      },
    )
    markRepositoryReadiness(
      'assignment_repository',
      canonicalAssignments.length > 0 ? 'LOADED' : 'LOADED_EMPTY',
      {
        caller: 'hydrateFirestoreCachesOnce',
        sourceOfTruth: 'Firestore',
      },
    )
    traceRepositorySnapshot('connection_repository', {
      caller: 'hydrateFirestoreCachesOnce',
      sourceOfTruth: 'Firestore',
      connectionCount: canonicalAssignments.length,
      assignmentCount: canonicalAssignments.length,
      nextSequence: Math.max(connectionMeta?.nextSequence ?? 1, derivedSequence),
    })

    activityLogCache.set(activityLogs)

    const annexureForms: SubmittedMeetingForm[] = []
    let guidance: GuidanceState | null = null
    for (const snapshot of executionSnapshots.docs) {
      if (snapshot.id === FIRESTORE_DOCS.guidanceState) {
        guidance = stripMeta<GuidanceState>(snapshot.data())
        continue
      }
      if (snapshot.id.startsWith('annexure_')) {
        annexureForms.push(stripMeta<SubmittedMeetingForm>(snapshot.data()))
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
    let jihPortal: JihPortalState | null = null
    for (const snapshot of complianceSnapshots.docs) {
      const data = snapshot.data() as DocumentRecord
      if (data._docType === 'baitulMaal') {
        baitulMaal.push(data.record as BaitulMaalRecord)
      } else if (data._docType === 'ijtema') {
        ijtema.push(data.record as IjtemaAttendanceRecord)
      } else if (data._docType === 'jihPortal') {
        jihPortal = normalizeJihPortalState(data.record)
      }
    }
    baitulMaalCache.set(baitulMaal)
    ijtemaCache.set(ijtema)
    if (jihPortal) {
      jihPortalCache.set(jihPortal)
    }

    migrationVersionCache.set(migrationVersion?.version ?? null)

    const broadcastLists: BroadcastListRecord[] = []
    let backupIndex: MigrationBackupIndexEntry[] = []
    let karkunRequests: NewKarkunRequest[] = []
    const backupMap = new Map<string, DatasetBackup>()
    for (const snapshot of settingsSnapshots.docs) {
      if (snapshot.id.startsWith('broadcast_')) {
        broadcastLists.push(stripMeta<BroadcastListRecord>(snapshot.data()))
        continue
      }
      if (snapshot.id.startsWith('backup_')) {
        const backup = stripMeta<DatasetBackup>(snapshot.data())
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
    traceIncidentStage('hydrateFirestoreCachesOnce:complete', {
      caller: 'hydrateFirestoreCachesOnce',
      sourceOfTruth: 'Firestore',
      connectionCount: assignments.length,
    })
  } catch (error) {
    markRepositoryReadiness('connection_repository', 'FAILED', {
      caller: 'hydrateFirestoreCachesOnce',
      sourceOfTruth: 'Firestore',
      error: error instanceof Error ? error.message : String(error),
    })
    markRepositoryReadiness('assignment_repository', 'FAILED', {
      caller: 'hydrateFirestoreCachesOnce',
      sourceOfTruth: 'Firestore',
      error: error instanceof Error ? error.message : String(error),
    })
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
  _docType: 'baitulMaal' | 'ijtema' | 'jihPortal'
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

  const watch = (path: string, handler: () => void) => {
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

  watch(FIRESTORE_COLLECTIONS.connections, onRemoteChange)
  watch(FIRESTORE_COLLECTIONS.karkuns, onRemoteChange)
  watch(FIRESTORE_COLLECTIONS.rukns, onRemoteChange)
  watch(FIRESTORE_COLLECTIONS.activityLogs, onRemoteChange)
  watch(FIRESTORE_COLLECTIONS.followUps, onRemoteChange)
  watch(FIRESTORE_COLLECTIONS.executions, onRemoteChange)
  watch(FIRESTORE_COLLECTIONS.compliance, onRemoteChange)
  watch(FIRESTORE_COLLECTIONS.communications, onRemoteChange)
  watch(FIRESTORE_COLLECTIONS.settings, onRemoteChange)
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
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const rukn of rukns) {
        batch.set(doc(db, FIRESTORE_COLLECTIONS.rukns, rukn.id), sanitizeForFirestore(rukn))
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clear(): RepositoryResult<void> {
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
    karkunCache.set({ karkuns: [...state.karkuns], nextKarkunNum: state.nextKarkunNum })
    void queueWrite('karkuns', async () => {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const karkun of state.karkuns) {
        batch.set(doc(db, FIRESTORE_COLLECTIONS.karkuns, karkun.id), sanitizeForFirestore(karkun))
      }
      batch.set(doc(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.karkunCounter), sanitizeForFirestore({
        nextKarkunNum: state.nextKarkunNum,
      }))
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clear(): RepositoryResult<void> {
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
    traceRepositorySnapshot('connection_repository', {
      caller: 'ConnectionFirestoreRepository.saveState',
      sourceOfTruth: 'Derived Calculation',
      connectionCount: state.assignments.length,
      assignmentCount: state.assignments.length,
      nextSequence: state.nextSequence,
    })
    connectionCache.set({
      assignments: [...state.assignments],
      nextSequence: state.nextSequence,
    })
    void queueWrite('connections', async () => {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      const existing = await readCollection<AssignmentRecord>(db, FIRESTORE_COLLECTIONS.connections)
      const keepIds = new Set(state.assignments.map((record) => record.assignmentId))
      // KC-028A: prune orphan connection docs so hydrate cannot reintroduce duplicates.
      for (const assignment of existing) {
        if (!keepIds.has(assignment.assignmentId)) {
          batch.delete(doc(db, FIRESTORE_COLLECTIONS.connections, assignment.assignmentId))
        }
      }
      for (const assignment of state.assignments) {
        batch.set(
          doc(db, FIRESTORE_COLLECTIONS.connections, assignment.assignmentId),
          sanitizeForFirestore(assignment),
        )
      }
      batch.set(doc(db, FIRESTORE_COLLECTIONS.settings, FIRESTORE_DOCS.connectionMeta), sanitizeForFirestore({
        nextSequence: state.nextSequence,
      }))
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clear(): RepositoryResult<void> {
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
    void queueWrite('activityLogs', async () => {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const entry of entries) {
        batch.set(doc(db, FIRESTORE_COLLECTIONS.activityLogs, entry.id), sanitizeForFirestore(entry))
      }
      await batch.commit()
      return repositoryOk(undefined)
    })
    return repositoryOk(undefined)
  }

  clearActivityLog(): RepositoryResult<void> {
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
    annexureCache.set([...forms])
    void queueWrite('executions.annexure', async () => {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const form of forms) {
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
    baitulMaalCache.set([...records])
    void queueWrite('compliance.baitulMaal', async () => {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const record of records) {
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
    ijtemaCache.set([...records])
    void queueWrite('compliance.ijtema', async () => {
      const db = getFirestoreDb()
      const batch = createBatch(db)
      for (const record of records) {
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
  jihPortalCache.reset({ registrations: {}, monthlyReports: {} })
  migrationVersionCache.reset(null)
  broadcastCache.reset([])
  backupIndexCache.reset([])
  backupCache.reset(new Map())
  karkunRequestCache.reset([])
}
