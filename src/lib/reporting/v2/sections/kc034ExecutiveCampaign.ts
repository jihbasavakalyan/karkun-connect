/**
 * KC-037A — KC-034 executive campaign section (presentation model builder).
 * Single active section preserving identical PDF contract.
 */

import {
  buildCampaignReportModel,
  type CampaignReportModel,
} from '@/lib/reporting/campaignReportModel'
import { registerSection } from '../sectionRegistry'
import type { ReportContext, SectionModel } from '../types'
import { KC034_EXECUTIVE_SECTION_ID } from '../reportConfig'

export const CAMPAIGN_REPORT_MODEL_KIND = 'campaign_report_v1' as const

export type Kc034ExecutiveSectionData = {
  model: CampaignReportModel
}

export function buildKc034ExecutiveSectionModel(ctx: ReportContext): SectionModel {
  const model = buildCampaignReportModel({
    generatedBy: ctx.config.generatedBy,
    organization: ctx.config.organization,
    now: ctx.runtime.now,
    providers: ctx.providers,
  })
  return {
    sectionId: KC034_EXECUTIVE_SECTION_ID,
    kind: CAMPAIGN_REPORT_MODEL_KIND,
    data: { model } satisfies Kc034ExecutiveSectionData,
  }
}

export function registerKc034ExecutiveSection(): void {
  registerSection({
    id: KC034_EXECUTIVE_SECTION_ID,
    title: 'Executive Campaign Body (KC-034)',
    displayName: 'KC-034 Executive Campaign Report',
    description:
      'Full Urdu executive campaign PDF model (cover, KPIs, bands, exceptions, Rukn table). Connection ≠ Visit.',
    requiredProviders: [
      'connections',
      'visits',
      'weeklyIjtema',
      'baitulMaal',
      'appRegistration',
      'campaignHealth',
    ],
    configurationSchema: 'kc034_executive_v1',
    renderPriority: 10,
    supportedOutputs: ['pdf', 'dashboard', 'excel', 'csv', 'json', 'mobile_summary'],
    supportedReportTypes: ['executive_campaign'],
    supportedDetailLevels: ['executive', 'standard', 'detailed', 'audit'],
    dependencies: [],
    defaultEnabled: true,
    featureFlag: true,
    visibility: 'always',
    status: 'active',
    buildModel: buildKc034ExecutiveSectionModel,
  })
}

export function extractCampaignReportModel(section: SectionModel): CampaignReportModel {
  if (section.kind !== CAMPAIGN_REPORT_MODEL_KIND) {
    throw new Error(`Expected ${CAMPAIGN_REPORT_MODEL_KIND}, got ${section.kind}`)
  }
  const data = section.data as Kc034ExecutiveSectionData
  if (!data?.model) {
    throw new Error('kc034 section model missing CampaignReportModel')
  }
  return data.model
}
