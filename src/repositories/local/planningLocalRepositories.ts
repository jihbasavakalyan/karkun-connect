/**
 * Phase 1 — local/mock provider persistence for planning entities.
 * Uses existing browserStorage + STORAGE_KEYS (parity with AssignmentReview local).
 */

import type { MeqatiMansoobaRepository } from '@/repositories/interfaces/MeqatiMansoobaRepository'
import type { ObjectiveRepository } from '@/repositories/interfaces/ObjectiveRepository'
import type { UnitRepository } from '@/repositories/interfaces/UnitRepository'
import type {
  MeqatiMansooba,
  PlanningObjective,
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
    saveObjectives([])
    saveUnits([])
    return undefined
  })
}
