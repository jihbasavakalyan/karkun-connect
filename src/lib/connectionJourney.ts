import {
  JOURNEY_STAGE_LABELS,
  JOURNEY_STAGE_ORDER,
  type JourneyStageId,
} from '@/types/guidance'
import {
  isStageComplete,
  resolveCurrentJourneyStage,
} from '@/lib/guidance/journeyEngine'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type ConnectionProgressStep = {
  id: string
  label: string
  complete: boolean
  current: boolean
}

export type ConnectionJourneySnapshot = {
  currentStage: JourneyStageId
  stageLabel: string
  steps: ConnectionProgressStep[]
  completedCount: number
  totalCount: number
  /** @deprecated use currentStage — kept for compatibility */
  hasVisit: boolean
  jihRegistered: boolean
  regularContact: boolean
  isActive: boolean
}

export function buildConnectionJourney(
  karkun: KarkunRegistryRecord,
  assignmentId: string | undefined,
): ConnectionJourneySnapshot {
  const { currentStage, stagesCompleted } = resolveCurrentJourneyStage(karkun, assignmentId)

  const steps: ConnectionProgressStep[] = JOURNEY_STAGE_ORDER.map((stageId) => ({
    id: stageId,
    label: JOURNEY_STAGE_LABELS[stageId],
    complete: stagesCompleted.includes(stageId),
    current: stageId === currentStage,
  }))

  return {
    currentStage,
    stageLabel: JOURNEY_STAGE_LABELS[currentStage],
    steps,
    completedCount: stagesCompleted.length,
    totalCount: JOURNEY_STAGE_ORDER.length,
    hasVisit: isStageComplete('first-meeting', karkun, assignmentId),
    jihRegistered: isStageComplete('jih-registration', karkun, assignmentId),
    regularContact: isStageComplete('regular-contact', karkun, assignmentId),
    isActive: isStageComplete('development', karkun, assignmentId),
  }
}
