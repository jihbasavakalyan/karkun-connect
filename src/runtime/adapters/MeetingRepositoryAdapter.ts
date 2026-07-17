/**
 * Concrete Meeting / Execution adapter (KC-005 Sprint 2.1).
 *
 * Purpose: Bridge ExecutionRepository to MeetingAdapter contract.
 * createMeetingRequest remains not implemented (deferred contract only).
 */

import {
  BaseRepositoryAdapter,
  DEFAULT_READ_CAPABILITIES,
  adapterOk,
  type AdapterCreateMeetingResponse,
  type AdapterFollowUp,
  type AdapterMeetingHistoryEntry,
  type AdapterResult,
  type AdapterScope,
  type MeetingAdapter,
} from '@/conversation/adapters'
import type { ConversationMeetingRef } from '@/conversation/ConversationContext'
import type { ExecutionRepository } from '@/repositories/interfaces'
import { mapRepositoryResult, resolveAdapterAvailability } from './adapterResult'

export class MeetingRepositoryAdapter
  extends BaseRepositoryAdapter
  implements MeetingAdapter
{
  readonly adapterId = 'meeting' as const

  private readonly executionRepository: ExecutionRepository

  constructor(executionRepository: ExecutionRepository) {
    super()
    this.executionRepository = executionRepository
    this.setCapabilities({
      ...DEFAULT_READ_CAPABILITIES,
      supportsOffline: true,
      supportsHistory: true,
      canWrite: false,
    })
    this.setAvailability(resolveAdapterAvailability())
  }

  lookupMeetings(scope: AdapterScope): AdapterResult<readonly ConversationMeetingRef[]> {
    return mapRepositoryResult(
      this.adapterId,
      this.executionRepository.loadAnnexureForms(),
      (forms): readonly ConversationMeetingRef[] =>
        forms
          .filter((form) => form.status === 'submitted' || form.status === 'draft')
          .filter((form) => !scope.ruknId || form.ruknId === scope.ruknId)
          .filter((form) => !scope.karkunId || form.karkunId === scope.karkunId)
          .map((form) => ({
            meetingId: form.id,
            karkunId: form.karkunId,
            scheduledAt: form.visitDate || form.submittedAt,
            label: form.workerName,
          })),
    )
  }

  readMeetingHistory(
    karkunId: string,
    scope?: AdapterScope,
  ): AdapterResult<readonly AdapterMeetingHistoryEntry[]> {
    return mapRepositoryResult(
      this.adapterId,
      this.executionRepository.loadAnnexureForms(),
      (forms): readonly AdapterMeetingHistoryEntry[] =>
        forms
          .filter((form) => form.karkunId === karkunId)
          .filter((form) => !scope?.ruknId || form.ruknId === scope.ruknId)
          .filter((form) => form.status === 'submitted')
          .map((form) => ({
            meetingId: form.id,
            karkunId: form.karkunId,
            scheduledAt: form.visitDate || form.submissionDate,
            label: form.workerName,
            outcome: form.visitConducted === 'yes' ? 'conducted' : 'not_conducted',
            recordedAt: Date.parse(form.submittedAt) || undefined,
          })),
    )
  }

  createMeetingRequest(): AdapterResult<AdapterCreateMeetingResponse> {
    const availability = resolveAdapterAvailability()
    const response: AdapterCreateMeetingResponse = {
      accepted: false,
      deferred: true,
      reason: 'not_implemented',
    }
    return adapterOk(response, availability === 'offline' ? 'readonly' : 'readonly')
  }

  lookupFollowUps(scope: AdapterScope): AdapterResult<readonly AdapterFollowUp[]> {
    return mapRepositoryResult(
      this.adapterId,
      this.executionRepository.loadFollowUps(),
      (records): readonly AdapterFollowUp[] =>
        records
          .filter((record) => record.status === 'Pending')
          .filter((record) => !scope.ruknId || record.ruknId === scope.ruknId)
          .filter((record) => !scope.karkunId || record.karkunId === scope.karkunId)
          .map((record) => ({
            karkunId: record.karkunId,
            followUpAt: record.followUpDate,
            label: record.purpose || record.karkunName,
            meetingId: record.sourceFormId,
          })),
    )
  }
}
