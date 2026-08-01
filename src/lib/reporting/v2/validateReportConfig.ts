/**
 * KC-037B — Report Composer validation (diagnostics; no KPI math).
 */

import { resolveProviderBundle } from './providerBinding'
import { getReportType } from './reportTypes'
import { getSection } from './sectionRegistry'
import type {
  ReportConfig,
  ReportProviderBundle,
  ReportValidationIssue,
  ReportValidationResult,
} from './types'

export function validateReportConfig(
  config: ReportConfig,
  providers: ReportProviderBundle = resolveProviderBundle(),
): ReportValidationResult {
  const errors: ReportValidationIssue[] = []
  const warnings: ReportValidationIssue[] = []

  const typeDef = getReportType(config.reportType)
  if (!typeDef) {
    errors.push({
      code: 'UNKNOWN_REPORT_TYPE',
      message: `Unknown report type: ${config.reportType}`,
    })
  } else {
    if (!typeDef.available || !typeDef.featureFlag) {
      errors.push({
        code: 'REPORT_TYPE_UNAVAILABLE',
        message: `Report type "${typeDef.title}" is not available yet.`,
      })
    }
    if (!['pdf', 'dashboard', 'excel', 'csv', 'json', 'mobile_summary'].includes(config.outputType)) {
      errors.push({
        code: 'UNSUPPORTED_OUTPUT',
        message: `Output "${config.outputType}" is not supported.`,
      })
    }
  }

  if (config.language === 'bilingual') {
    warnings.push({
      code: 'BILINGUAL_PLACEHOLDER',
      message: 'Bilingual output is a placeholder; PDF remains Urdu-primary.',
    })
  }

  if (config.dateRange.kind === 'custom_range') {
    if (!config.dateRange.startIso || !config.dateRange.endIso) {
      errors.push({
        code: 'CUSTOM_RANGE_INCOMPLETE',
        message: 'Custom date range requires start and end dates.',
      })
    }
  }

  if (
    (config.reportType === 'individual_rukn' || config.scope === 'individual_rukn') &&
    !config.scopeTarget?.ruknId?.trim()
  ) {
    errors.push({
      code: 'RUKN_REQUIRED',
      message: 'Individual Rukn report requires selecting a Rukn.',
    })
  }

  if (!config.enabledSections.length) {
    errors.push({
      code: 'NO_SECTIONS',
      message: 'At least one section must be enabled.',
    })
  }

  const allowedByType = new Set(typeDef?.sectionIds ?? [])
  for (const sectionId of config.enabledSections) {
    const def = getSection(sectionId)
    if (!def) {
      errors.push({
        code: 'UNKNOWN_SECTION',
        message: `Unknown section: ${sectionId}`,
        sectionId,
      })
      continue
    }

    const sectionTypes = def.supportedReportTypes ?? []
    if (sectionTypes.length > 0 && !sectionTypes.includes(config.reportType)) {
      errors.push({
        code: 'SECTION_NOT_IN_REPORT_TYPE',
        message: `Section "${def.displayName}" is not supported by this report type.`,
        sectionId,
      })
    } else if (
      typeDef &&
      allowedByType.size > 0 &&
      sectionTypes.length > 0 &&
      !allowedByType.has(sectionId)
    ) {
      // Catalog allow-list is advisory when section declares types; UI filters by catalog.
      warnings.push({
        code: 'SECTION_OUTSIDE_TYPE_CATALOG',
        message: `Section "${def.displayName}" is outside the default catalog for this report type.`,
        sectionId,
      })
    }

    if (def.visibility === 'hidden') {
      warnings.push({
        code: 'HIDDEN_SECTION',
        message: `Section "${def.displayName}" is hidden from UI but was enabled.`,
        sectionId,
      })
    }

    if (!def.featureFlag || def.status !== 'active' || !def.buildModel) {
      errors.push({
        code: 'SECTION_INACTIVE',
        message: `Section "${def.displayName}" is not active / has no model builder.`,
        sectionId,
      })
      continue
    }

    if (!def.supportedOutputs.includes(config.outputType)) {
      errors.push({
        code: 'SECTION_UNSUPPORTED_OUTPUT',
        message: `Section "${def.displayName}" does not support output ${config.outputType}.`,
        sectionId,
      })
    }

    for (const dep of def.dependencies ?? []) {
      if (!config.enabledSections.includes(dep)) {
        errors.push({
          code: 'MISSING_DEPENDENCY',
          message: `Section "${def.displayName}" requires "${dep}".`,
          sectionId,
        })
      }
    }

    for (const providerId of def.requiredProviders) {
      if (!(providerId in providers)) {
        errors.push({
          code: 'MISSING_PROVIDER',
          message: `Required provider "${providerId}" is not bound.`,
          sectionId,
          providerId,
        })
      }
    }

    const detailLevels = def.supportedDetailLevels ?? []
    if (detailLevels.length > 0 && !detailLevels.includes(config.detailLevel)) {
      warnings.push({
        code: 'SECTION_DETAIL_MISMATCH',
        message: `Section "${def.displayName}" is not optimized for detail level ${config.detailLevel}.`,
        sectionId,
      })
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}
