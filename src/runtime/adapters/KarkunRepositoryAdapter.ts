/**
 * Concrete Karkun / Connection / Execution adapter (KC-005 Sprint 2.1).
 *
 * Purpose: Bridge people and assignment repositories to KarkunAdapter contract.
 * Never exposes registry or assignment entities directly.
 */

import {
  BaseRepositoryAdapter,
  DEFAULT_READ_CAPABILITIES,
  adapterErr,
  adapterOk,
  mapRepositoryFailureResult,
  type AdapterAssignedKarkun,
  type AdapterConnectionInfo,
  type AdapterJourneyStage,
  type AdapterJourneyState,
  type AdapterResult,
  type AdapterScope,
  type KarkunAdapter,
} from '@/conversation/adapters'
import type { ConversationKarkunRef } from '@/conversation/ConversationContext'
import type {
  ConnectionRepository,
  ExecutionRepository,
  KarkunRepository,
} from '@/repositories/interfaces'
import type { JourneyStageId } from '@/types/guidance'
import { mapRepositoryResult, resolveAdapterAvailability } from './adapterResult'

function mapJourneyStage(stageId?: JourneyStageId): AdapterJourneyStage {
  switch (stageId) {
    case 'connected':
      return 'connected'
    case 'first-meeting':
      return 'first_meeting'
    case 'jih-registration':
    case 'orientation':
      return 'follow_up'
    case 'participation':
    case 'regular-contact':
      return 'deepening'
    case 'development':
      return 'completed'
    default:
      return stageId ? 'unknown' : 'not_started'
  }
}

function toKarkunRef(id: string, name?: string): ConversationKarkunRef {
  return { karkunId: id, karkunName: name }
}

export class KarkunRepositoryAdapter extends BaseRepositoryAdapter implements KarkunAdapter {
  readonly adapterId = 'karkun' as const

  private readonly karkunRepository: KarkunRepository
  private readonly connectionRepository: ConnectionRepository
  private readonly executionRepository: ExecutionRepository

  constructor(
    karkunRepository: KarkunRepository,
    connectionRepository: ConnectionRepository,
    executionRepository: ExecutionRepository,
  ) {
    super()
    this.karkunRepository = karkunRepository
    this.connectionRepository = connectionRepository
    this.executionRepository = executionRepository
    this.setCapabilities({
      ...DEFAULT_READ_CAPABILITIES,
      supportsOffline: true,
      supportsHistory: true,
    })
    this.setAvailability(resolveAdapterAvailability())
  }

  lookupKarkun(karkunId: string): AdapterResult<ConversationKarkunRef> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }

    const result = this.karkunRepository.loadState()
    if (!result.ok) {
      return mapRepositoryFailureResult(this.adapterId, result.error.code, result.error.message)
    }

    const record = result.data.karkuns.find((karkun) => karkun.id === karkunId)
    if (!record) {
      return adapterErr(
        'RecordNotFound',
        `Karkun "${karkunId}" was not found.`,
        this.adapterId,
        availability,
      )
    }

    return adapterOk(toKarkunRef(record.id, record.name), availability)
  }

  lookupAssignedKarkuns(scope: AdapterScope): AdapterResult<readonly AdapterAssignedKarkun[]> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }

    const connectionResult = this.connectionRepository.loadState()
    if (!connectionResult.ok) {
      return mapRepositoryFailureResult(
        this.adapterId,
        connectionResult.error.code,
        connectionResult.error.message,
      )
    }

    const karkunResult = this.karkunRepository.loadState()
    if (!karkunResult.ok) {
      return mapRepositoryFailureResult(
        this.adapterId,
        karkunResult.error.code,
        karkunResult.error.message,
      )
    }

    const nameById = new Map(
      karkunResult.data.karkuns.map((karkun) => [karkun.id, karkun.name] as const),
    )

    const assigned = connectionResult.data.assignments
      .filter((assignment) => assignment.status === 'Active')
      .filter((assignment) => !scope.ruknId || assignment.ruknId === scope.ruknId)
      .map(
        (assignment): AdapterAssignedKarkun => ({
          karkunId: assignment.karkunId,
          karkunName: nameById.get(assignment.karkunId),
          ruknId: assignment.ruknId,
          connectionStatus: assignment.status,
        }),
      )

    return adapterOk(assigned, availability)
  }

  lookupJourneyStatus(karkunId: string): AdapterResult<AdapterJourneyState> {
    return mapRepositoryResult(
      this.adapterId,
      this.executionRepository.loadGuidanceState(),
      (state): AdapterJourneyState => {
        const events = state.timelineEvents
          .filter((event) => event.karkunId === karkunId && event.stageId)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))

        const latest = events[0]
        return {
          karkunId,
          stage: mapJourneyStage(latest?.stageId),
          lastUpdatedAt: latest ? Date.parse(latest.occurredAt) || undefined : undefined,
        }
      },
    )
  }

  lookupConnectionInfo(
    karkunId: string,
    scope?: AdapterScope,
  ): AdapterResult<AdapterConnectionInfo> {
    const availability = resolveAdapterAvailability()
    if (availability === 'offline') {
      return mapRepositoryFailureResult(this.adapterId, 'Offline', 'Repository is offline.', 'offline')
    }

    const result = this.connectionRepository.loadState()
    if (!result.ok) {
      return mapRepositoryFailureResult(this.adapterId, result.error.code, result.error.message)
    }

    const match = result.data.assignments
      .filter((assignment) => assignment.karkunId === karkunId)
      .filter((assignment) => !scope?.ruknId || assignment.ruknId === scope.ruknId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

    if (!match) {
      return adapterErr(
        'RecordNotFound',
        `No connection found for karkun "${karkunId}".`,
        this.adapterId,
        availability,
      )
    }

    const info: AdapterConnectionInfo = {
      karkunId: match.karkunId,
      ruknId: match.ruknId,
      connectionStatus: match.status,
      connectedAt: Date.parse(match.assignedDate) || undefined,
      releasedAt: match.endedDate ? Date.parse(match.endedDate) || undefined : undefined,
    }

    return adapterOk(info, availability)
  }
}
