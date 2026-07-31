/**
 * KC-037A — Future section placeholders (metadata only; not enabled).
 * Implementing a section later = registerSection with buildModel + featureFlag true.
 */

import { registerSection } from '../sectionRegistry'
import type { SectionDefinition } from '../types'

const PLANNED: Array<Pick<
  SectionDefinition,
  'id' | 'displayName' | 'description' | 'renderPriority'
>> = [
  {
    id: 'executive_summary',
    displayName: 'Executive Summary',
    description: 'Progress, score, risks, priorities',
    renderPriority: 100,
  },
  {
    id: 'kpi_dashboard',
    displayName: 'KPI Dashboard',
    description: 'Canonical KPI cards',
    renderPriority: 110,
  },
  {
    id: 'mens_performance',
    displayName: "Men's Performance",
    description: 'Male wing performance block',
    renderPriority: 120,
  },
  {
    id: 'womens_performance',
    displayName: "Women's Performance",
    description: 'Female wing performance block',
    renderPriority: 130,
  },
  {
    id: 'individual_rukn_performance',
    displayName: 'Individual Rukn Performance',
    description: 'Rukn scorecard',
    renderPriority: 140,
  },
  {
    id: 'individual_karkun_performance',
    displayName: 'Individual Karkun Performance',
    description: 'Karkun dossier',
    renderPriority: 150,
  },
  {
    id: 'weekly_ijtema',
    displayName: 'Weekly Ijtema',
    description: 'Ijtema attendance analytics',
    renderPriority: 160,
  },
  {
    id: 'visits',
    displayName: 'Visits',
    description: 'Visit conducted analytics',
    renderPriority: 170,
  },
  {
    id: 'app_registration',
    displayName: 'App Registration',
    description: 'App registration analytics',
    renderPriority: 180,
  },
  {
    id: 'baitul_maal',
    displayName: 'Baitul Maal',
    description: 'Baitul Maal analytics',
    renderPriority: 190,
  },
  {
    id: 'top_performers',
    displayName: 'Top Performers',
    description: 'Rankings — top',
    renderPriority: 200,
  },
  {
    id: 'lowest_performers',
    displayName: 'Lowest Performers',
    description: 'Rankings — lowest',
    renderPriority: 210,
  },
  {
    id: 'trend_analysis',
    displayName: 'Trend Analysis',
    description: 'Historical trends (when evidence exists)',
    renderPriority: 220,
  },
  {
    id: 'rafeeq_insights',
    displayName: 'Rafeeq Insights',
    description: 'Recommendation Engine advise lines',
    renderPriority: 230,
  },
  {
    id: 'recommendations',
    displayName: 'Recommendations',
    description: 'P1/P2/P3 actions',
    renderPriority: 240,
  },
]

export function registerPlannedSectionStubs(): void {
  for (const stub of PLANNED) {
    registerSection({
      ...stub,
      requiredProviders: [],
      configurationSchema: `${stub.id}_v1`,
      supportedOutputs: ['pdf', 'dashboard', 'excel', 'csv', 'mobile_summary'],
      featureFlag: false,
      status: 'planned',
    })
  }
}
