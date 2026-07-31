/**
 * KC-037B — Preview model builder (labels only; no KPI recalculation).
 */

import { getPeopleStatistics } from '@/lib/peopleStore'
import { getReportType } from './reportTypes'
import { getSection } from './sectionRegistry'
import { validateReportConfig } from './validateReportConfig'
import type { ReportConfig, ReportPreviewModel } from './types'

const SCOPE_LABELS: Record<string, string> = {
  overall_campaign: 'Entire Campaign',
  mens_wing: 'Men',
  womens_wing: 'Women',
  combined: 'Combined (Men + Women)',
  selected_rukn: 'Specific Rukn',
  selected_halqa: 'Specific Halqa',
  selected_ward: 'Specific Ward',
  individual_karkun: 'Specific Individual (Karkun)',
  individual_rukn: 'Specific Individual (Rukn)',
  entire_registry: 'Entire Registry',
  connected_only: 'Connected Only',
  available_only: 'Available Only',
  muttafiqeen_only: 'Muttafiqeen Only',
  campaign_comparison: 'Campaign Comparison',
}

const DATE_LABELS: Record<string, string> = {
  snapshot: 'Snapshot (now)',
  today: 'Today',
  yesterday: 'Yesterday',
  current_week: 'Current Week',
  previous_week: 'Previous Week',
  current_month: 'Current Month',
  campaign_duration: 'Campaign Duration',
  custom_range: 'Custom Date Range',
  all_time: 'All Time',
}

export function buildReportPreview(config: ReportConfig): ReportPreviewModel {
  const typeDef = getReportType(config.reportType)
  const diagnostics = validateReportConfig(config)
  const sectionsIncluded = config.enabledSections.map((id) => {
    const def = getSection(id)
    const active = Boolean(def?.featureFlag && def.status === 'active' && def.buildModel)
    return {
      id,
      title: def?.title ?? def?.displayName ?? id,
      active,
    }
  })

  // Page estimate: presentation heuristic only (not a KPI).
  const estimatedPages =
    config.detailLevel === 'executive'
      ? 1
      : config.detailLevel === 'standard'
        ? 3
        : config.detailLevel === 'detailed'
          ? 5
          : 7

  let dateRangeLabel = DATE_LABELS[config.dateRange.kind] ?? config.dateRange.kind
  if (config.dateRange.kind === 'custom_range') {
    dateRangeLabel = `Custom: ${config.dateRange.startIso ?? '?'} – ${config.dateRange.endIso ?? '?'}`
  }

  // Muttafiqeen census for preview note (people metadata — not a campaign KPI formula).
  const people = getPeopleStatistics()
  const muttafiqNote = `Muttafiqeen (registry): ${people.totalMuttafiqeen ?? 0} total · ${people.maleMuttafiqeen ?? 0} male · ${people.femaleMuttafiqeen ?? 0} female`

  return {
    reportTitle: typeDef?.title ?? config.reportType,
    reportTypeId: config.reportType,
    scopeLabel: SCOPE_LABELS[config.scope] ?? config.scope,
    dateRangeLabel,
    sectionsIncluded,
    estimatedPages,
    outputType: config.outputType,
    language: config.language,
    detailLevel: config.detailLevel,
    connectionVsVisitNote:
      'Connection = administrative assignment to a Rukn. Visit = personal physical meeting. These are never interchangeable. ' +
      muttafiqNote,
    diagnostics,
  }
}
