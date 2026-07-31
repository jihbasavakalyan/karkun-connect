/**
 * KC-037A — Versioned report configuration + sensible defaults.
 */

import {
  REPORT_CONFIG_SCHEMA_VERSION,
  type ReportConfig,
} from './types'

export const KC034_EXECUTIVE_SECTION_ID = 'kc034_executive_campaign' as const

export function defaultKc034Config(overrides?: Partial<ReportConfig>): ReportConfig {
  const { schemaVersion: _ignored, ...rest } = overrides ?? {}
  return {
    schemaVersion: REPORT_CONFIG_SCHEMA_VERSION,
    reportType: 'executive_campaign',
    scope: 'overall_campaign',
    audience: 'administrator',
    language: 'ur',
    dateRange: { kind: 'snapshot' },
    enabledSections: [KC034_EXECUTIVE_SECTION_ID],
    outputType: 'pdf',
    theme: 'classic_urdu',
    detailLevel: 'executive',
    ...rest,
  }
}

export function resolveReportConfig(partial?: Partial<ReportConfig>): ReportConfig {
  return defaultKc034Config(partial)
}
