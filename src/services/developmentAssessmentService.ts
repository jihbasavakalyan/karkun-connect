/**
 * Development assessment service (PART 13).
 *
 * Holistic Rukn assessment indicators. Monthly Bait-ul-Maal may inform the
 * default observation but never auto-advances Development stage.
 */

import { isBaitulMaalSettledThisMonth } from '@/services/baitulMaalService'
import {
  getDevelopmentAssessment,
  upsertDevelopmentAssessment,
} from '@/stores/developmentAssessmentStore'
import {
  createEmptyDevelopmentIndicators,
  DEVELOPMENT_INDICATORS,
  type DevelopmentAssessmentRecord,
  type DevelopmentIndicatorId,
  type DevelopmentIndicatorState,
} from '@/types/developmentAssessment'

function nowIso(): string {
  return new Date().toISOString()
}

export function getOrCreateDevelopmentAssessment(
  karkunId: string,
  ruknId: string,
): DevelopmentAssessmentRecord {
  const existing = getDevelopmentAssessment(karkunId)
  if (existing) {
    return existing
  }

  const indicators = createEmptyDevelopmentIndicators()
  // Informational default only — Rukn may change it; never auto-advances stage.
  indicators.monthly_baitul_maal = isBaitulMaalSettledThisMonth(karkunId)

  return upsertDevelopmentAssessment({
    karkunId,
    ruknId,
    indicators,
    updatedAt: nowIso(),
    updatedBy: ruknId,
  })
}

export function getDevelopmentIndicatorsForDisplay(
  karkunId: string,
  ruknId: string,
): {
  assessment: DevelopmentAssessmentRecord
  indicators: typeof DEVELOPMENT_INDICATORS
  baitulMaalSuggested: boolean
} {
  const assessment = getOrCreateDevelopmentAssessment(karkunId, ruknId)
  return {
    assessment,
    indicators: DEVELOPMENT_INDICATORS,
    baitulMaalSuggested: isBaitulMaalSettledThisMonth(karkunId),
  }
}

export function setDevelopmentIndicator(
  karkunId: string,
  ruknId: string,
  indicatorId: DevelopmentIndicatorId,
  checked: boolean,
  updatedBy?: string,
): DevelopmentAssessmentRecord {
  const current = getOrCreateDevelopmentAssessment(karkunId, ruknId)
  const indicators: DevelopmentIndicatorState = {
    ...current.indicators,
    [indicatorId]: checked,
  }

  return upsertDevelopmentAssessment({
    ...current,
    ruknId,
    indicators,
    updatedAt: nowIso(),
    updatedBy: updatedBy ?? ruknId,
  })
}

export function setDevelopmentAssessmentNotes(
  karkunId: string,
  ruknId: string,
  notes: string,
): DevelopmentAssessmentRecord {
  const current = getOrCreateDevelopmentAssessment(karkunId, ruknId)
  return upsertDevelopmentAssessment({
    ...current,
    ruknId,
    notes: notes.trim() || undefined,
    updatedAt: nowIso(),
    updatedBy: ruknId,
  })
}
