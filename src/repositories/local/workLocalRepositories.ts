/**
 * Phase 4 — local/mock provider persistence for Work.
 * Uses existing browserStorage + STORAGE_KEYS.
 * Rukn, Unit, and optional Responsibility parents validated via existing repositories.
 */

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
import {
  repositoryErr,
  repositoryOk,
  tryRepository,
  type RepositoryResult,
} from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { loadJsonFromStorage, saveJsonToStorage } from '@/lib/browserStorage'

function loadWork(): Work[] {
  return loadJsonFromStorage<Work[]>(STORAGE_KEYS.work, [])
}

function saveWork(rows: Work[]): void {
  saveJsonToStorage(STORAGE_KEYS.work, rows)
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

export class WorkLocalRepository implements WorkRepository {
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
    return tryRepository(() => [...loadWork()])
  }

  getById(id: string): RepositoryResult<Work | undefined> {
    return tryRepository(() => loadWork().find((row) => row.id === id))
  }

  listByRuknId(ruknId: string): RepositoryResult<readonly Work[]> {
    return tryRepository(() => loadWork().filter((row) => row.ruknId === ruknId))
  }

  listByUnitId(unitId: string): RepositoryResult<readonly Work[]> {
    return tryRepository(() => loadWork().filter((row) => row.unitId === unitId))
  }

  listByResponsibilityId(
    responsibilityId: string,
  ): RepositoryResult<readonly Work[]> {
    return tryRepository(() =>
      loadWork().filter((row) => row.responsibilityId === responsibilityId),
    )
  }

  async saveDurable(work: Work): Promise<RepositoryResult<Work>> {
    try {
      const invalid = validateWorkParents(
        work,
        this.units,
        this.rukns,
        this.responsibilities,
      )
      if (invalid) return invalid

      const existing = loadWork().find((row) => row.id === work.id)
      const transition = validateWorkStatusTransition(existing?.status, work.status)
      if (transition) return repositoryErr('Validation', transition)

      saveWork(upsertById(loadWork(), work))
      return repositoryOk(work)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local Work save failed.', cause)
    }
  }
}

/** Test helper — clears local Work storage. */
export function clearLocalWorkForTests(): RepositoryResult<void> {
  return tryRepository(() => {
    saveWork([])
    return undefined
  })
}
