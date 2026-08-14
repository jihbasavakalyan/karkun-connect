/**
 * Local/mock provider persistence for planning entities.
 * Uses existing browserStorage + STORAGE_KEYS (parity with AssignmentReview local).
 */

import type { MeqatiMansoobaRepository } from '@/repositories/interfaces/MeqatiMansoobaRepository'
import type { ObjectiveRepository } from '@/repositories/interfaces/ObjectiveRepository'
import type { ShobahRepository } from '@/repositories/interfaces/ShobahRepository'
import type { UnitRepository } from '@/repositories/interfaces/UnitRepository'
import type {
  MeqatiMansooba,
  PlanningObjective,
  Shobah,
  Unit,
} from '@/types/planning.types'
import {
  repositoryErr,
  repositoryOk,
  tryRepository,
  type RepositoryResult,
} from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { loadJsonFromStorage, saveJsonToStorage } from '@/lib/browserStorage'

function loadMansoobas(): MeqatiMansooba[] {
  return loadJsonFromStorage<MeqatiMansooba[]>(STORAGE_KEYS.meqatiMansoobas, [])
}

function saveMansoobas(rows: MeqatiMansooba[]): void {
  saveJsonToStorage(STORAGE_KEYS.meqatiMansoobas, rows)
}

function loadShobahs(): Shobah[] {
  return loadJsonFromStorage<Shobah[]>(STORAGE_KEYS.shobahs, [])
}

function saveShobahs(rows: Shobah[]): void {
  saveJsonToStorage(STORAGE_KEYS.shobahs, rows)
}

function loadObjectives(): PlanningObjective[] {
  return loadJsonFromStorage<PlanningObjective[]>(STORAGE_KEYS.planningObjectives, [])
}

function saveObjectives(rows: PlanningObjective[]): void {
  saveJsonToStorage(STORAGE_KEYS.planningObjectives, rows)
}

function loadUnits(): Unit[] {
  return loadJsonFromStorage<Unit[]>(STORAGE_KEYS.units, [])
}

function saveUnits(rows: Unit[]): void {
  saveJsonToStorage(STORAGE_KEYS.units, rows)
}

function upsertById<T extends { id: string }>(rows: T[], next: T): T[] {
  return [next, ...rows.filter((row) => row.id !== next.id)]
}

export class MeqatiMansoobaLocalRepository implements MeqatiMansoobaRepository {
  loadAll(): RepositoryResult<readonly MeqatiMansooba[]> {
    return tryRepository(() => [...loadMansoobas()])
  }

  getById(id: string): RepositoryResult<MeqatiMansooba | undefined> {
    return tryRepository(() => loadMansoobas().find((row) => row.id === id))
  }

  getActive(): RepositoryResult<MeqatiMansooba | undefined> {
    return tryRepository(() => loadMansoobas().find((row) => row.status === 'active'))
  }

  async saveDurable(
    mansooba: MeqatiMansooba,
  ): Promise<RepositoryResult<MeqatiMansooba>> {
    try {
      if (!mansooba.id?.trim() || !mansooba.name?.trim()) {
        return repositoryErr('Validation', 'Meqati Mansooba requires id and name.')
      }
      saveMansoobas(upsertById(loadMansoobas(), mansooba))
      return repositoryOk(mansooba)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local Meqati Mansooba save failed.', cause)
    }
  }
}

export class ShobahLocalRepository implements ShobahRepository {
  loadAll(): RepositoryResult<readonly Shobah[]> {
    return tryRepository(() => [...loadShobahs()])
  }

  getById(id: string): RepositoryResult<Shobah | undefined> {
    return tryRepository(() => loadShobahs().find((row) => row.id === id))
  }

  listByMansoobaId(mansoobaId: string): RepositoryResult<readonly Shobah[]> {
    return tryRepository(() =>
      loadShobahs().filter((row) => row.mansoobaId === mansoobaId),
    )
  }

