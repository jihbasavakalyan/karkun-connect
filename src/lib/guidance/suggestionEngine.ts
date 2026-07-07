import { ruknVisitPath } from '@/constants/routes'
import {
  daysSince,
  hasVisitRecorded,
  isJihRegistered,
} from '@/lib/guidance/journeyEngine'
import type { JourneyStageId, SmartSuggestion } from '@/types/guidance'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export function buildSmartSuggestions(
  karkun: KarkunRegistryRecord,
  assignmentId: string | undefined,
  currentStage: JourneyStageId,
): SmartSuggestion[] {
  const route = ruknVisitPath(karkun.id)
  const suggestions: SmartSuggestion[] = []
  const contactGap = daysSince(karkun.lastVisit || karkun.assignmentDate)

  if (!hasVisitRecorded(karkun, assignmentId)) {
    suggestions.push({
      kind: 'home-visit',
      label: 'Suggest Home Visit',
      description: 'A personal visit builds trust for the first meeting.',
      route,
    })
  }

  if (contactGap >= 10 && contactGap < Number.POSITIVE_INFINITY) {
    suggestions.push({
      kind: 'phone-call',
      label: 'Suggest Phone Call',
      description: 'A brief call before the next visit keeps momentum.',
      route,
    })
  }

  if (currentStage === 'jih-registration' && !isJihRegistered(karkun)) {
    suggestions.push({
      kind: 'registration-camp',
      label: 'Suggest Registration Camp',
      description: 'Walk them through JIH App registration in person.',
      route,
    })
  }

  if (currentStage === 'participation' || currentStage === 'orientation') {
    suggestions.push({
      kind: 'invite-programme',
      label: 'Suggest Invite to Programme',
      description: 'Invite to Ijtema or a local programme.',
      route,
    })
  }

  if (currentStage === 'orientation') {
    suggestions.push({
      kind: 'family-meeting',
      label: 'Suggest Meet Family',
      description: 'Meeting family strengthens the relationship.',
      route,
    })
  }

  if (currentStage === 'development' || currentStage === 'regular-contact') {
    suggestions.push({
      kind: 'literature',
      label: 'Provide Literature',
      description: 'Share reading material for continued development.',
      route,
    })
  }

  return suggestions.slice(0, 3)
}
