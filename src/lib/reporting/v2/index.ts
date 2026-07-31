/**
 * KC-037A/B — Executive Report Framework V2 (Report Composer foundation).
 *
 * @see docs/architecture/kc-037a-report-composer.md
 * @see docs/architecture/kc-037b-report-center.md
 */

export * from './types'
export * from './reportConfig'
export * from './providerBinding'
export * from './sectionRegistry'
export { registerBuiltinSections } from './sections/registerBuiltinSections'
export * from './reportTypes'
export * from './presets'
export * from './validateReportConfig'
export * from './buildReportPreview'
export { composeReport, ReportComposeError } from './composeReport'
export type { ComposeReportOptions } from './composeReport'
export {
  composeKc034CampaignReportModel,
  campaignReportModelFromDocument,
} from './exporters/campaignPdfViaComposer'
export { generateConfiguredReport } from './generateConfiguredReport'
export {
  CAMPAIGN_REPORT_MODEL_KIND,
  extractCampaignReportModel,
  buildKc034ExecutiveSectionModel,
} from './sections/kc034ExecutiveCampaign'
