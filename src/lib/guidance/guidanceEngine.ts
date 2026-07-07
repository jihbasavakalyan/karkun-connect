import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getAssignedKarkunanForRukn } from '@/lib/assignmentEngine'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { resolveCurrentJourneyStage } from '@/lib/guidance/journeyEngine'
import { resolveNextAction } from '@/lib/guidance/nextActionEngine'
import { buildRemindersForKarkun } from '@/lib/guidance/reminderEngine'
import { assessRelationshipHealth } from '@/lib/guidance/relationshipHealthEngine'
import { buildJourneyTimeline } from '@/lib/guidance/timelineEngine'
import { buildSmartSuggestions } from '@/lib/guidance/suggestionEngine'
import { getPendingCommitmentsForKarkun } from '@/services/guidanceService'
import { JOURNEY_STAGE_LABELS, type KarkunGuidance } from '@/types/guidance'

export function getKarkunGuidance(karkunId: string, ruknId?: string): KarkunGuidance | null {
  const karkun = getKarkunById(karkunId)
  if (!karkun) {
    return null
  }

  const assignment = getActiveAssignmentsForKarkun(karkunId).find(
    (record) => !ruknId || record.ruknId === ruknId,
  )
  const assignmentId = assignment?.assignmentId

  const { currentStage, stagesCompleted } = resolveCurrentJourneyStage(karkun, assignmentId)
  const pendingCommitments = getPendingCommitmentsForKarkun(karkunId)
  const upcomingCommitment = pendingCommitments
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0]

  return {
    karkunId,
    karkunName: karkun.name,
    assignmentId,
    currentStage,
    stageLabel: JOURNEY_STAGE_LABELS[currentStage],
    stagesCompleted,
    nextAction: resolveNextAction(karkun, assignmentId, currentStage),
    health: assessRelationshipHealth(karkun, assignmentId, currentStage),
    pendingCommitments,
    upcomingCommitment,
    reminders: buildRemindersForKarkun(karkun, assignmentId),
    timeline: buildJourneyTimeline(karkun),
    suggestions: buildSmartSuggestions(karkun, assignmentId, currentStage),
  }
}

export function getGuidanceForRuknKarkuns(ruknId: string): KarkunGuidance[] {
  const karkuns = getAssignedKarkunanForRukn(ruknId)
  return karkuns
    .map((karkun) => getKarkunGuidance(karkun.id, ruknId))
    .filter((guidance): guidance is KarkunGuidance => guidance !== null)
}
