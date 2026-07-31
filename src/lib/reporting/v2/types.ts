/**
 * KC-037A/B — Executive Report Framework V2 types.
 * Presentation contracts only — KPIs come from KC-033 providers.
 * 037B extends metadata additively; pipeline unchanged.
 */

import type { CanonicalMetricProviders } from '@/lib/operations/canonicalCampaignMetrics'
import type { CampaignListItem } from '@/constants/mockMissions'
import type { CampaignTimeline } from '@/services/campaignService'

export const REPORT_CONFIG_SCHEMA_VERSION = 1 as const

/** Catalog report type ids (037B). Legacy alias: executive_campaign. */
export type ReportTypeId =
  | 'executive_campaign'
  | 'campaign_progress'
  | 'men_performance'
  | 'women_performance'
  | 'rukn_performance'
  | 'individual_rukn'
  | 'individual_karkun'
  | 'weekly_ijtema'
  | 'visit_progress'
  | 'baitul_maal'
  | 'app_registration'
  | 'pending_activities'
  | 'communication'
  | 'follow_up'
  | 'muttafiqeen'
  | 'connections'
  | 'snapshot_summary'
  | 'mathematical_audit'
  | 'integrity'
  | 'historical_comparison'
  | 'custom'

/** @deprecated Use ReportTypeId — kept for 037A call sites. */
export type ReportType = ReportTypeId

export type ReportScope =
  | 'overall_campaign'
  | 'mens_wing'
  | 'womens_wing'
  | 'combined'
  | 'selected_rukn'
  | 'selected_halqa'
  | 'selected_ward'
  | 'individual_karkun'
  | 'individual_rukn'
  | 'entire_registry'
  | 'connected_only'
  | 'available_only'
  | 'muttafiqeen_only'
  | 'campaign_comparison'

export type ReportAudience = 'administrator' | 'leadership' | 'rukn'
export type ReportLanguage = 'ur' | 'en' | 'bilingual'
export type ReportOutputType = 'pdf' | 'dashboard' | 'excel' | 'csv' | 'json' | 'mobile_summary'
export type ReportTheme = 'default' | 'executive' | 'minimal' | 'classic_urdu' | 'neutral'
export type ReportDetailLevel = 'executive' | 'standard' | 'detailed' | 'audit'
export type ReportOrientation = 'portrait' | 'landscape'

export type ReportDateRangeKind =
  | 'snapshot'
  | 'today'
  | 'yesterday'
  | 'current_week'
  | 'previous_week'
  | 'current_month'
  | 'campaign_duration'
  | 'custom_range'
  | 'all_time'

export type ReportDateRange = {
  kind: ReportDateRangeKind
  /** ISO dates when kind === custom_range */
  startIso?: string
  endIso?: string
}

export type ReportOptions = {
  confidentialWatermark: boolean
  showCharts: boolean
  showRankings: boolean
  showAppendix: boolean
  orientation: ReportOrientation
}

export type ReportScopeTarget = {
  ruknId?: string
  halqaId?: string
  wardId?: string
  personId?: string
}

export type ReportConfig = {
  schemaVersion: typeof REPORT_CONFIG_SCHEMA_VERSION
  reportType: ReportTypeId
  scope: ReportScope
  scopeTarget?: ReportScopeTarget
  audience: ReportAudience
  language: ReportLanguage
  dateRange: ReportDateRange
  enabledSections: string[]
  outputType: ReportOutputType
  theme: ReportTheme
  detailLevel: ReportDetailLevel
  options: ReportOptions
  generatedBy?: string
  organization?: string
  /** Optional preset id that produced this config. */
  presetId?: string
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

export type SectionVisibility = 'always' | 'admin' | 'hidden'

export type SectionDefinition = {
  id: string
  /** UI title (037B); falls back to displayName. */
  title?: string
  displayName: string
  description: string
  requiredProviders: CanonicalProviderId[]
  /** Free-form config schema id for future UI. */
  configurationSchema: string
  renderPriority: number
  supportedOutputs: SectionOutputSupport[]
  /** Empty = all report types. */
  supportedReportTypes?: ReportTypeId[]
  supportedDetailLevels?: ReportDetailLevel[]
  /** Section ids that must also be enabled. */
  dependencies?: string[]
  defaultEnabled?: boolean
  featureFlag: boolean
  visibility?: SectionVisibility
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

export type ReportTypeDefinition = {
  id: ReportTypeId
  title: string
  description: string
  /** When false, selectable in UI but generate is disabled. */
  available: boolean
  defaultScope: ReportScope
  defaultDetailLevel: ReportDetailLevel
  defaultOutput: ReportOutputType
  /** Section ids shown for this type (subset of registry). Empty = all visible. */
  sectionIds: string[]
  featureFlag: boolean
}

export type ReportPresetDefinition = {
  id: string
  title: string
  description: string
  reportType: ReportTypeId
  config: Partial<ReportConfig>
  featureFlag: boolean
}

export type ReportValidationIssue = {
  code: string
  message: string
  sectionId?: string
  providerId?: string
}

export type ReportValidationResult = {
  ok: boolean
  errors: ReportValidationIssue[]
  warnings: ReportValidationIssue[]
}

export type ReportPreviewModel = {
  reportTitle: string
  reportTypeId: ReportTypeId
  scopeLabel: string
  dateRangeLabel: string
  sectionsIncluded: Array<{ id: string; title: string; active: boolean }>
  estimatedPages: number
  outputType: ReportOutputType
  language: ReportLanguage
  detailLevel: ReportDetailLevel
  connectionVsVisitNote: string
  diagnostics: ReportValidationResult
}
