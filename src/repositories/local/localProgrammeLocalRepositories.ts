/**
 * Local/mock provider persistence for سرگرمی (collection remains `localProgrammes`).
 * Uses existing browserStorage + STORAGE_KEYS. Objective parent validated via ObjectiveRepository.
 */

import type { CampaignRepository } from '@/repositories/interfaces/CampaignRepository'
import type { LocalProgrammeRepository } from '@/repositories/interfaces/LocalProgrammeRepository'
import type { ObjectiveRepository } from '@/repositories/interfaces/ObjectiveRepository'
import { activityYearStatusValidationError } from '@/lib/planning/activityYearStatus'
import type {
  LocalProgramme,
  LocalProgrammeStatus,
  ProgrammeKind,
} from '@/types/localProgramme.types'
import {
  repositoryErr,
  repositoryOk,
  tryRepository,
  type RepositoryResult,
} from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { loadJsonFromStorage, saveJsonToStorage } from '@/lib/browserStorage'

const PROGRAMME_KINDS: ReadonlySet<ProgrammeKind> = new Set([
  'weekly_ijtema',
  'monthly_baitul_maal',
  'campaign_execution',
  'follow_up',
  'other',
])

const PROGRAMME_STATUSES: ReadonlySet<LocalProgrammeStatus> = new Set([
  'draft',
  'active',
  'archived',
])

function loadProgrammes(): LocalProgramme[] {
  return loadJsonFromStorage<LocalProgramme[]>(STORAGE_KEYS.localProgrammes, [])
}

function saveProgrammes(rows: LocalProgramme[]): void {
  saveJsonToStorage(STORAGE_KEYS.localProgrammes, rows)
}

function upsertById<T extends { id: string }>(rows: T[], next: T): T[] {
  return [next, ...rows.filter((row) => row.id !== next.id)]
}

function validateProgramme(
  programme: LocalProgramme,
  objectives: ObjectiveRepository,
  campaigns: CampaignRepository,
): RepositoryResult<LocalProgramme> | null {
  if (!programme.id?.trim() || !programme.name?.trim()) {
    return repositoryErr('Validation', 'Activity requires id and name.')
  }
  if (!programme.objectiveId?.trim()) {
    return repositoryErr(
      'Validation',
      'Activity requires objectiveId (belongs to one اہداف).',
    )
  }
  if (!PROGRAMME_KINDS.has(programme.kind)) {
    return repositoryErr('Validation', 'Activity requires a valid kind.')
  }
  if (!PROGRAMME_STATUSES.has(programme.status)) {
    return repositoryErr('Validation', 'Activity requires a valid status.')
  }
  const yearStatusError = activityYearStatusValidationError(programme.yearStatuses)
  if (yearStatusError) {
    return repositoryErr('Validation', yearStatusError)
  }
  const parent = objectives.getById(programme.objectiveId)
  if (!parent.ok || !parent.data) {
    return repositoryErr(
      'Validation',
      'Activity requires an existing Objective (objectiveId).',
    )
  }
  const campaignId = programme.campaignId?.trim()
  if (campaignId) {
    const campaign = campaigns.getById(campaignId)
    if (!campaign.ok || !campaign.data) {
      return repositoryErr(
        'Validation',
        'Activity campaignId must reference an existing Campaign.',
      )
    }
  }
  return null
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
    return tryRepository(() =>
      loadProgrammes().filter((row) => row.objectiveId === objectiveId),
    )
  }

  listByCampaignId(
    campaignId: string,
  ): RepositoryResult<readonly LocalProgramme[]> {
    return tryRepository(() =>
      loadProgrammes().filter((row) => row.campaignId === campaignId),
    )
  }

  async saveDurable(
    programme: LocalProgramme,
  ): Promise<RepositoryResult<LocalProgramme>> {
    try {
      const invalid = validateProgramme(programme, this.objectives, this.campaigns)
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
