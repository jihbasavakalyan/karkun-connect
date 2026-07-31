/**
 * KC-037B/C-F — Generate configured report via Composer (all suite types).
 */

import { composeReport } from './composeReport'
import { defaultKc034Config, KC034_EXECUTIVE_SECTION_ID } from './reportConfig'
import { blueprintSectionsFor } from './reportBlueprints'
import { validateReportConfig } from './validateReportConfig'
import { getSection } from './sectionRegistry'
import {
  exportReportDocument,
  exportReportZipSnapshot,
} from './exporters/exportReportDocument'
import type { ReportConfig, ReportDocument } from './types'

function resolveComposableSections(config: ReportConfig): string[] {
  let ids = config.enabledSections.length
    ? [...config.enabledSections]
    : blueprintSectionsFor(config.reportType)

  if (
    config.reportType === 'executive_campaign' &&
    config.outputType === 'pdf' &&
    !ids.includes(KC034_EXECUTIVE_SECTION_ID)
  ) {
    ids = [KC034_EXECUTIVE_SECTION_ID, ...ids]
  }

  return ids.filter((id) => {
    const def = getSection(id)
    return Boolean(def?.featureFlag && def.status === 'active' && def.buildModel)
  })
}

export async function generateConfiguredReport(input: {
  config: Partial<ReportConfig>
  generatedBy?: string
  includeZipSnapshot?: boolean
}): Promise<{ config: ReportConfig; document: ReportDocument; mode: 'download' | 'dashboard' }> {
  const requested = defaultKc034Config({
    ...input.config,
    generatedBy: input.generatedBy ?? input.config.generatedBy,
  })

  const enabledSections = resolveComposableSections(requested)
  if (!enabledSections.length) {
    throw new Error('No active Composer sections available for this configuration.')
  }

  const config: ReportConfig = { ...requested, enabledSections }

  const diagnostics = validateReportConfig(config)
  if (!diagnostics.ok) {
    throw new Error(diagnostics.errors.map((e) => e.message).join(' · '))
  }

  const document = composeReport(config)
  if (input.includeZipSnapshot) {
    await exportReportZipSnapshot(document)
  }
  const result = await exportReportDocument(document, config.outputType)
  return { config, document: result.document, mode: result.mode }
}
