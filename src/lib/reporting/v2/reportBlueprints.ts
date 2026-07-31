/**
 * KC-037C-F — Default section sets per report type (Composer blueprints).
 */

import { KC034_EXECUTIVE_SECTION_ID } from './reportConfig'
import type { ReportTypeId } from './types'

export const REPORT_TYPE_BLUEPRINTS: Record<ReportTypeId, string[]> = {
  executive_campaign: [
    KC034_EXECUTIVE_SECTION_ID,
    'executive_summary',
    'kpi_dashboard',
    'rafeeq_insights',
    'recommendations',
    'data_quality',
  ],
  campaign_progress: ['kpi_dashboard', 'connections', 'visits', 'executive_summary'],
  men_performance: ['mens_performance', 'top_performers', 'lowest_performers', 'recommendations'],
  women_performance: [
    'womens_performance',
    'top_performers',
    'lowest_performers',
    'recommendations',
  ],
  rukn_performance: ['individual_rukn_performance', 'top_performers', 'kpi_dashboard'],
  individual_rukn: ['individual_rukn_performance', 'recommendations', 'data_quality'],
  individual_karkun: ['individual_karkun_performance', 'data_quality'],
  weekly_ijtema: ['weekly_ijtema', 'kpi_dashboard', 'recommendations'],
  visit_progress: ['visits', 'kpi_dashboard', 'recommendations'],
  baitul_maal: ['baitul_maal', 'kpi_dashboard', 'recommendations'],
  app_registration: ['app_registration', 'kpi_dashboard', 'recommendations'],
  pending_activities: ['pending_tasks', 'recommendations', 'rafeeq_insights'],
  communication: ['communication_status', 'recommendations'],
  follow_up: ['pending_tasks', 'recommendations', 'rafeeq_insights'],
  muttafiqeen: ['muttafiqeen_summary', 'data_quality'],
  connections: ['connections', 'kpi_dashboard', 'recommendations'],
  snapshot_summary: ['executive_summary', 'kpi_dashboard', 'rafeeq_insights'],
  mathematical_audit: ['data_quality', 'kpi_dashboard'],
  integrity: ['data_quality', 'lowest_performers'],
  historical_comparison: ['trend_analysis', 'kpi_dashboard', 'data_quality'],
  custom: [KC034_EXECUTIVE_SECTION_ID],
}

export function blueprintSectionsFor(reportType: ReportTypeId): string[] {
  return [...(REPORT_TYPE_BLUEPRINTS[reportType] ?? [KC034_EXECUTIVE_SECTION_ID])]
}
