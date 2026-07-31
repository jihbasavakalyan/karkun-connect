/**
 * KC-037A/B — Future section placeholders (metadata for Report Center UI).
 * Implementing a section later = registerSection with buildModel + featureFlag true.
 */

import { registerSection } from '../sectionRegistry'
import type { ReportTypeId, SectionDefinition } from '../types'

type Stub = Pick<
  SectionDefinition,
  'id' | 'displayName' | 'description' | 'renderPriority'
> & {
  title?: string
  supportedReportTypes?: ReportTypeId[]
  defaultEnabled?: boolean
}

const PLANNED: Stub[] = [
  {
    id: 'executive_summary',
    title: 'Executive Summary',
    displayName: 'Executive Summary',
    description: 'Progress, score, risks, priorities',
    renderPriority: 100,
    supportedReportTypes: ['executive_campaign', 'snapshot_summary'],
  },
  {
    id: 'kpi_dashboard',
    title: 'Campaign KPIs',
    displayName: 'KPI Dashboard',
    description: 'Canonical KPI cards from KC-033',
    renderPriority: 110,
    supportedReportTypes: ['executive_campaign', 'campaign_progress', 'snapshot_summary'],
  },
  {
    id: 'mens_performance',
    title: 'Men Performance',
    displayName: "Men's Performance",
    description: 'Male wing performance block',
    renderPriority: 120,
    supportedReportTypes: ['executive_campaign', 'men_performance'],
  },
  {
    id: 'womens_performance',
    title: 'Women Performance',
    displayName: "Women's Performance",
    description: 'Female wing performance block',
    renderPriority: 130,
    supportedReportTypes: ['executive_campaign', 'women_performance'],
  },
  {
    id: 'individual_rukn_performance',
    title: 'Individual Rukn',
    displayName: 'Individual Rukn Performance',
    description: 'Rukn scorecard',
    renderPriority: 140,
    supportedReportTypes: ['rukn_performance', 'individual_rukn'],
  },
  {
    id: 'individual_karkun_performance',
    title: 'Individual Karkun',
    displayName: 'Individual Karkun Performance',
    description: 'Karkun dossier',
    renderPriority: 150,
    supportedReportTypes: ['individual_karkun'],
  },
  {
    id: 'weekly_ijtema',
    title: 'Weekly Ijtema',
    displayName: 'Weekly Ijtema',
    description: 'Ijtema attendance analytics',
    renderPriority: 160,
    supportedReportTypes: ['executive_campaign', 'weekly_ijtema'],
  },
  {
    id: 'visits',
    title: 'Visit Progress',
    displayName: 'Visits',
    description: 'Personal Visit progress (never conflate with Connection)',
    renderPriority: 170,
    supportedReportTypes: ['executive_campaign', 'visit_progress', 'campaign_progress'],
  },
  {
    id: 'app_registration',
    title: 'App Registration',
    displayName: 'App Registration',
    description: 'JIH App registration analytics',
    renderPriority: 180,
    supportedReportTypes: ['executive_campaign', 'app_registration'],
  },
  {
    id: 'baitul_maal',
    title: 'Baitul Maal',
    displayName: 'Baitul Maal',
    description: 'Baitul Maal analytics',
    renderPriority: 190,
    supportedReportTypes: ['executive_campaign', 'baitul_maal'],
  },
  {
    id: 'connections',
    title: 'Connections',
    displayName: 'Connections',
    description: 'Administrative Connection assignment (never conflate with Visit)',
    renderPriority: 195,
    supportedReportTypes: ['executive_campaign', 'connections', 'campaign_progress'],
  },
  {
    id: 'muttafiqeen_summary',
    title: 'Muttafiqeen',
    displayName: 'Muttafiqeen Summary',
    description: 'Total / male / female Muttafiqeen (outside campaign execution)',
    renderPriority: 198,
    supportedReportTypes: ['executive_campaign', 'muttafiqeen'],
  },
  {
    id: 'pending_tasks',
    title: 'Pending Activities',
    displayName: 'Pending Tasks',
    description: 'Pending operational work',
    renderPriority: 200,
    supportedReportTypes: ['pending_activities', 'executive_campaign'],
  },
  {
    id: 'communication_status',
    title: 'Communication',
    displayName: 'Communication Status',
    description: 'Communication status overview',
    renderPriority: 205,
    supportedReportTypes: ['communication'],
  },
  {
    id: 'top_performers',
    title: 'Rankings',
    displayName: 'Top Performers',
    description: 'Rankings — top',
    renderPriority: 210,
    supportedReportTypes: ['executive_campaign'],
  },
  {
    id: 'lowest_performers',
    title: 'Lowest Performers',
    displayName: 'Lowest Performers',
    description: 'Rankings — lowest',
    renderPriority: 215,
    supportedReportTypes: ['executive_campaign'],
  },
  {
    id: 'trend_analysis',
    title: 'Trend Analysis',
    displayName: 'Trend Analysis',
    description: 'Historical trends (when evidence exists)',
    renderPriority: 220,
    supportedReportTypes: ['historical_comparison'],
  },
  {
    id: 'rafeeq_insights',
    title: 'Rafeeq Insights',
    displayName: 'Rafeeq Insights',
    description: 'Recommendation Engine advise lines',
    renderPriority: 230,
    supportedReportTypes: ['executive_campaign'],
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    displayName: 'Recommendations',
    description: 'P1/P2/P3 actions',
    renderPriority: 240,
    supportedReportTypes: ['executive_campaign', 'follow_up'],
  },
  {
    id: 'data_quality',
    title: 'Appendix / Data Quality',
    displayName: 'Data Quality & Exceptions',
    description: 'Audit appendix',
    renderPriority: 250,
    supportedReportTypes: ['mathematical_audit', 'integrity', 'executive_campaign'],
  },
  {
    id: 'future_whatsapp_cards',
    title: 'WhatsApp Cards (Future)',
    displayName: 'WhatsApp-ready image cards',
    description: 'Optional P3 export — planned only',
    renderPriority: 900,
    supportedReportTypes: ['executive_campaign'],
  },
]

export function registerPlannedSectionStubs(): void {
  for (const stub of PLANNED) {
    registerSection({
      id: stub.id,
      title: stub.title ?? stub.displayName,
      displayName: stub.displayName,
      description: stub.description,
      requiredProviders: [],
      configurationSchema: `${stub.id}_v1`,
      renderPriority: stub.renderPriority,
      supportedOutputs: ['pdf', 'dashboard', 'excel', 'csv', 'json', 'mobile_summary'],
      supportedReportTypes: stub.supportedReportTypes ?? [],
      supportedDetailLevels: ['executive', 'standard', 'detailed', 'audit'],
      dependencies: [],
      defaultEnabled: stub.defaultEnabled ?? false,
      featureFlag: false,
      visibility: 'always',
      status: 'planned',
    })
  }
}
