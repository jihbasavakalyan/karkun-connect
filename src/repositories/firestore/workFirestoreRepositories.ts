/**
 * Phase 4 — Firestore persistence for Work.
 * Per-document upsert via existing writeDoc helpers.
 * Soft-read on hydrate (permission-denied → empty). No LWW blob.
 * Existing Rukn + Unit + optional Responsibility validated before durable write.
 * Does not mutate people.
 */

import { collection, getDocs, query, where, type DocumentData } from 'firebase/firestore'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import {
  repositoryErr,
  repositoryOk,
  type RepositoryResult,
} from '@/repositories/errors'
import type { ResponsibilityRepository } from '@/repositories/interfaces/ResponsibilityRepository'
import type { RuknRepository } from '@/repositories/interfaces/RuknRepository'
import type { UnitRepository } from '@/repositories/interfaces/UnitRepository'
import type { WorkRepository } from '@/repositories/interfaces/WorkRepository'
import type { Work } from '@/types/work.types'
import { validateWorkStatusTransition } from '@/lib/work/lifecycle'
import {
  validateWorkResponsibilityConsistency,
  validateWorkShape,
} from '@/lib/work/validate'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  sanitizeForFirestore,
  stripMeta,
  writeDoc,
} from '@/repositories/firestore/firestoreHelpers'
import { SyncCache } from '@/repositories/firestore/cache'

const workCache = new SyncCache<Work[]>([])

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

async function readScopedByRuknId<T>(
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
          where('ruknId', '==', scope.ruknId),
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

function validateWorkParents(
  row: Work,
  units: UnitRepository,
  rukns: RuknRepository,
  responsibilities: ResponsibilityRepository,
): RepositoryResult<Work> | null {
  const shape = validateWorkShape(row)
  if (shape) return repositoryErr('Validation', shape)

  const unit = units.getById(row.unitId)
  if (!unit.ok || !unit.data) {
    return repositoryErr(
      'Validation',
      'Work requires an existing Unit / Scope (unitId).',
    )
  }

  const people = rukns.loadAll()
  if (!people.ok) return people
  const rukn = people.data.find((item) => item.id === row.ruknId)
  if (!rukn) {
    return repositoryErr(
      'Validation',
      'Work requires an existing Rukn (ruknId).',
    )
  }

  const responsibilityId = row.responsibilityId?.trim()
  const related = responsibilityId
    ? responsibilities.getById(responsibilityId)
    : undefined
  if (related && !related.ok) return related
  const consistency = validateWorkResponsibilityConsistency(row, related?.data)
  if (consistency) return repositoryErr('Validation', consistency)

  return null
}

export function applyWorkHydrate(rows: Work[]): void {
  workCache.set([...rows])
}

/** Soft-read Work: Admin all; Rukn own assignee (`ruknId`). */
export async function readWorkCollectionsForClient(): Promise<Work[]> {
  return readScopedByRuknId<Work>(FIRESTORE_COLLECTIONS.work, 'work')
}

export function resetWorkCachesForTests(): void {
  workCache.reset([])
}

export class WorkFirestoreRepository implements WorkRepository {
  private readonly units: UnitRepository
  private readonly rukns: RuknRepository
  private readonly responsibilities: ResponsibilityRepository

  constructor(
    units: UnitRepository,
    rukns: RuknRepository,
    responsibilities: ResponsibilityRepository,
  ) {
    this.units = units
    this.rukns = rukns
    this.responsibilities = responsibilities
  }

  loadAll(): RepositoryResult<readonly Work[]> {
    return repositoryOk([...workCache.get()])
  }

  getById(id: string): RepositoryResult<Work | undefined> {
    return repositoryOk(workCache.get().find((row) => row.id === id))
  }

  listByRuknId(ruknId: string): RepositoryResult<readonly Work[]> {
    return repositoryOk(workCache.get().filter((row) => row.ruknId === ruknId))
  }

  listByUnitId(unitId: string): RepositoryResult<readonly Work[]> {
    return repositoryOk(workCache.get().filter((row) => row.unitId === unitId))
  }

  listByResponsibilityId(
    responsibilityId: string,
  ): RepositoryResult<readonly Work[]> {
    return repositoryOk(
      workCache.get().filter((row) => row.responsibilityId === responsibilityId),
    )
  }

  async saveDurable(work: Work): Promise<RepositoryResult<Work>> {
    const invalid = validateWorkParents(
      work,
      this.units,
      this.rukns,
      this.responsibilities,
    )
    if (invalid) return invalid

    const existing = workCache.get().find((row) => row.id === work.id)
    const transition = validateWorkStatusTransition(existing?.status, work.status)
    if (transition) return repositoryErr('Validation', transition)

    const write = await writeDoc(
      getFirestoreDb(),
      FIRESTORE_COLLECTIONS.work,
      work.id,
      sanitizeForFirestore(work),
    )
    if (!write.ok) {
      console.error('[phase4] work saveDurable failed', {
        module: 'work',
        operation: 'saveDurable',
        result: 'error',
        id: work.id,
        ruknId: work.ruknId,
        unitId: work.unitId,
        error: write.error,
      })
      return write
    }
    workCache.set(upsertById(workCache.get(), work))
    console.info('[phase4] work saveDurable success', {
      module: 'work',
      operation: 'saveDurable',
      result: 'ok',
      id: work.id,
      ruknId: work.ruknId,
      unitId: work.unitId,
    })
    return repositoryOk(work)
  }
}
