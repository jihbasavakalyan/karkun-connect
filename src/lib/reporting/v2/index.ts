/**
 * KC-037A — Executive Report Framework V2 (Report Composer foundation).
 *
 * @see docs/architecture/kc-037a-report-composer.md
 */

export * from './types'
export * from './reportConfig'
export * from './providerBinding'
export * from './sectionRegistry'
export { composeReport } from './composeReport'
export type { ComposeReportOptions } from './composeReport'
export {
  composeKc034CampaignReportModel,
  campaignReportModelFromDocument,
} from './exporters/campaignPdfViaComposer'
export {
  CAMPAIGN_REPORT_MODEL_KIND,
  extractCampaignReportModel,
  buildKc034ExecutiveSectionModel,
} from './sections/kc034ExecutiveCampaign'
