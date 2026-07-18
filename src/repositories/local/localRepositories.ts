import { MOCK_CAMPAIGNS, type CampaignListItem } from '@/constants/mockMissions'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'
import type { ActivityLogEntry, AssignmentRecord } from '@/types/assignment'
import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import type { FollowUpRecord } from '@/types/followUp'
import type { GuidanceState } from '@/repositories/interfaces/ExecutionRepository'
import type {
  CommunicationState,
} from '@/repositories/interfaces/CommunicationRepository'
import type { BaitulMaalRecord } from '@/types/baitulMaal'
import type { IjtemaAttendanceRecord } from '@/types/ijtemaAttendance'
import type { JihPortalState } from '@/repositories/interfaces/ComplianceRepository'
import type { Rukn } from '@/data/ruknMaster'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { DatasetBackup } from '@/types/dataMigration'
import {
  getBrowserStorage,
  loadJsonFromStorage,
  loadMapFromStorage,
  removeFromStorage,
  saveJsonToStorage,
  saveMapToStorage,
} from '@/lib/browserStorage'
import { repositoryOk, tryRepository, type RepositoryResult } from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
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
  formatAssignmentNumber,
  planAsnCollisionRepair,
} from '@/lib/connections/assignmentNumber'
import { planActiveConnectionIntegrity } from '@/lib/connections/activeConnectionIntegrity'
import { canonicalizeConnectionRecords } from '@/lib/connections/canonicalizeConnectionRecords'
import type { ExecutionRepository } from '@/repositories/interfaces/ExecutionRepository'
import type { CommunicationRepository } from '@/repositories/interfaces/CommunicationRepository'
import type { ComplianceRepository } from '@/repositories/interfaces/ComplianceRepository'
import type {
  BroadcastListRecord,
  MigrationBackupIndexEntry,
  SettingsRepository,
} from '@/repositories/interfaces/SettingsRepository'
import {
  markRepositoryReadiness,
  traceRepositorySnapshot,
} from '@/lib/incidentTraceCollector'

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

/** Serialize local ASN allocations within a single JS realm. */
let localAllocateChain: Promise<unknown> = Promise.resolve()

export class CampaignLocalRepository implements CampaignRepository {
  getAll(): RepositoryResult<readonly CampaignListItem[]> {
    return repositoryOk(MOCK_CAMPAIGNS)
  }

  getById(id: string): RepositoryResult<CampaignListItem | undefined> {
    return repositoryOk(MOCK_CAMPAIGNS.find((campaign) => campaign.id === id))
  }

  getActive(): RepositoryResult<CampaignListItem | undefined> {
    return repositoryOk(MOCK_CAMPAIGNS.find((campaign) => campaign.id === ACTIVE_CAMPAIGN_ID))
  }
}

export class RuknLocalRepository implements RuknRepository {
  loadAll(): RepositoryResult<Rukn[]> {
    return tryRepository(() => loadJsonFromStorage<Rukn[]>(STORAGE_KEYS.ruknMaster, []))
  }

  saveAll(rukns: Rukn[]): RepositoryResult<void> {
    return tryRepository(() => {
      saveJsonToStorage(STORAGE_KEYS.ruknMaster, rukns)
    })
  }

  clear(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.ruknMaster))
  }

  exists(): RepositoryResult<boolean> {
    return repositoryOk(getBrowserStorage().getItem(STORAGE_KEYS.ruknMaster) !== null)
  }
}

export class KarkunLocalRepository implements KarkunRepository {
  loadState(): RepositoryResult<KarkunRegistryState> {
    return tryRepository(() => ({
      karkuns: loadJsonFromStorage<KarkunRegistryRecord[]>(STORAGE_KEYS.karkunRegistry, []),
      nextKarkunNum: loadJsonFromStorage<number>(STORAGE_KEYS.karkunNextId, 1),
    }))
  }

  saveState(state: KarkunRegistryState): RepositoryResult<void> {
    return tryRepository(() => {
      saveJsonToStorage(STORAGE_KEYS.karkunRegistry, state.karkuns)
      saveJsonToStorage(STORAGE_KEYS.karkunNextId, state.nextKarkunNum)
    })
  }