  async saveDurable(shobah: Shobah): Promise<RepositoryResult<Shobah>> {
    try {
      if (!shobah.id?.trim() || !shobah.name?.trim()) {
        return repositoryErr('Validation', 'Shobah requires id and name.')
      }
      if (!shobah.mansoobaId?.trim()) {
        return repositoryErr(
          'Validation',
          'Shobah requires mansoobaId (belongs to one Meqati Mansooba).',
        )
      }
      saveShobahs(upsertById(loadShobahs(), shobah))
      return repositoryOk(shobah)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local Shobah save failed.', cause)
    }
  }
}

export class ObjectiveLocalRepository implements ObjectiveRepository {
  loadAll(): RepositoryResult<readonly PlanningObjective[]> {
    return tryRepository(() => [...loadObjectives()])
  }

  getById(id: string): RepositoryResult<PlanningObjective | undefined> {
    return tryRepository(() => loadObjectives().find((row) => row.id === id))
  }

  listByMansoobaId(
    mansoobaId: string,
  ): RepositoryResult<readonly PlanningObjective[]> {
    return tryRepository(() =>
      loadObjectives().filter((row) => row.mansoobaId === mansoobaId),
    )
  }

  listByShobahId(shobahId: string): RepositoryResult<readonly PlanningObjective[]> {
    return tryRepository(() =>
      loadObjectives().filter((row) => row.shobahId === shobahId),
    )
  }

  async saveDurable(
    objective: PlanningObjective,
  ): Promise<RepositoryResult<PlanningObjective>> {
    try {
      if (!objective.id?.trim() || !objective.title?.trim()) {
        return repositoryErr('Validation', 'Objective requires id and title.')
      }
      if (!objective.mansoobaId?.trim()) {
        return repositoryErr(
          'Validation',
          'Objective requires mansoobaId (belongs to one Meqati Mansooba).',
        )
      }
      if (!objective.shobahId?.trim()) {
        return repositoryErr(
          'Validation',
          'Objective requires shobahId (belongs to one شعبہ).',
        )
      }
      saveObjectives(upsertById(loadObjectives(), objective))
      return repositoryOk(objective)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local Objective save failed.', cause)
    }
  }
}

export class UnitLocalRepository implements UnitRepository {
  loadAll(): RepositoryResult<readonly Unit[]> {
    return tryRepository(() => [...loadUnits()])
  }

  getById(id: string): RepositoryResult<Unit | undefined> {
    return tryRepository(() => loadUnits().find((row) => row.id === id))
  }

  async saveDurable(unit: Unit): Promise<RepositoryResult<Unit>> {
    try {
      if (!unit.id?.trim() || !unit.name?.trim()) {
        return repositoryErr('Validation', 'Unit requires id and name.')
      }
      saveUnits(upsertById(loadUnits(), unit))
      return repositoryOk(unit)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local Unit save failed.', cause)
    }
  }
}

/** Test helper — clears local planning storage. */
export function clearLocalPlanningForTests(): RepositoryResult<void> {
  return tryRepository(() => {
    saveMansoobas([])
    saveShobahs([])
    saveObjectives([])
    saveUnits([])
    return undefined
  })
}

/** Known parent ids for local activity save tests. */
export const VERIFY_ACTIVITY_OBJECTIVE_ID = 'objective-verify-parent'

/** Seed Meqati → شعبہ → اہداف so activity saveDurable can resolve objectiveId. */
export async function seedLocalPlanningParentForTests(): Promise<void> {
  const now = new Date().toISOString()
  const mansooba: MeqatiMansooba = {
    id: 'mansooba-verify-parent',
    name: 'Verify Mansooba',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const shobah: Shobah = {
    id: 'shobah-verify-parent',
    mansoobaId: mansooba.id,
    name: 'Verify Shobah',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  const objective: PlanningObjective = {
    id: VERIFY_ACTIVITY_OBJECTIVE_ID,
    mansoobaId: mansooba.id,
    shobahId: shobah.id,
    title: 'Verify Objective',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: 'verify',
    updatedBy: 'verify',
  }
  await new MeqatiMansoobaLocalRepository().saveDurable(mansooba)
  await new ShobahLocalRepository().saveDurable(shobah)
  await new ObjectiveLocalRepository().saveDurable(objective)
}
