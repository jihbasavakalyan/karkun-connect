/**
 * Phase 1 — Firestore persistence for Meqati Mansooba / Objective / Unit.
 * Per-document upsert via existing writeDoc helpers. Admin-owned collections.
 * Soft-read on hydrate (Rukn permission-denied → empty). No LWW blob.
 */

import { collection, getDocs, type DocumentData } from 'firebase/firestore'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import {
  repositoryErr,
  repositoryOk,
  type RepositoryResult,
} from '@/repositories/errors'
import type { MeqatiMansoobaRepository } from '@/repositories/interfaces/MeqatiMansoobaRepository'
import type { ObjectiveRepository } from '@/repositories/interfaces/ObjectiveRepository'
import type { UnitRepository } from '@/repositories/interfaces/UnitRepository'
import type {
  MeqatiMansooba,
  PlanningObjective,
  Unit,
} from '@/types/planning.types'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  sanitizeForFirestore,
  stripMeta,
  writeDoc,
} from '@/repositories/firestore/firestoreHelpers'
import { SyncCache } from '@/repositories/firestore/cache'

const mansoobaCache = new SyncCache<MeqatiMansooba[]>([])
const objectiveCache = new SyncCache<PlanningObjective[]>([])
const unitCache = new SyncCache<Unit[]>([])

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

export function applyMeqatiMansoobaHydrate(rows: MeqatiMansooba[]): void {
  mansoobaCache.set([...rows])
}

export function applyPlanningObjectiveHydrate(rows: PlanningObjective[]): void {
  objectiveCache.set([...rows])
}

export function applyUnitHydrate(rows: Unit[]): void {
  unitCache.set([...rows])
}

/** Soft-read planning collections for background hydrate (Admin-only rules). */
export async function readPlanningCollectionsForClient(): Promise<{
  mansoobas: MeqatiMansooba[]
  objectives: PlanningObjective[]
  units: Unit[]
}> {
  const [mansoobas, objectives, units] = await Promise.all([
    softReadCollection<MeqatiMansooba>(
      FIRESTORE_COLLECTIONS.meqatiMansoobas,
      'meqatiMansoobas',
    ),
    softReadCollection<PlanningObjective>(
      FIRESTORE_COLLECTIONS.objectives,
      'objectives',
    ),
    softReadCollection<Unit>(FIRESTORE_COLLECTIONS.units, 'units'),
  ])
  return { mansoobas, objectives, units }
}

export function applyPlanningHydrate(input: {
  mansoobas: MeqatiMansooba[]
  objectives: PlanningObjective[]
  units: Unit[]
}): void {
  applyMeqatiMansoobaHydrate(input.mansoobas)
  applyPlanningObjectiveHydrate(input.objectives)
  applyUnitHydrate(input.units)
}

export function resetPlanningCachesForTests(): void {
  mansoobaCache.reset([])
  objectiveCache.reset([])
  unitCache.reset([])
}

export class MeqatiMansoobaFirestoreRepository implements MeqatiMansoobaRepository {
  loadAll(): RepositoryResult<readonly MeqatiMansooba[]> {
    return repositoryOk([...mansoobaCache.get()])
  }

  getById(id: string): RepositoryResult<MeqatiMansooba | undefined> {
    return repositoryOk(mansoobaCache.get().find((row) => row.id === id))
  }

  getActive(): RepositoryResult<MeqatiMansooba | undefined> {
    return repositoryOk(mansoobaCache.get().find((row) => row.status === 'active'))
  }

  async saveDurable(
    mansooba: MeqatiMansooba,
  ): Promise<RepositoryResult<MeqatiMansooba>> {
    if (!mansooba.id?.trim() || !mansooba.name?.trim()) {
      return repositoryErr('Validation', 'Meqati Mansooba requires id and name.')
    }
    const write = await writeDoc(
      getFirestoreDb(),
      FIRESTORE_COLLECTIONS.meqatiMansoobas,
      mansooba.id,
      sanitizeForFirestore(mansooba),
    )
    if (!write.ok) {
      console.error('[phase1] meqatiMansoobas saveDurable failed', {
        module: 'meqatiMansoobas',
        operation: 'saveDurable',
        result: 'error',
        id: mansooba.id,
        error: write.error,
      })
      return write
    }
    mansoobaCache.set(upsertById(mansoobaCache.get(), mansooba))
    console.info('[phase1] meqatiMansoobas saveDurable success', {
      module: 'meqatiMansoobas',
      operation: 'saveDurable',
      result: 'ok',
      id: mansooba.id,
    })
    return repositoryOk(mansooba)
  }
}

export class ObjectiveFirestoreRepository implements ObjectiveRepository {
  loadAll(): RepositoryResult<readonly PlanningObjective[]> {
    return repositoryOk([...objectiveCache.get()])
  }

  getById(id: string): RepositoryResult<PlanningObjective | undefined> {
    return repositoryOk(objectiveCache.get().find((row) => row.id === id))
  }

  listByMansoobaId(
    mansoobaId: string,
  ): RepositoryResult<readonly PlanningObjective[]> {
    return repositoryOk(
      objectiveCache.get().filter((row) => row.mansoobaId === mansoobaId),
    )
  }

  async saveDurable(
    objective: PlanningObjective,
  ): Promise<RepositoryResult<PlanningObjective>> {
    if (!objective.id?.trim() || !objective.title?.trim()) {
      return repositoryErr('Validation', 'Objective requires id and title.')
    }
    if (!objective.mansoobaId?.trim()) {
      return repositoryErr(
        'Validation',
        'Objective requires mansoobaId (belongs to one Meqati Mansooba).',
      )
    }
    const write = await writeDoc(
      getFirestoreDb(),
      FIRESTORE_COLLECTIONS.objectives,
      objective.id,
      sanitizeForFirestore(objective),
    )
    if (!write.ok) {
      console.error('[phase1] objectives saveDurable failed', {
        module: 'objectives',
        operation: 'saveDurable',
        result: 'error',
        id: objective.id,
        error: write.error,
      })
      return write
    }
    objectiveCache.set(upsertById(objectiveCache.get(), objective))
    console.info('[phase1] objectives saveDurable success', {
      module: 'objectives',
      operation: 'saveDurable',
      result: 'ok',
      id: objective.id,
      mansoobaId: objective.mansoobaId,
    })
    return repositoryOk(objective)
  }
}

export class UnitFirestoreRepository implements UnitRepository {
  loadAll(): RepositoryResult<readonly Unit[]> {
    return repositoryOk([...unitCache.get()])
  }

  getById(id: string): RepositoryResult<Unit | undefined> {
    return repositoryOk(unitCache.get().find((row) => row.id === id))
  }

  async saveDurable(unit: Unit): Promise<RepositoryResult<Unit>> {
    if (!unit.id?.trim() || !unit.name?.trim()) {
      return repositoryErr('Validation', 'Unit requires id and name.')
    }
    const write = await writeDoc(
      getFirestoreDb(),
      FIRESTORE_COLLECTIONS.units,
      unit.id,
      sanitizeForFirestore(unit),
    )
    if (!write.ok) {
      console.error('[phase1] units saveDurable failed', {
        module: 'units',
        operation: 'saveDurable',
        result: 'error',
        id: unit.id,
        error: write.error,
      })
      return write
    }
    unitCache.set(upsertById(unitCache.get(), unit))
    console.info('[phase1] units saveDurable success', {
      module: 'units',
      operation: 'saveDurable',
      result: 'ok',
      id: unit.id,
    })
    return repositoryOk(unit)
  }
}
