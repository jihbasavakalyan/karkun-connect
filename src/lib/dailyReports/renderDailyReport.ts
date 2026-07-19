/**
 * KC-0059 — Placeholder rendering for daily Arkaan reports.
 * Reuses the Communication template variable engine (no new syntax).
 */

import { applyTemplateVariables } from '@/services/templateService'
import type { DailyReportPlaceholders } from '@/types/dailyReport'

export function renderDailyReportBody(
  body: string,
  placeholders: DailyReportPlaceholders,
): string {
  return applyTemplateVariables(body, placeholders).trim()
}
