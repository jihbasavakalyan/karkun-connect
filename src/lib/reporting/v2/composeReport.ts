/**
 * KC-037A/B — Report Composer.
 * Config → validate → registry → KC-033 providers → section models → ReportDocument.
 */

import { createReportContext } from './providerBinding'
import { resolveReportConfig } from './reportConfig'
import { listEnabledSections } from './sectionRegistry'
import { validateReportConfig } from './validateReportConfig'
import type { ReportConfig, ReportDocument, ComposedSection } from './types'
import './sections/registerBuiltinSections'

export type ComposeReportOptions = {
  now?: Date
  /** When true (default), reject invalid configs with diagnostics. */
  validate?: boolean
}

export class ReportComposeError extends Error {
  readonly diagnostics: ReturnType<typeof validateReportConfig>

  constructor(diagnostics: ReturnType<typeof validateReportConfig>) {
    const summary = diagnostics.errors.map((e) => e.message).join('; ')
    super(`Report Composer validation failed: ${summary}`)
    this.name = 'ReportComposeError'
    this.diagnostics = diagnostics
  }
}

export function composeReport(
  partialConfig?: Partial<ReportConfig>,
  options?: ComposeReportOptions,
): ReportDocument {
  const config = resolveReportConfig(partialConfig)
  const ctx = createReportContext(config, { now: options?.now })

  if (options?.validate !== false) {
    const diagnostics = validateReportConfig(config, ctx.providers)
    if (!diagnostics.ok) {
      throw new ReportComposeError(diagnostics)
    }
  }

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