  clear(): RepositoryResult<void> {
    return tryRepository(() => {
      removeFromStorage(STORAGE_KEYS.karkunRegistry)
      removeFromStorage(STORAGE_KEYS.karkunNextId)
    })
  }

  exists(): RepositoryResult<boolean> {
    return repositoryOk(getBrowserStorage().getItem(STORAGE_KEYS.karkunRegistry) !== null)
  }
}

export class ConnectionLocalRepository implements ConnectionRepository {
  loadState(): RepositoryResult<ConnectionState> {
    markRepositoryReadiness('connection_repository', 'LOADING', {
      caller: 'ConnectionLocalRepository.loadState',
      sourceOfTruth: 'Local Repository',
    })
    markRepositoryReadiness('assignment_repository', 'LOADING', {
      caller: 'ConnectionLocalRepository.loadState',
      sourceOfTruth: 'Local Repository',
    })

    const result = tryRepository(() => {
      const raw = loadJsonFromStorage<AssignmentRecord[]>(STORAGE_KEYS.assignments, [])
      const { records: assignments } = canonicalizeConnectionRecords(raw)
      const storedSequence = loadJsonFromStorage<number | null>(STORAGE_KEYS.assignmentSequence, null)
      const derivedSequence = deriveNextSequenceFromRecords(assignments)
      const nextSequence =
        storedSequence !== null && Number.isFinite(storedSequence)
          ? Math.max(storedSequence, derivedSequence)
          : derivedSequence

      let working = assignments
      let sequence = nextSequence
      const planned = planAsnCollisionRepair(working, sequence)
      if (planned.report.reassigned > 0) {
        working = planned.records
        sequence = planned.report.nextSequence
        saveJsonToStorage(STORAGE_KEYS.assignmentSequence, sequence)
        saveJsonToStorage(STORAGE_KEYS.assignmentAsnRepairVersion, ASN_REPAIR_VERSION)
      }

      const activeIntegrity = planActiveConnectionIntegrity(working)
      if (activeIntegrity.needsWrite) {
        working = activeIntegrity.records
        console.warn('[KC-003] superseded duplicate Active connections on local load', {
          superseded: activeIntegrity.report.superseded,
        })
      }

      if (planned.report.reassigned > 0 || activeIntegrity.needsWrite) {
        saveJsonToStorage(STORAGE_KEYS.assignments, working)
      }

      return { assignments: working, nextSequence: sequence }
    })

    if (result.ok) {
      const readiness = result.data.assignments.length > 0 ? 'LOADED' : 'LOADED_EMPTY'
      markRepositoryReadiness('connection_repository', readiness, {
        caller: 'ConnectionLocalRepository.loadState',
        sourceOfTruth: 'Local Repository',
      })
      markRepositoryReadiness('assignment_repository', readiness, {
        caller: 'ConnectionLocalRepository.loadState',
        sourceOfTruth: 'Local Repository',
      })
      traceRepositorySnapshot('connection_repository', {
        caller: 'ConnectionLocalRepository.loadState',
        sourceOfTruth: 'Local Repository',
        connectionCount: result.data.assignments.length,
        assignmentCount: result.data.assignments.length,
        nextSequence: result.data.nextSequence,
      })
      return result
    }

    markRepositoryReadiness('connection_repository', 'FAILED', {
      caller: 'ConnectionLocalRepository.loadState',
      sourceOfTruth: 'Local Repository',
    })
    markRepositoryReadiness('assignment_repository', 'FAILED', {
      caller: 'ConnectionLocalRepository.loadState',
      sourceOfTruth: 'Local Repository',
    })
    return result
  }

  saveState(state: ConnectionState): RepositoryResult<void> {
    const storedSequence = loadJsonFromStorage<number | null>(STORAGE_KEYS.assignmentSequence, null)
    const nextSequence = Math.max(
      state.nextSequence,
      storedSequence !== null && Number.isFinite(storedSequence) ? storedSequence : 1,
    )
    traceRepositorySnapshot('connection_repository', {
      caller: 'ConnectionLocalRepository.saveState',
      sourceOfTruth: 'Local Repository',
      connectionCount: state.assignments.length,
      assignmentCount: state.assignments.length,
      nextSequence,
    })
    return tryRepository(() => {
      // KC-002: document writes must not rewind the sequence counter.
      saveJsonToStorage(STORAGE_KEYS.assignments, state.assignments)
    })
  }

