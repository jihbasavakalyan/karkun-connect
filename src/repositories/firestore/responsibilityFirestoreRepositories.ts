/**
 * Phase 4 — Firestore persistence for Responsibility.
 * Per-document upsert via existing writeDoc helpers. Admin-owned collection.
 * Soft-read on hydrate (Rukn permission-denied → empty). No LWW blob.
 * Existing Rukn + Unit parents validated before durable write. Does not mutate people.
 */

import { collection, getDocs, type DocumentData } from 'firebase/firestore'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import {
  repositoryErr,
  repositoryOk,
  type RepositoryResult,
} from '@/repositories/errors'
import type { ResponsibilityRepository } from '@/repositories/interfaces/ResponsibilityRepository'
import type { RuknRepository } from '@/repositories/interfaces/RuknRepository'
import type { UnitRepository } from '@/repositories/interfaces/UnitRepository'
import type { Responsibility } from '@/types/responsibility.types'
import { validateResponsibilityShape } from '@/lib/responsibility/validate'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  sanitizeForFirestore,
  stripMeta,
  writeDoc,
} from '@/repositories/firestore/firestoreHelpers'
import { SyncCache } from '@/repositories/firestore/cache'

const responsibilityCache = new SyncCache<Responsibility[]>([])

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code) : ''
  return code === 'permission-denied' || code.includes('permission-denied')
}

async function softReadCollection<T>(
  collectionName: string,
  label: string,
): Promise<T[]> {
  try {
    const snap = await getDocs(collection(getFirestoreDb(), collectionName))
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

function validateResponsibilityParents(
  row: Responsibility,
  units: UnitRepository,
  rukns: RuknRepository,
): RepositoryResult<Responsibility> | null {
  const shape = validateResponsibilityShape(row)
  if (shape) return repositoryErr('Validation', shape)

  const unit = units.getById(row.unitId)
  if (!unit.ok || !unit.data) {
    return repositoryErr(
      'Validation',
      'Responsibility requires an existing Unit / Scope (unitId).',
    )
  }

  const people = rukns.loadAll()
  if (!people.ok) return people
  const rukn = people.data.find((item) => item.id === row.ruknId)
  if (!rukn) {
    return repositoryErr(
      'Validation',
      'Responsibility requires an existing Rukn (ruknId).',
    )
  }
  return null
}

export function applyResponsibilityHydrate(rows: Responsibility[]): void {
  responsibilityCache.set([...rows])
}

/** Soft-read Responsibility collection for background hydrate (Admin-only rules). */
export async function readResponsibilityCollectionsForClient(): Promise<
  Responsibility[]
> {
  return softReadCollection<Responsibility>(
    FIRESTORE_COLLECTIONS.responsibilities,
    'responsibilities',
  )
}

export function resetResponsibilityCachesForTests(): void {
  responsibilityCache.reset([])
}

export class ResponsibilityFirestoreRepository implements ResponsibilityRepository {
  private readonly units: UnitRepository
  private readonly rukns: RuknRepository

  constructor(units: UnitRepository, rukns: RuknRepository) {
    this.units = units
    this.rukns = rukns
  }

  loadAll(): RepositoryResult<readonly Responsibility[]> {
    return repositoryOk([...responsibilityCache.get()])
  }

  getById(id: string): RepositoryResult<Responsibility | undefined> {
    return repositoryOk(responsibilityCache.get().find((row) => row.id === id))
  }

  listByRuknId(ruknId: string): RepositoryResult<readonly Responsibility[]> {
    return repositoryOk(
      responsibilityCache.get().filter((row) => row.ruknId === ruknId),
    )
  }

  listByUnitId(unitId: string): RepositoryResult<readonly Responsibility[]> {
    return repositoryOk(
      responsibilityCache.get().filter((row) => row.unitId === unitId),
    )
  }

  async saveDurable(
    responsibility: Responsibility,
  ): Promise<RepositoryResult<Responsibility>> {
    const invalid = validateResponsibilityParents(
      responsibility,
      this.units,
      this.rukns,
    )
    if (invalid) return invalid

    const write = await writeDoc(
      getFirestoreDb(),
      FIRESTORE_COLLECTIONS.responsibilities,
      responsibility.id,
      sanitizeForFirestore(responsibility),
    )
    if (!write.ok) {
      console.error('[phase4] responsibilities saveDurable failed', {
        module: 'responsibilities',
        operation: 'saveDurable',
        result: 'error',
        id: responsibility.id,
        ruknId: responsibility.ruknId,
        unitId: responsibility.unitId,
        error: write.error,
      })
      return write
    }
    responsibilityCache.set(upsertById(responsibilityCache.get(), responsibility))
    console.info('[phase4] responsibilities saveDurable success', {
      module: 'responsibilities',
      operation: 'saveDurable',
      result: 'ok',
      id: responsibility.id,
      ruknId: responsibility.ruknId,
      unitId: responsibility.unitId,
    })
    return repositoryOk(responsibility)
  }
}
