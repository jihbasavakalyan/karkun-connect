/**
 * Development assessment indicators (PART 13).
 *
 * Observable checklist for the Rukn during Development stage assessment.
 * Does NOT automatically advance journey stages.
 * Monthly Bait-ul-Maal is one indicator — not the sole criterion.
 */

export type DevelopmentIndicatorId =
  | 'quran_study'
  | 'hadith_study'
  | 'islamic_literature'
  | 'islamic_rituals'
  | 'weekly_ijtema'
  | 'jamaat_activities'
  | 'monthly_baitul_maal'
  | 'personal_growth'
  | 'ready_for_next_stage'

export type DevelopmentIndicatorDefinition = {
  id: DevelopmentIndicatorId
  label: string
  /** When true, Compliance Bait-ul-Maal may inform the default observation. */
  linkedToBaitulMaal?: boolean
}

export const DEVELOPMENT_INDICATORS: readonly DevelopmentIndicatorDefinition[] = [
  { id: 'quran_study', label: 'Qur’an with Translation' },
  { id: 'hadith_study', label: 'Hadith Study' },
  { id: 'islamic_literature', label: 'Islamic Literature' },
  { id: 'islamic_rituals', label: 'Salah & Islamic Practices' },
  { id: 'weekly_ijtema', label: 'Weekly Ijtema Attendance' },
  { id: 'jamaat_activities', label: 'Jamaat Activities' },
  {
    id: 'monthly_baitul_maal',
    label: 'Monthly Bait-ul-Maal Contribution',
    linkedToBaitulMaal: true,
  },
  { id: 'personal_growth', label: 'Personal Growth Observed' },
  { id: 'ready_for_next_stage', label: 'Ready for Next Development Stage' },
] as const

export type DevelopmentIndicatorState = Record<DevelopmentIndicatorId, boolean>

export type DevelopmentAssessmentRecord = {
  karkunId: string
  ruknId: string
  indicators: DevelopmentIndicatorState
  notes?: string
  updatedAt: string
  updatedBy: string
}

export function createEmptyDevelopmentIndicators(): DevelopmentIndicatorState {
  return {
    quran_study: false,
    hadith_study: false,
    islamic_literature: false,
    islamic_rituals: false,
    weekly_ijtema: false,
    jamaat_activities: false,
    monthly_baitul_maal: false,
    personal_growth: false,
    ready_for_next_stage: false,
  }
}
