/**
 * Phase 2 — local/mock provider persistence for Local Programme.
 * Uses existing browserStorage + STORAGE_KEYS. Campaign parent validated via CampaignRepository.
 */

import type { CampaignRepository } from '@/repositories/interfaces/CampaignRepository'
import type { LocalProgrammeRepository } from '@/repositories/interfaces/LocalProgrammeRepository'
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
  campaigns: CampaignRepository,
): RepositoryResult<LocalProgramme> | null {
  if (!programme.id?.trim() || !programme.name?.trim()) {
    return repositoryErr('Validation', 'Local Programme requires id and name.')
  }
  if (!programme.campaignId?.trim()) {
    return repositoryErr(
      'Validation',
      'Local Programme requires campaignId (belongs to one Campaign).',
    )
  }
  if (!PROGRAMME_KINDS.has(programme.kind)) {
    return repositoryErr('Validation', 'Local Programme requires a valid kind.')
  }
  if (!PROGRAMME_STATUSES.has(programme.status)) {
    return repositoryErr('Validation', 'Local Programme requires a valid status.')
  }
  const parent = campaigns.getById(programme.campaignId)
  if (!parent.ok || !parent.data) {
    return repositoryErr(
      'Validation',
      'Local Programme requires an existing Campaign (campaignId).',
    )
  }
  return null
}

export class LocalProgrammeLocalRepository implements LocalProgrammeRepository {
  private readonly campaigns: CampaignRepository

  constructor(campaigns: CampaignRepository) {
    this.campaigns = campaigns
  }

  loadAll(): RepositoryResult<readonly LocalProgramme[]> {
    return tryRepository(() => [...loadProgrammes()])
  }

  getById(id: string): RepositoryResult<LocalProgramme | undefined> {
    return tryRepository(() => loadProgrammes().find((row) => row.id === id))
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
      const invalid = validateProgramme(programme, this.campaigns)
      if (invalid) return invalid
      saveProgrammes(upsertById(loadProgrammes(), programme))
      return repositoryOk(programme)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local Local Programme save failed.', cause)
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
