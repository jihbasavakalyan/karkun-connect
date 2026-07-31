/**
 * KC-037A/B — Versioned report configuration + sensible defaults.
 */

import {
  REPORT_CONFIG_SCHEMA_VERSION,
  type ReportConfig,
  type ReportOptions,
} from './types'

export const KC034_EXECUTIVE_SECTION_ID = 'kc034_executive_campaign' as const

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  confidentialWatermark: false,
  showCharts: true,
  showRankings: true,
  showAppendix: true,
  orientation: 'portrait',
}

export function defaultKc034Config(overrides?: Partial<ReportConfig>): ReportConfig {
  const mergedOptions: ReportOptions = {
    ...DEFAULT_REPORT_OPTIONS,
    ...(overrides?.options ?? {}),
  }

  return {
    schemaVersion: REPORT_CONFIG_SCHEMA_VERSION,
    reportType: overrides?.reportType ?? 'executive_campaign',
    scope: overrides?.scope ?? 'overall_campaign',
    scopeTarget: overrides?.scopeTarget,
    audience: overrides?.audience ?? 'administrator',
    language: overrides?.language ?? 'ur',
    dateRange: overrides?.dateRange ?? { kind: 'snapshot' },
    enabledSections: overrides?.enabledSections ?? [KC034_EXECUTIVE_SECTION_ID],
    outputType: overrides?.outputType ?? 'pdf',
    theme: overrides?.theme ?? 'classic_urdu',
    detailLevel: overrides?.detailLevel ?? 'standard',
    options: mergedOptions,
    generatedBy: overrides?.generatedBy,
    organization: overrides?.organization,
    presetId: overrides?.presetId,
  }
}

export function resolveReportConfig(partial?: Partial<ReportConfig>): ReportConfig {
  return defaultKc034Config(partial)
}
