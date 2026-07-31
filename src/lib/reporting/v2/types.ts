/**
 * KC-037A — Executive Report Framework V2 types.
 * Presentation contracts only — KPIs come from KC-033 providers.
 */

import type { CanonicalMetricProviders } from '@/lib/operations/canonicalCampaignMetrics'
import type { CampaignListItem } from '@/constants/mockMissions'
import type { CampaignTimeline } from '@/services/campaignService'

export const REPORT_CONFIG_SCHEMA_VERSION = 1 as const

export type ReportType = 'executive_campaign' | 'custom'
export type ReportScope =
  | 'overall_campaign'
  | 'mens_wing'
  | 'womens_wing'
  | 'combined'
  | 'selected_rukn'
  | 'selected_halqa'
  | 'individual_karkun'
  | 'individual_rukn'
  | 'campaign_comparison'
export type ReportAudience = 'administrator' | 'leadership' | 'rukn'
export type ReportLanguage = 'ur' | 'en' | 'bilingual'
export type ReportOutputType = 'pdf' | 'dashboard' | 'excel' | 'csv' | 'mobile_summary'
export type ReportTheme = 'classic_urdu' | 'neutral'
export type ReportDetailLevel = 'executive' | 'detailed'
export type ReportDateRangeKind =
  | 'snapshot'
  | 'today'
  | 'yesterday'
  | 'current_week'
  | 'previous_week'
  | 'current_month'
  | 'campaign_duration'
  | 'custom_range'

export type ReportDateRange = {
  kind: ReportDateRangeKind
  /** ISO dates when kind === custom_range */
  startIso?: string
  endIso?: string
}

export type ReportConfig = {
  schemaVersion: typeof REPORT_CONFIG_SCHEMA_VERSION
  reportType: ReportType
  scope: ReportScope
  audience: ReportAudience
  language: ReportLanguage
  dateRange: ReportDateRange
  enabledSections: string[]
  outputType: ReportOutputType
  theme: ReportTheme
  detailLevel: ReportDetailLevel
  generatedBy?: string
  organization?: string
}

export type CanonicalProviderId = keyof typeof CanonicalMetricProviders

export type ReportProviderBundle = typeof CanonicalMetricProviders

export type ReportRuntime = {
  now: Date
  systemVersion: string
}

export type ReportCampaignMetadata = {
  campaign: CampaignListItem | null
  timeline: CampaignTimeline | null
}

export type ReportLocalization = {
  language: ReportLanguage
}

export type ReportContext = {
  config: ReportConfig
  providers: ReportProviderBundle
  localization: ReportLocalization
  campaign: ReportCampaignMetadata
  runtime: ReportRuntime
}

export type SectionOutputSupport = ReportOutputType

export type SectionStatus = 'active' | 'planned'

export type SectionDefinition = {
  id: string
  displayName: string
  description: string
  requiredProviders: CanonicalProviderId[]
  /** Free-form config schema id for future UI; unused in 037A. */
  configurationSchema: string
  renderPriority: number
  supportedOutputs: SectionOutputSupport[]
  featureFlag: boolean
  status: SectionStatus
  /** Required when status === 'active' and featureFlag. */
  buildModel?: (ctx: ReportContext) => SectionModel
}

export type SectionModel = {
  sectionId: string
  /** Discriminator for exporters (e.g. campaign_report_v1). */
  kind: string
  /** Presentation-ready payload; shape depends on kind. */
  data: unknown
}

export type ComposedSection = {
  definition: SectionDefinition
  model: SectionModel
}

export type ReportDocument = {
  schemaVersion: typeof REPORT_CONFIG_SCHEMA_VERSION
  config: ReportConfig
  composedAt: string
  sections: ComposedSection[]
}
