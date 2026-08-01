/**
 * KC-037B/C-F — Report type catalog.
 * All suite types are available; generation goes through Composer blueprints.
 */

import { blueprintSectionsFor } from './reportBlueprints'
import type { ReportTypeDefinition, ReportTypeId } from './types'

function def(
  id: ReportTypeId,
  title: string,
  description: string,
  defaults: Pick<ReportTypeDefinition, 'defaultScope' | 'defaultDetailLevel'>,
): ReportTypeDefinition {
  return {
    id,
    title,
    description,
    available: true,
    featureFlag: true,
    defaultScope: defaults.defaultScope,
    defaultDetailLevel: defaults.defaultDetailLevel,
    defaultOutput: 'pdf',
    sectionIds: blueprintSectionsFor(id),
  }
}

export const REPORT_TYPE_CATALOG: ReportTypeDefinition[] = [
  def('executive_campaign', 'Executive Campaign Report', 'Full management briefing via Composer.', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'standard',
  }),
  def('campaign_progress', 'Campaign Progress Report', 'Progress-focused campaign view.', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'standard',
  }),
  def('men_performance', 'Men Performance Report', "Men's wing performance.", {
    defaultScope: 'mens_wing',
    defaultDetailLevel: 'standard',
  }),
  def('women_performance', 'Women Performance Report', "Women's wing performance.", {
    defaultScope: 'womens_wing',
    defaultDetailLevel: 'standard',
  }),
  def('rukn_performance', 'Rukn Performance Report', 'All Rukns scorecard.', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'detailed',
  }),
  def('individual_rukn', 'Individual Rukn Performance Report', 'Single Rukn operational dossier for daily review.', {
    defaultScope: 'individual_rukn',
    defaultDetailLevel: 'standard',
  }),
  def('individual_karkun', 'Individual Karkun Performance Report', 'Single Karkun operational dossier for daily review.', {
    defaultScope: 'individual_karkun',
    defaultDetailLevel: 'standard',
  }),
  def('weekly_ijtema', 'Weekly Ijtema Report', 'Ijtema attendance analytics.', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'standard',
  }),
  def('visit_progress', 'Visit Progress Report', 'Personal visit progress (not Connection).', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'standard',
  }),
  def('baitul_maal', 'Baitul Maal Report', 'Monthly Baitul Maal compliance.', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'standard',
  }),
  def('app_registration', 'JIH App Registration Report', 'App registration progress.', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'standard',
  }),
  def('pending_activities', 'Pending Activities Report', 'Open operational work.', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'standard',
  }),
  def('communication', 'Communication Report', 'Communication status overview.', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'standard',
  }),
  def('follow_up', 'Follow-up Report', 'Follow-up and exceptions.', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'standard',
  }),
  def('muttafiqeen', 'Muttafiqeen Report', 'Muttafiqeen summary (outside campaign execution).', {
    defaultScope: 'muttafiqeen_only',
    defaultDetailLevel: 'standard',
  }),
  def('connections', 'Connection Report', 'Administrative Connection progress (not Visits).', {
    defaultScope: 'connected_only',
    defaultDetailLevel: 'standard',
  }),
  def('snapshot_summary', 'Snapshot Summary Report', 'One-page snapshot.', {
    defaultScope: 'overall_campaign',
    defaultDetailLevel: 'executive',
  }),
  def('mathematical_audit', 'Mathematical Audit Report', 'Registry / connection reconciliation appendix.', {
    defaultScope: 'entire_registry',
    defaultDetailLevel: 'audit',
  }),
  def('integrity', 'Integrity Report', 'Integrity and exception audit.', {
    defaultScope: 'entire_registry',
    defaultDetailLevel: 'audit',
  }),
  def(
    'historical_comparison',
    'Historical Comparison Report',
    'Period comparison when history exists (snapshot-safe).',
    {
      defaultScope: 'campaign_comparison',
      defaultDetailLevel: 'detailed',
    },
  ),
]

const byId = new Map(REPORT_TYPE_CATALOG.map((t) => [t.id, t]))

export function getReportType(id: ReportTypeId): ReportTypeDefinition | undefined {
  return byId.get(id)
}

export function listReportTypes(): ReportTypeDefinition[] {
  return [...REPORT_TYPE_CATALOG]
}

export function listAvailableReportTypes(): ReportTypeDefinition[] {
  return REPORT_TYPE_CATALOG.filter((t) => t.available && t.featureFlag)
}
