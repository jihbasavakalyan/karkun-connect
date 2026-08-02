/**
 * KC-037C-F / E — Built-in + custom report templates (local persistence).
 */

import { blueprintSectionsFor } from '../reportBlueprints'
import { DEFAULT_REPORT_OPTIONS, KC034_EXECUTIVE_SECTION_ID } from '../reportConfig'
import type { ReportConfig, ReportPresetDefinition, ReportTypeId } from '../types'

const CUSTOM_KEY = 'kc.report.customTemplates.v1'

export const BUILTIN_TEMPLATES: ReportPresetDefinition[] = [
  {
    id: 'executive_weekly_review',
    title: 'Executive Weekly Review',
    description: 'Standard leadership weekly briefing.',
    reportType: 'executive_campaign',
    featureFlag: true,
    config: {
      reportType: 'executive_campaign',
      dateRange: { kind: 'current_week' },
      detailLevel: 'standard',
      outputType: 'pdf',
      language: 'ur',
      enabledSections: blueprintSectionsFor('executive_campaign'),
      options: { ...DEFAULT_REPORT_OPTIONS },
    },
  },
  {
    id: 'campaign_review',
    title: 'Campaign Review',
    description: 'Campaign progress focus.',
    reportType: 'campaign_progress',
    featureFlag: true,
    config: {
      reportType: 'campaign_progress',
      enabledSections: blueprintSectionsFor('campaign_progress'),
      outputType: 'pdf',
    },
  },
  {
    id: 'men_review',
    title: 'Men Review',
    description: "Men's wing review.",
    reportType: 'men_performance',
    featureFlag: true,
    config: {
      reportType: 'men_performance',
      scope: 'mens_wing',
      enabledSections: blueprintSectionsFor('men_performance'),
    },
  },
  {
    id: 'women_review',
    title: 'Women Review',
    description: "Women's wing review.",
    reportType: 'women_performance',
    featureFlag: true,
    config: {
      reportType: 'women_performance',
      scope: 'womens_wing',
      enabledSections: blueprintSectionsFor('women_performance'),
    },
  },
  {
    id: 'weekly_ijtema_review',
    title: 'Weekly Ijtema Attendance',
    description: 'Operational Weekly Ijtema attendance report.',
    reportType: 'weekly_ijtema',
    featureFlag: true,
    config: {
      reportType: 'weekly_ijtema',
      enabledSections: blueprintSectionsFor('weekly_ijtema'),
      outputType: 'pdf',
      detailLevel: 'standard',
    },
  },
  {
    id: 'visit_review',
    title: 'Visit Review',
    description: 'Visit progress (not Connection).',
    reportType: 'visit_progress',
    featureFlag: true,
    config: {
      reportType: 'visit_progress',
      enabledSections: blueprintSectionsFor('visit_progress'),
    },
  },
  {
    id: 'muttafiqeen_review',
    title: 'Muttafiqeen',
    description: 'Muttafiqeen census.',
    reportType: 'muttafiqeen',
    featureFlag: true,
    config: {
      reportType: 'muttafiqeen',
      scope: 'muttafiqeen_only',
      enabledSections: blueprintSectionsFor('muttafiqeen'),
    },
  },
  {
    id: 'baitul_maal_review',
    title: 'Baitul Maal',
    description: 'Baitul Maal compliance.',
    reportType: 'baitul_maal',
    featureFlag: true,
    config: {
      reportType: 'baitul_maal',
      enabledSections: blueprintSectionsFor('baitul_maal'),
    },
  },
  {
    id: 'app_registration_review',
    title: 'App Registration',
    description: 'JIH App registration.',
    reportType: 'app_registration',
    featureFlag: true,
    config: {
      reportType: 'app_registration',
      enabledSections: blueprintSectionsFor('app_registration'),
    },
  },
  {
    id: 'individual_rukn_review',
    title: 'Individual Rukn',
    description: 'Single Rukn scorecard.',
    reportType: 'individual_rukn',
    featureFlag: true,
    config: {
      reportType: 'individual_rukn',
      scope: 'individual_rukn',
      enabledSections: blueprintSectionsFor('individual_rukn'),
    },
  },
  {
    id: 'individual_karkun_review',
    title: 'Individual Karkun',
    description: 'Single Karkun dossier.',
    reportType: 'individual_karkun',
    featureFlag: true,
    config: {
      reportType: 'individual_karkun',
      scope: 'individual_karkun',
      enabledSections: blueprintSectionsFor('individual_karkun'),
    },
  },
  {
    id: 'audit_review',
    title: 'Audit',
    description: 'Audit density with appendix.',
    reportType: 'executive_campaign',
    featureFlag: true,
    config: {
      reportType: 'executive_campaign',
      detailLevel: 'audit',
      dateRange: { kind: 'all_time' },
      enabledSections: [KC034_EXECUTIVE_SECTION_ID, 'data_quality', 'rafeeq_insights'],
      options: {
        ...DEFAULT_REPORT_OPTIONS,
        showAppendix: true,
        confidentialWatermark: true,
      },
    },
  },
  {
    id: 'historical_comparison_review',
    title: 'Historical Comparison',
    description: 'Snapshot-safe historical comparison.',
    reportType: 'historical_comparison',
    featureFlag: true,
    config: {
      reportType: 'historical_comparison',
      enabledSections: blueprintSectionsFor('historical_comparison'),
      outputType: 'dashboard',
    },
  },
]

export type SavedCustomTemplate = {
  id: string
  title: string
  description: string
  reportType: ReportTypeId
  config: Partial<ReportConfig>
  savedAt: string
}

function readCustom(): SavedCustomTemplate[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedCustomTemplate[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCustom(list: SavedCustomTemplate[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list))
}

export function listBuiltinTemplates(): ReportPresetDefinition[] {
  return [...BUILTIN_TEMPLATES]
}

export function listCustomTemplates(): SavedCustomTemplate[] {
  return readCustom()
}

export function saveCustomTemplate(input: {
  title: string
  description?: string
  config: ReportConfig
}): SavedCustomTemplate {
  const item: SavedCustomTemplate = {
    id: `custom_${Date.now()}`,
    title: input.title.trim() || 'Custom template',
    description: input.description?.trim() || 'User-saved template',
    reportType: input.config.reportType,
    config: { ...input.config, presetId: undefined },
    savedAt: new Date().toISOString(),
  }
  const next = [item, ...readCustom()].slice(0, 40)
  writeCustom(next)
  return item
}

export function deleteCustomTemplate(id: string): void {
  writeCustom(readCustom().filter((t) => t.id !== id))
}

/** Presets for Report Center = builtins with featureFlag (compat with 037B API). */
export function listEnabledReportPresets(): ReportPresetDefinition[] {
  return BUILTIN_TEMPLATES.filter((t) => t.featureFlag)
}

export function listReportPresets(): ReportPresetDefinition[] {
  return [...BUILTIN_TEMPLATES]
}

export function getReportPreset(id: string): ReportPresetDefinition | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id)
}
