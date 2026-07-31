/**
 * KC-037A — Report Composer.
 * Config → registry → KC-033 providers → section models → ReportDocument.
 */

import { createReportContext } from './providerBinding'
import { resolveReportConfig } from './reportConfig'
import { listEnabledSections } from './sectionRegistry'
import type { ReportConfig, ReportDocument, ComposedSection } from './types'
import './sections/registerBuiltinSections'

export type ComposeReportOptions = {
  now?: Date
}

export function composeReport(
  partialConfig?: Partial<ReportConfig>,
  options?: ComposeReportOptions,
): ReportDocument {
  const config = resolveReportConfig(partialConfig)
  const ctx = createReportContext(config, { now: options?.now })
  const definitions = listEnabledSections(config.enabledSections)

  const sections: ComposedSection[] = definitions.map((definition) => {
    const model = definition.buildModel!(ctx)
    if (model.sectionId !== definition.id) {
      throw new Error(
        `Section "${definition.id}" returned model.sectionId="${model.sectionId}"`,
      )
    }
    return { definition, model }
  })

  return {
    schemaVersion: config.schemaVersion,
    config,
    composedAt: ctx.runtime.now.toISOString(),
    sections,
  }
}