  async allocateNextAssignmentNumber(): Promise<RepositoryResult<AllocationResult>> {
    const run = async (): Promise<RepositoryResult<AllocationResult>> =>
      tryRepository(() => {
        const assignments = loadJsonFromStorage<AssignmentRecord[]>(STORAGE_KEYS.assignments, [])
        const storedSequence = loadJsonFromStorage<number | null>(STORAGE_KEYS.assignmentSequence, null)
        const derived = deriveNextSequenceFromRecords(assignments)
        const current = Math.max(
          derived,
          storedSequence !== null && Number.isFinite(storedSequence) ? storedSequence : 1,
        )
        const assignmentNumber = formatAssignmentNumber(current)
        const nextSequence = current + 1
        saveJsonToStorage(STORAGE_KEYS.assignmentSequence, nextSequence)
        return { assignmentNumber, nextSequence }
      })

    const scheduled = localAllocateChain.then(run, run)
    localAllocateChain = scheduled.then(
      () => undefined,
      () => undefined,
    )
    return scheduled
  }

  async setNextSequence(
    nextSequence: number,
    meta?: ConnectionMetaUpdate,
  ): Promise<RepositoryResult<void>> {
    return tryRepository(() => {
      const storedSequence = loadJsonFromStorage<number | null>(STORAGE_KEYS.assignmentSequence, null)
      const monotonic = Math.max(
        nextSequence,
        storedSequence !== null && Number.isFinite(storedSequence) ? storedSequence : 1,
      )
      saveJsonToStorage(STORAGE_KEYS.assignmentSequence, monotonic)
      if (meta?.asnRepairVersion !== undefined) {
        saveJsonToStorage(STORAGE_KEYS.assignmentAsnRepairVersion, meta.asnRepairVersion)
      }
    })
  }

  clear(): RepositoryResult<void> {
    traceRepositorySnapshot('connection_repository', {
      caller: 'ConnectionLocalRepository.clear',
      sourceOfTruth: 'Local Repository',
      connectionCount: 0,
      assignmentCount: 0,
      nextSequence: 1,
    })
    return tryRepository(() => {
      removeFromStorage(STORAGE_KEYS.assignments)
      removeFromStorage(STORAGE_KEYS.assignmentSequence)
      removeFromStorage(STORAGE_KEYS.assignmentAsnRepairVersion)
    })
  }

  loadActivityLog(): RepositoryResult<ActivityLogEntry[]> {
    return tryRepository(() => loadJsonFromStorage<ActivityLogEntry[]>(STORAGE_KEYS.activityLog, []))
  }

  saveActivityLog(entries: ActivityLogEntry[]): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.activityLog, entries))
  }

  clearActivityLog(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.activityLog))
  }
}

export class ExecutionLocalRepository implements ExecutionRepository {
  loadAnnexureForms(): RepositoryResult<SubmittedMeetingForm[]> {
    return tryRepository(() => loadJsonFromStorage<SubmittedMeetingForm[]>(STORAGE_KEYS.annexure1, []))
  }

  saveAnnexureForms(forms: SubmittedMeetingForm[]): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.annexure1, forms))
  }

  clearAnnexureForms(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.annexure1))
  }

  loadFollowUps(): RepositoryResult<FollowUpRecord[]> {
    return tryRepository(() => loadJsonFromStorage<FollowUpRecord[]>(STORAGE_KEYS.followUps, []))
  }

  saveFollowUps(records: FollowUpRecord[]): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.followUps, records))
  }

  clearFollowUps(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.followUps))
  }

  loadGuidanceState(): RepositoryResult<GuidanceState> {
    return tryRepository(() =>
      loadJsonFromStorage<GuidanceState>(STORAGE_KEYS.guidance, {
        commitments: [],
        timelineEvents: [],
      }),
    )
  }

  saveGuidanceState(state: GuidanceState): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.guidance, state))
  }

  clearGuidanceState(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.guidance))
  }
}

export class CommunicationLocalRepository implements CommunicationRepository {
  loadState(fallback: CommunicationState): RepositoryResult<CommunicationState> {
    return tryRepository(() => loadJsonFromStorage<CommunicationState>(STORAGE_KEYS.communication, fallback))
  }

  saveState(state: CommunicationState): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.communication, state))
  }

  clear(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.communication))
  }
}

