/**
 * KC-0124 — JourneyBuilder: stage list from existing guidance engine.
 */

import { getKarkunGuidance } from '@/lib/guidance/guidanceEngine'
import { JOURNEY_STAGE_ORDER, JOURNEY_STAGE_LABELS } from '@/types/guidance'

export function buildPersonJourneyStages(personId: string): {
  id: string
  label: string
  complete: boolean
  current: boolean
}[] {
  const guidance = getKarkunGuidance(personId)
  const completed = new Set(guidance?.stagesCompleted ?? [])
  const current = guidance?.currentStage

  return JOURNEY_STAGE_ORDER.map((stageId) => ({
    id: stageId,
    label: JOURNEY_STAGE_LABELS[stageId],
    complete: completed.has(stageId),
    current: current === stageId,
  }))
}
