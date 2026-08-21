/**
 * Local/mock provider persistence for سرگرمی (collection remains `localProgrammes`).
 * Uses existing browserStorage + STORAGE_KEYS.
 * Head context + optional Objective validated via shared LocalProgramme validation.
 */

import type { CampaignRepository } from '@/repositories/interfaces/CampaignRepository'
import type { LocalProgrammeRepository } from '@/repositories/interfaces/LocalProgrammeRepository'
import type { ObjectiveRepository } from '@/repositories/interfaces/ObjectiveRepository'
import { validateLocalProgrammeForSave } from '@/lib/planning/localProgrammeValidation'
import type { LocalProgramme } from '@/types/localProgramme.types'
import {
  repositoryErr,
  repositoryOk,
  tryRepository,
  type RepositoryResult,
} from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { loadJsonFromStorage, saveJsonToStorage } from '@/lib/browserStorage'

function loadProgrammes(): LocalProgramme[] {
  return loadJsonFromStorage<LocalProgramme[]>(STORAGE_KEYS.localProgrammes, [])
}

function saveProgrammes(rows: LocalProgramme[]): void {
  saveJsonToStorage(STORAGE_KEYS.localProgrammes, rows)
}

function upsertById<T extends { id: string }>(rows: T[], next: T): T[] {
  return [next, ...rows.filter((row) => row.id !== next.id)]
}

export class LocalProgrammeLocalRepository implements LocalProgrammeRepository {
  private readonly objectives: ObjectiveRepository
  private readonly campaigns: CampaignRepository

  constructor(objectives: ObjectiveRepository, campaigns: CampaignRepository) {
    this.objectives = objectives
    this.campaigns = campaigns
  }

  loadAll(): RepositoryResult<readonly LocalProgramme[]> {
    return tryRepository(() => [...loadProgrammes()])
  }

  getById(id: string): RepositoryResult<LocalProgramme | undefined> {
    return tryRepository(() => loadProgrammes().find((row) => row.id === id))
  }

  listByObjectiveId(
    objectiveId: string,
  ): RepositoryResult<readonly LocalProgramme[]> {
    const id = objectiveId.trim()
    if (!id) return tryRepository(() => [])
    return tryRepository(() =>
      loadProgrammes().filter((row) => row.objectiveId === id),
    )
  }

  listByCampaignId(
    campaignId: string,
  ): RepositoryResult<readonly LocalProgramme[]> {
    return tryRepository(() =>
      loadProgrammes().filter((row) => row.campaignId === campaignId),
    )
  }

  listByResponsibleRuknId(
    ruknId: string,
  ): RepositoryResult<readonly LocalProgramme[]> {
    const id = ruknId.trim()
    if (!id) return tryRepository(() => [])
    return tryRepository(() =>
      loadProgrammes().filter((row) => row.responsibleRuknId === id),
    )
  }

  async saveDurable(
    programme: LocalProgramme,
  ): Promise<RepositoryResult<LocalProgramme>> {
    try {
      const invalid = validateLocalProgrammeForSave(
        programme,
        this.objectives,
        this.campaigns,
      )
      if (invalid) return invalid
      saveProgrammes(upsertById(loadProgrammes(), programme))
      return repositoryOk(programme)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local activity save failed.', cause)
    }
  }
}

/** Test helper — clears local Local Programme storage. */
export function clearLocalProgrammesForTests(): RepositoryResult<void> {
  return tryRepository(() => {
    saveProgrammes([])
    return undefined
  })
}
