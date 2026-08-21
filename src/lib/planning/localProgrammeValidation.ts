/**
 * LocalProgramme (سرگرمی) validation — Head context + optional Objective.
 * Shared by local and Firestore repositories (no second persistence model).
 */

import { activityYearStatusValidationError } from '@/lib/planning/activityYearStatus'
import {
  repositoryErr,
  type RepositoryResult,
} from '@/repositories/errors'
import type { CampaignRepository } from '@/repositories/interfaces/CampaignRepository'
import type { ObjectiveRepository } from '@/repositories/interfaces/ObjectiveRepository'
import type {
  LocalProgramme,
  LocalProgrammeStatus,
  ProgrammeKind,
} from '@/types/localProgramme.types'

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

/**
 * Validate Meqati Activity before durable write.
 * Returns null when valid; otherwise a Validation RepositoryResult.
 */
export function validateLocalProgrammeForSave(
  programme: LocalProgramme,
  objectives: ObjectiveRepository,
  campaigns: CampaignRepository,
): RepositoryResult<LocalProgramme> | null {
  if (!programme.id?.trim() || !programme.name?.trim()) {
    return repositoryErr('Validation', 'Activity requires id and name.')
  }

  const mansoobaId = programme.mansoobaId?.trim()
  const shobahId = programme.shobahId?.trim()
  if (!mansoobaId) {
    return repositoryErr(
      'Validation',
      'Activity requires mansoobaId (میقاتی منصوبہ context).',
    )
  }
  if (!shobahId) {
    return repositoryErr(
      'Validation',
      'Activity requires shobahId (شعبہ context).',
    )
  }

  // ACTIVITY-FIRST: objectiveId may be null/absent. When supplied, parent must exist
  // and Head context must match the Objective (no inventing / no mismatched parents).
  const objectiveId = programme.objectiveId?.trim()
  if (programme.objectiveId != null && !objectiveId) {
    return repositoryErr(
      'Validation',
      'Activity objectiveId must be an existing Objective id or null.',
    )
  }
  if (objectiveId) {
    const parent = objectives.getById(objectiveId)
    if (!parent.ok || !parent.data) {
      return repositoryErr(
        'Validation',
        'Activity requires an existing Objective (objectiveId).',
      )
    }
    if (parent.data.mansoobaId !== mansoobaId) {
      return repositoryErr(
        'Validation',
        'Activity mansoobaId must match Objective.mansoobaId.',
      )
    }
    if (parent.data.shobahId !== shobahId) {
      return repositoryErr(
        'Validation',
        'Activity shobahId must match Objective.shobahId.',
      )
    }
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
