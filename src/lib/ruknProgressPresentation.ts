/**
 * Rukn-facing journey progress labels (presentation only).
 * Does not change guidance engine stage IDs or progression rules.
 */

import type { JourneyStageId } from '@/types/guidance'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'

/** Canonical Rukn progress milestones (display order). */
export const RUKN_PROGRESS_STAGE_IDS = [
  'connected',
  'jih-registration',
  'orientation',
  'participation',
  'development',
] as const satisfies readonly JourneyStageId[]

export type RuknProgressStageId = (typeof RUKN_PROGRESS_STAGE_IDS)[number]

export const RUKN_PROGRESS_LABELS: Record<RuknProgressStageId, string> = {
  connected: 'Connected',
  'jih-registration': 'Registration',
  orientation: 'Participation in Tarbiyati Programme',
  participation: 'Participation in Weekly Ijtema',
  development: 'Tarbiyah & Development',
}

/** Short labels for compact milestone chips. */
export const RUKN_PROGRESS_SHORT_LABELS: Record<RuknProgressStageId, string> = {
  connected: 'Connected',
  'jih-registration': 'Registration',
  orientation: 'Tarbiyati',
  participation: 'Ijtema',
  development: 'Development',
}

/** Map any engine stage to a Rukn-facing display label. */
export function getRuknJourneyStageLabel(stageId: JourneyStageId): string {
  switch (stageId) {
    case 'connected':
    case 'first-meeting':
      return RUKN_PROGRESS_LABELS.connected
    case 'jih-registration':
      return RUKN_PROGRESS_LABELS['jih-registration']
    case 'orientation':
      return RUKN_PROGRESS_LABELS.orientation
    case 'participation':
    case 'regular-contact':
      return RUKN_PROGRESS_LABELS.participation
    case 'development':
      return RUKN_PROGRESS_LABELS.development
    default:
      return RUKN_PROGRESS_LABELS.connected
  }
}

export type RuknProgressStageView = {
  stageId: RuknProgressStageId
  label: string
  shortLabel: string
  count: number
}

/** Build progress counts from existing guidance snapshots (no new calculations). */
export function buildRuknProgressStages(ruknId: string): RuknProgressStageView[] {
  const guidance = getGuidanceForRuknKarkuns(ruknId)
  const counts = new Map<JourneyStageId, number>()

  for (const item of guidance) {
    counts.set(item.currentStage, (counts.get(item.currentStage) ?? 0) + 1)
  }

  return RUKN_PROGRESS_STAGE_IDS.map((stageId) => ({
    stageId,
    label: RUKN_PROGRESS_LABELS[stageId],
    shortLabel: RUKN_PROGRESS_SHORT_LABELS[stageId],
    count: counts.get(stageId) ?? 0,
  }))
}
