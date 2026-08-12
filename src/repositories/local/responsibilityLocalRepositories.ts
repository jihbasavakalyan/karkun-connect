/**
 * Phase 4 — local/mock provider persistence for Responsibility.
 * Uses existing browserStorage + STORAGE_KEYS.
 * Rukn and Unit parents validated via existing repositories (no person/unit mutation).
 */

import type { ResponsibilityRepository } from '@/repositories/interfaces/ResponsibilityRepository'
import type { RuknRepository } from '@/repositories/interfaces/RuknRepository'
import type { UnitRepository } from '@/repositories/interfaces/UnitRepository'
import type { Responsibility } from '@/types/responsibility.types'
import { validateResponsibilityShape } from '@/lib/responsibility/validate'
import {
  repositoryErr,
  repositoryOk,
  tryRepository,
  type RepositoryResult,
} from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { loadJsonFromStorage, saveJsonToStorage } from '@/lib/browserStorage'

function loadResponsibilities(): Responsibility[] {
  return loadJsonFromStorage<Responsibility[]>(STORAGE_KEYS.responsibilities, [])
}

function saveResponsibilities(rows: Responsibility[]): void {
  saveJsonToStorage(STORAGE_KEYS.responsibilities, rows)
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

export class ResponsibilityLocalRepository implements ResponsibilityRepository {
  private readonly units: UnitRepository
  private readonly rukns: RuknRepository

  constructor(units: UnitRepository, rukns: RuknRepository) {
    this.units = units
    this.rukns = rukns
  }

  loadAll(): RepositoryResult<readonly Responsibility[]> {
    return tryRepository(() => [...loadResponsibilities()])
  }

  getById(id: string): RepositoryResult<Responsibility | undefined> {
    return tryRepository(() => loadResponsibilities().find((row) => row.id === id))
  }

  listByRuknId(ruknId: string): RepositoryResult<readonly Responsibility[]> {
    return tryRepository(() =>
      loadResponsibilities().filter((row) => row.ruknId === ruknId),
    )
  }

  listByUnitId(unitId: string): RepositoryResult<readonly Responsibility[]> {
    return tryRepository(() =>
      loadResponsibilities().filter((row) => row.unitId === unitId),
    )
  }

  async saveDurable(
    responsibility: Responsibility,
  ): Promise<RepositoryResult<Responsibility>> {
    try {
      const invalid = validateResponsibilityParents(
        responsibility,
        this.units,
        this.rukns,
      )
      if (invalid) return invalid
      saveResponsibilities(upsertById(loadResponsibilities(), responsibility))
      return repositoryOk(responsibility)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local Responsibility save failed.', cause)
    }
  }
}

/** Test helper — clears local Responsibility storage. */
export function clearLocalResponsibilitiesForTests(): RepositoryResult<void> {
  return tryRepository(() => {
    saveResponsibilities([])
    return undefined
  })
}
