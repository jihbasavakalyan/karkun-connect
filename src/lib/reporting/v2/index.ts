/**
 * KC-037A/B/C-F — Executive Report Framework V2.
 *
 * @see docs/architecture/kc-037a-report-composer.md
 * @see docs/architecture/kc-037b-report-center.md
 * @see docs/architecture/kc-037c-f-reporting-platform.md
 */

export * from './types'
export * from './reportConfig'
export * from './providerBinding'
export * from './sectionRegistry'
export { registerBuiltinSections } from './sections/registerBuiltinSections'
export * from './reportTypes'
export * from './reportBlueprints'
export * from './presets'
export * from './validateReportConfig'
export * from './buildReportPreview'
export * from './templates/reportTemplates'
export * from './scoring/scoringConfig'
export * from './localization/reportLabels'
export { buildProviderInsights } from './insights/buildProviderInsights'
export { composeReport, ReportComposeError } from './composeReport'
export type { ComposeReportOptions } from './composeReport'
export {
  composeKc034CampaignReportModel,
  campaignReportModelFromDocument,
} from './exporters/campaignPdfViaComposer'
export {
  exportReportDocument,
  exportReportZipSnapshot,
} from './exporters/exportReportDocument'
export { generateConfiguredReport } from './generateConfiguredReport'
export {
  CAMPAIGN_REPORT_MODEL_KIND,
  extractCampaignReportModel,
  buildKc034ExecutiveSectionModel,
} from './sections/kc034ExecutiveCampaign'
