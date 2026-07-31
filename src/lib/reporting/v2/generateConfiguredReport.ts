/**
 * KC-037B — Generate configured report via Composer (PDF only today).
 */

import { downloadCampaignReportPdf } from '@/lib/reporting/campaignReportPdf'
import {
  composeReport,
  defaultKc034Config,
  KC034_EXECUTIVE_SECTION_ID,
  validateReportConfig,
  type ReportConfig,
} from '@/lib/reporting/v2'
import { campaignReportModelFromDocument } from '@/lib/reporting/v2/exporters/campaignPdfViaComposer'

export async function generateConfiguredReport(input: {
  config: Partial<ReportConfig>
  generatedBy?: string
}): Promise<{ config: ReportConfig }> {
  const config = defaultKc034Config({
    ...input.config,
    generatedBy: input.generatedBy ?? input.config.generatedBy,
  })

  const diagnostics = validateReportConfig(config)
  if (!diagnostics.ok) {
    throw new Error(diagnostics.errors.map((e) => e.message).join(' · '))
  }

  if (config.reportType !== 'executive_campaign' || config.outputType !== 'pdf') {
    throw new Error('Only Executive Campaign Report PDF is available in this release.')
  }

  // Ensure the composable KC-034 body is included for generation.
  if (!config.enabledSections.includes(KC034_EXECUTIVE_SECTION_ID)) {
    config.enabledSections = [KC034_EXECUTIVE_SECTION_ID, ...config.enabledSections]
  }

  // Compose only active builders (filter planned selections out of compose input).
  const composeConfig: ReportConfig = {
    ...config,
    enabledSections: config.enabledSections.filter((id) => id === KC034_EXECUTIVE_SECTION_ID),
  }

  const document = composeReport(composeConfig)
  const model = campaignReportModelFromDocument(document)
  await downloadCampaignReportPdf({
    model,
    generatedBy: config.generatedBy,
    organization: config.organization,
  })

  return { config }
}