export class ComplianceLocalRepository implements ComplianceRepository {
  loadBaitulMaal(): RepositoryResult<BaitulMaalRecord[]> {
    return tryRepository(() => [...loadMapFromStorage<string, BaitulMaalRecord>(STORAGE_KEYS.baitulMaal).values()])
  }

  saveBaitulMaal(records: BaitulMaalRecord[]): RepositoryResult<void> {
    return tryRepository(() => {
      const map = new Map<string, BaitulMaalRecord>()
      for (const record of records) {
        map.set(`${record.karkunId}:${record.monthKey}`, record)
      }
      saveMapToStorage(STORAGE_KEYS.baitulMaal, map)
    })
  }

  clearBaitulMaal(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.baitulMaal))
  }

  loadIjtema(): RepositoryResult<IjtemaAttendanceRecord[]> {
    return tryRepository(() => [...loadMapFromStorage<string, IjtemaAttendanceRecord>(STORAGE_KEYS.ijtema).values()])
  }

  saveIjtema(records: IjtemaAttendanceRecord[]): RepositoryResult<void> {
    return tryRepository(() => {
      const map = new Map<string, IjtemaAttendanceRecord>()
      for (const record of records) {
        map.set(`${record.karkunId}:${record.weekEndingDate}`, record)
      }
      saveMapToStorage(STORAGE_KEYS.ijtema, map)
    })
  }

  clearIjtema(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.ijtema))
  }

  loadJihPortal(): RepositoryResult<JihPortalState> {
    return tryRepository(() => {
      const persisted = loadJsonFromStorage<unknown>(STORAGE_KEYS.jihPortal, {
        registrations: {},
        monthlyReports: {},
      })
      return normalizeJihPortalState(persisted)
    })
  }

  saveJihPortal(state: JihPortalState): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.jihPortal, normalizeJihPortalState(state)))
  }

  clearJihPortal(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.jihPortal))
  }
}

export class SettingsLocalRepository implements SettingsRepository {
  getMigrationVersion(): RepositoryResult<number | null> {
    return tryRepository(() => loadJsonFromStorage<number | null>(STORAGE_KEYS.migrationVersion, null))
  }

  setMigrationVersion(version: number): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.migrationVersion, version))
  }

  clearMigrationVersion(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.migrationVersion))
  }

  loadBroadcastLists(): RepositoryResult<BroadcastListRecord[]> {
    return tryRepository(() => loadJsonFromStorage<BroadcastListRecord[]>(STORAGE_KEYS.broadcastLists, []))
  }

  saveBroadcastLists(lists: BroadcastListRecord[]): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.broadcastLists, lists))
  }

  clearBroadcastLists(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.broadcastLists))
  }

  loadMigrationBackupIndex(): RepositoryResult<MigrationBackupIndexEntry[]> {
    return tryRepository(() => loadJsonFromStorage<MigrationBackupIndexEntry[]>(STORAGE_KEYS.migrationBackups, []))
  }

  saveMigrationBackupIndex(entries: MigrationBackupIndexEntry[]): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.migrationBackups, entries))
  }

  loadMigrationBackup(id: string): RepositoryResult<DatasetBackup | null> {
    return tryRepository(() => loadJsonFromStorage<DatasetBackup | null>(STORAGE_KEYS.migrationBackup(id), null))
  }

  saveMigrationBackup(backup: DatasetBackup): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.migrationBackup(backup.id), backup))
  }

  removeMigrationBackup(id: string): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.migrationBackup(id)))
  }

  loadKarkunRequests(): RepositoryResult<import('@/types/karkunRequest.types').NewKarkunRequest[]> {
    return tryRepository(() =>
      loadJsonFromStorage(STORAGE_KEYS.karkunRequests, [] as import('@/types/karkunRequest.types').NewKarkunRequest[]),
    )
  }

  saveKarkunRequests(
    requests: import('@/types/karkunRequest.types').NewKarkunRequest[],
  ): RepositoryResult<void> {
    return tryRepository(() => saveJsonToStorage(STORAGE_KEYS.karkunRequests, requests))
  }

  clearKarkunRequests(): RepositoryResult<void> {
    return tryRepository(() => removeFromStorage(STORAGE_KEYS.karkunRequests))
  }
}
