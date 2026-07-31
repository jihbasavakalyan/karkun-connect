/**
 * KC-037A — PDF exporter adapter: ReportDocument → CampaignReportModel.
 */

import type { CampaignReportModel } from '@/lib/reporting/campaignReportModel'
import { composeReport } from '../composeReport'
import { defaultKc034Config, KC034_EXECUTIVE_SECTION_ID } from '../reportConfig'
import {
  extractCampaignReportModel,
} from '../sections/kc034ExecutiveCampaign'
import type { ReportConfig, ReportDocument } from '../types'

export function composeKc034CampaignReportModel(input?: {
  generatedBy?: string
  organization?: string
  now?: Date
  config?: Partial<ReportConfig>
}): CampaignReportModel {
  const document = composeReport(
    defaultKc034Config({
      generatedBy: input?.generatedBy,
      organization: input?.organization,
      ...input?.config,
    }),
    { now: input?.now },
  )
  return campaignReportModelFromDocument(document)
}

export function campaignReportModelFromDocument(document: ReportDocument): CampaignReportModel {
  const composed = document.sections.find(
    (s) => s.definition.id === KC034_EXECUTIVE_SECTION_ID,
  )
  if (!composed) {
    throw new Error(
      `ReportDocument missing section ${KC034_EXECUTIVE_SECTION_ID} — enable it in config.enabledSections`,
    )
  }
  return extractCampaignReportModel(composed.model)
}
