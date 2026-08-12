/**
 * Phase 3 — local/mock provider persistence for Occurrence.
 * Uses existing browserStorage + STORAGE_KEYS. Programme parent validated via LocalProgrammeRepository.
 */

import type { LocalProgrammeRepository } from '@/repositories/interfaces/LocalProgrammeRepository'
import type { OccurrenceRepository } from '@/repositories/interfaces/OccurrenceRepository'
import type { Occurrence, OccurrenceStatus } from '@/types/occurrence.types'
import {
  repositoryErr,
  repositoryOk,
  tryRepository,
  type RepositoryResult,
} from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { loadJsonFromStorage, saveJsonToStorage } from '@/lib/browserStorage'

const OCCURRENCE_STATUSES: ReadonlySet<OccurrenceStatus> = new Set([
  'scheduled',
  'open',
  'closed',
  'archived',
])

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

function loadOccurrences(): Occurrence[] {
  return loadJsonFromStorage<Occurrence[]>(STORAGE_KEYS.occurrences, [])
}

function saveOccurrences(rows: Occurrence[]): void {
  saveJsonToStorage(STORAGE_KEYS.occurrences, rows)
}

function upsertById<T extends { id: string }>(rows: T[], next: T): T[] {
  return [next, ...rows.filter((row) => row.id !== next.id)]
}

function validateOccurrence(
  occurrence: Occurrence,
  programmes: LocalProgrammeRepository,
): RepositoryResult<Occurrence> | null {
  if (!occurrence.id?.trim()) {
    return repositoryErr('Validation', 'Occurrence requires id.')
  }
  if (!occurrence.programmeId?.trim()) {
    return repositoryErr(
      'Validation',
      'Occurrence requires programmeId (belongs to one Local Programme).',
    )
  }
  if (!DATE_KEY.test(occurrence.occurrenceDate?.trim() ?? '')) {
    return repositoryErr(
      'Validation',
      'Occurrence requires occurrenceDate (YYYY-MM-DD).',
    )
  }
  if (!occurrence.generationKey?.trim()) {
    return repositoryErr('Validation', 'Occurrence requires generationKey.')
  }
  if (!OCCURRENCE_STATUSES.has(occurrence.status)) {
    return repositoryErr('Validation', 'Occurrence requires a valid status.')
  }
  const parent = programmes.getById(occurrence.programmeId)
  if (!parent.ok || !parent.data) {
    return repositoryErr(
      'Validation',
      'Occurrence requires an existing Local Programme (programmeId).',
    )
  }
  return null
}

export class OccurrenceLocalRepository implements OccurrenceRepository {
  private readonly programmes: LocalProgrammeRepository

  constructor(programmes: LocalProgrammeRepository) {
    this.programmes = programmes
  }

  loadAll(): RepositoryResult<readonly Occurrence[]> {
    return tryRepository(() => [...loadOccurrences()])
  }

  getById(id: string): RepositoryResult<Occurrence | undefined> {
    return tryRepository(() => loadOccurrences().find((row) => row.id === id))
  }

  listByProgrammeId(
    programmeId: string,
  ): RepositoryResult<readonly Occurrence[]> {
    return tryRepository(() =>
      loadOccurrences().filter((row) => row.programmeId === programmeId),
    )
  }

  getByGenerationKey(
    generationKey: string,
  ): RepositoryResult<Occurrence | undefined> {
    return tryRepository(() =>
      loadOccurrences().find((row) => row.generationKey === generationKey),
    )
  }

  async saveDurable(
    occurrence: Occurrence,
  ): Promise<RepositoryResult<Occurrence>> {
    try {
      const invalid = validateOccurrence(occurrence, this.programmes)
      if (invalid) return invalid
      saveOccurrences(upsertById(loadOccurrences(), occurrence))
      return repositoryOk(occurrence)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local Occurrence save failed.', cause)
    }
  }
}

/** Test helper — clears local Occurrence storage. */
export function clearLocalOccurrencesForTests(): RepositoryResult<void> {
  return tryRepository(() => {
    saveOccurrences([])
    return undefined
  })
}
