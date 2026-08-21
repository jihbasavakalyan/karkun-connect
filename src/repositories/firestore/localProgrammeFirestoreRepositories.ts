/**
 * Firestore persistence for سرگرمی (collection remains `localProgrammes`).
 * Per-document upsert via existing writeDoc helpers. Admin writes.
 * Hydrate: Admin reads all; Rukn reads own ذمہ دار rows (`responsibleRuknId`).
 * Soft-read on hydrate (permission-denied → empty). No LWW blob.
 * Head context (mansoobaId/shobahId) + optional Objective validated before durable write.
 * Optional campaignId is a focus overlay and is validated when present.
 */

import { collection, getDocs, query, where, type DocumentData } from 'firebase/firestore'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import { repositoryOk, type RepositoryResult } from '@/repositories/errors'
import type { CampaignRepository } from '@/repositories/interfaces/CampaignRepository'
import type { LocalProgrammeRepository } from '@/repositories/interfaces/LocalProgrammeRepository'
import type { ObjectiveRepository } from '@/repositories/interfaces/ObjectiveRepository'
import { validateLocalProgrammeForSave } from '@/lib/planning/localProgrammeValidation'
import type { LocalProgramme } from '@/types/localProgramme.types'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  sanitizeForFirestore,
  stripMeta,
  writeDoc,
} from '@/repositories/firestore/firestoreHelpers'
import { SyncCache } from '@/repositories/firestore/cache'

const programmeCache = new SyncCache<LocalProgramme[]>([])

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code) : ''
  return code === 'permission-denied' || code.includes('permission-denied')
}

type ClientAuthScope = { role: string | null; ruknId: string | null }

async function resolveClientAuthScope(): Promise<ClientAuthScope> {
  try {
    const user = getFirebaseAuth().currentUser
    if (!user) return { role: null, ruknId: null }
    const token = await user.getIdTokenResult()
    const role = typeof token.claims.role === 'string' ? token.claims.role : null
    const ruknId = typeof token.claims.ruknId === 'string' ? token.claims.ruknId : null
    return { role, ruknId }
  } catch {
    return { role: null, ruknId: null }
  }
}

async function readScopedByResponsibleRuknId<T>(
  collectionName: string,
  label: string,
): Promise<T[]> {
  const db = getFirestoreDb()
  const scope = await resolveClientAuthScope()
  if (scope.role === 'rukn' && !scope.ruknId) return []
  try {
    if (scope.role === 'rukn' && scope.ruknId) {
      const snap = await getDocs(
        query(
          collection(db, collectionName),
          where('responsibleRuknId', '==', scope.ruknId),
        ),
      )
      return snap.docs.map((item) => stripMeta<T>(item.data() as DocumentData))
    }
    const snap = await getDocs(collection(db, collectionName))
    return snap.docs.map((item) => stripMeta<T>(item.data() as DocumentData))
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn(`[firestore:hydrate] soft-skip ${label} (permission-denied)`)
      return []
    }
    throw error
  }
}

function upsertById<T extends { id: string }>(rows: T[], next: T): T[] {
  return [next, ...rows.filter((row) => row.id !== next.id)]
}

export function applyLocalProgrammeHydrate(rows: LocalProgramme[]): void {
  programmeCache.set([...rows])
}

/** Soft-read Local Programme collection: Admin all; Rukn own (`responsibleRuknId`). */
export async function readLocalProgrammeCollectionsForClient(): Promise<
  LocalProgramme[]
> {
  return readScopedByResponsibleRuknId<LocalProgramme>(
    FIRESTORE_COLLECTIONS.localProgrammes,
    'localProgrammes',
  )
}

export function resetLocalProgrammeCachesForTests(): void {
  programmeCache.reset([])
}

export class LocalProgrammeFirestoreRepository implements LocalProgrammeRepository {
  private readonly objectives: ObjectiveRepository
  private readonly campaigns: CampaignRepository

  constructor(objectives: ObjectiveRepository, campaigns: CampaignRepository) {
    this.objectives = objectives
    this.campaigns = campaigns
  }

  loadAll(): RepositoryResult<readonly LocalProgramme[]> {
    return repositoryOk([...programmeCache.get()])
  }

  getById(id: string): RepositoryResult<LocalProgramme | undefined> {
    return repositoryOk(programmeCache.get().find((row) => row.id === id))
  }

  listByObjectiveId(
    objectiveId: string,
  ): RepositoryResult<readonly LocalProgramme[]> {
    const id = objectiveId.trim()
    if (!id) return repositoryOk([])
    return repositoryOk(
      programmeCache.get().filter((row) => row.objectiveId === id),
    )
  }

  listByCampaignId(
    campaignId: string,
  ): RepositoryResult<readonly LocalProgramme[]> {
    return repositoryOk(
      programmeCache.get().filter((row) => row.campaignId === campaignId),
    )
  }

  listByResponsibleRuknId(
    ruknId: string,
  ): RepositoryResult<readonly LocalProgramme[]> {
    const id = ruknId.trim()
    if (!id) return repositoryOk([])
    return repositoryOk(
      programmeCache.get().filter((row) => row.responsibleRuknId === id),
    )
  }

  async saveDurable(
    programme: LocalProgramme,
  ): Promise<RepositoryResult<LocalProgramme>> {
    const invalid = validateLocalProgrammeForSave(
      programme,
      this.objectives,
      this.campaigns,
    )
    if (invalid) return invalid

    const write = await writeDoc(
      getFirestoreDb(),
      FIRESTORE_COLLECTIONS.localProgrammes,
      programme.id,
      sanitizeForFirestore(programme),
    )
    if (!write.ok) {
      console.error('[phase2] localProgrammes saveDurable failed', {
        module: 'localProgrammes',
        operation: 'saveDurable',
        result: 'error',
        id: programme.id,
        objectiveId: programme.objectiveId,
        error: write.error,
      })
      return write
    }
    programmeCache.set(upsertById(programmeCache.get(), programme))
    console.info('[phase2] localProgrammes saveDurable success', {
      module: 'localProgrammes',
      operation: 'saveDurable',
      result: 'ok',
      id: programme.id,
      objectiveId: programme.objectiveId,
    })
    return repositoryOk(programme)
  }
}
