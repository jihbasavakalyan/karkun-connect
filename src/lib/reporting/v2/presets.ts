/**
 * KC-037B — Built-in report configuration presets.
 */

import { KC034_EXECUTIVE_SECTION_ID, DEFAULT_REPORT_OPTIONS } from './reportConfig'
import type { ReportPresetDefinition } from './types'

export const REPORT_PRESET_CATALOG: ReportPresetDefinition[] = [
  {
    id: 'executive_weekly_review',
    title: 'Executive Weekly Review',
    description: 'Standard Executive Campaign PDF for weekly leadership review.',
    reportType: 'executive_campaign',
    featureFlag: true,
    config: {
      reportType: 'executive_campaign',
      scope: 'overall_campaign',
      dateRange: { kind: 'current_week' },
      detailLevel: 'standard',
      outputType: 'pdf',
      language: 'ur',
      theme: 'classic_urdu',
      enabledSections: [KC034_EXECUTIVE_SECTION_ID],
      options: { ...DEFAULT_REPORT_OPTIONS, showRankings: true, showAppendix: true },
    },
  },
  {
    id: 'campaign_summary',
    title: 'Campaign Summary',
    description: 'Executive one-page density (same Composer PDF today).',
    reportType: 'executive_campaign',
    featureFlag: true,
    config: {
      reportType: 'executive_campaign',
      scope: 'overall_campaign',
      dateRange: { kind: 'snapshot' },
      detailLevel: 'executive',
      outputType: 'pdf',
      enabledSections: [KC034_EXECUTIVE_SECTION_ID],
      options: { ...DEFAULT_REPORT_OPTIONS, showAppendix: false },
    },
  },
  {
    id: 'men_review',
    title: 'Men Review',
    description: 'Men performance — coming soon.',
    reportType: 'men_performance',
    featureFlag: false,
    config: {
      reportType: 'men_performance',
      scope: 'mens_wing',
      enabledSections: ['mens_performance'],
    },
  },
  {
    id: 'women_review',
    title: 'Women Review',
    description: 'Women performance — coming soon.',
    reportType: 'women_performance',
    featureFlag: false,
    config: {
      reportType: 'women_performance',
      scope: 'womens_wing',
      enabledSections: ['womens_performance'],
    },
  },
  {
    id: 'weekly_ijtema_review',
    title: 'Weekly Ijtema',
    description: 'Ijtema-focused — coming soon.',
    reportType: 'weekly_ijtema',
    featureFlag: false,
    config: {
      reportType: 'weekly_ijtema',
      enabledSections: ['weekly_ijtema'],
    },
  },
  {
    id: 'visit_review',
    title: 'Visit Review',
    description: 'Visit progress (not Connection) — coming soon.',
    reportType: 'visit_progress',
    featureFlag: false,
    config: {
      reportType: 'visit_progress',
      enabledSections: ['visits'],
    },
  },
  {
    id: 'baitul_maal_review',
    title: 'Baitul Maal',
    description: 'Baitul Maal — coming soon.',
    reportType: 'baitul_maal',
    featureFlag: false,
    config: {
      reportType: 'baitul_maal',
      enabledSections: ['baitul_maal'],
    },
  },
  {
    id: 'muttafiqeen_review',
    title: 'Muttafiqeen',
    description: 'Muttafiqeen summary — coming soon.',
    reportType: 'muttafiqeen',
    featureFlag: false,
    config: {
      reportType: 'muttafiqeen',
      scope: 'muttafiqeen_only',
      enabledSections: ['muttafiqeen_summary'],
    },
  },
  {
    id: 'connections_review',
    title: 'Connections',
    description: 'Connection assignment progress — coming soon.',
    reportType: 'connections',
    featureFlag: false,
    config: {
      reportType: 'connections',
      scope: 'connected_only',
      enabledSections: ['connections'],
    },
  },
  {
    id: 'audit_review',
    title: 'Audit',
    description: 'Full audit density — uses Executive Composer PDF today.',
    reportType: 'executive_campaign',
    featureFlag: true,
    config: {
      reportType: 'executive_campaign',
      detailLevel: 'audit',
      dateRange: { kind: 'all_time' },
      enabledSections: [KC034_EXECUTIVE_SECTION_ID],
      options: {
        ...DEFAULT_REPORT_OPTIONS,
        showAppendix: true,
        showRankings: true,
        confidentialWatermark: true,
      },
    },
  },
]

const byId = new Map(REPORT_PRESET_CATALOG.map((p) => [p.id, p]))

export function getReportPreset(id: string) {
  return byId.get(id)
}

export function listReportPresets() {
  return [...REPORT_PRESET_CATALOG]
}

export function listEnabledReportPresets() {
  return REPORT_PRESET_CATALOG.filter((p) => p.featureFlag)
}
