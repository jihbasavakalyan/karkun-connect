/**
 * Increment 13 — Curated Reports landing groups over the existing report-type catalog.
 * Presentation only: does not invent types or change Composer/providers.
 */

import {
  getReportType,
  listAvailableReportTypes,
  type ReportTypeDefinition,
  type ReportTypeId,
} from '@/lib/reporting/v2'

export type ReportsLandingSectionId =
  | 'featured'
  | 'campaigns'
  | 'weekly_ijtema'
  | 'baitul_maal'
  | 'organisational'
  | 'more'

export type ReportsLandingSection = {
  id: ReportsLandingSectionId
  title: string
  description: string
  reports: ReportTypeDefinition[]
}

/**
 * Presentation-only kind labels derived from existing catalog fields / known IDs.
 * Does not invent catalog maturity metadata or change availability.
 */
export type ReportPresentationKind =
  | 'executive'
  | 'operational'
  | 'individual'
  | 'audit'
  | 'advanced'

/** Report types with purpose-built PDF layouts in the existing exporter (not JSON dump). */
const PURPOSE_BUILT_PDF_IDS = new Set<ReportTypeId>([
  'executive_campaign',
  'individual_rukn',
  'individual_karkun',
  'weekly_ijtema',
])

/** Preferred featured order — omit gracefully when a type is unavailable. */
const FEATURED_IDS: ReportTypeId[] = [
  'executive_campaign',
  'campaign_progress',
  'weekly_ijtema',
  'baitul_maal',
  'rukn_performance',
]

const CAMPAIGN_IDS: ReportTypeId[] = [
  'executive_campaign',
  'campaign_progress',
  'men_performance',
  'women_performance',
  'follow_up',
  'visit_progress',
]

const ORGANISATIONAL_IDS: ReportTypeId[] = [
  'rukn_performance',
  'individual_rukn',
  'individual_karkun',
  'app_registration',
  'pending_activities',
  'communication',
  'muttafiqeen',
  'connections',
]

const MORE_IDS: ReportTypeId[] = [
  'snapshot_summary',
  'mathematical_audit',
  'integrity',
  'historical_comparison',
]

export function hasPurposeBuiltPdf(reportType: ReportTypeId): boolean {
  return PURPOSE_BUILT_PDF_IDS.has(reportType)
}

export function getReportPresentationKind(
  report: ReportTypeDefinition,
): ReportPresentationKind {
  if (report.id === 'individual_rukn' || report.id === 'individual_karkun') {
    return 'individual'
  }
  if (
    report.id === 'mathematical_audit' ||
    report.id === 'integrity' ||
    report.defaultDetailLevel === 'audit'
  ) {
    return 'audit'
  }
  if (
    report.id === 'historical_comparison' ||
    report.id === 'snapshot_summary' ||
    report.id === 'communication'
  ) {
    return 'advanced'
  }
  if (
    report.defaultDetailLevel === 'executive' ||
    report.id === 'executive_campaign' ||
    report.id === 'weekly_ijtema'
  ) {
    return 'executive'
  }
  return 'operational'
}

export function reportPresentationKindLabel(kind: ReportPresentationKind): string {
  switch (kind) {
    case 'executive':
      return 'Executive'
    case 'individual':
      return 'Individual'
    case 'audit':
      return 'Audit'
    case 'advanced':
      return 'Advanced'
    default:
      return 'Operational'
  }
}

function pickAvailable(ids: ReportTypeId[]): ReportTypeDefinition[] {
  const out: ReportTypeDefinition[] = []
  for (const id of ids) {
    const def = getReportType(id)
    if (def?.available && def.featureFlag) out.push(def)
  }
  return out
}

function uniqueById(reports: ReportTypeDefinition[]): ReportTypeDefinition[] {
  const seen = new Set<string>()
  return reports.filter((report) => {
    if (seen.has(report.id)) return false
    seen.add(report.id)
    return true
  })
}

/** All catalog types assigned to at least one landing section. */
function assignedIds(sections: ReportsLandingSection[]): Set<ReportTypeId> {
  const ids = new Set<ReportTypeId>()
  for (const section of sections) {
    for (const report of section.reports) ids.add(report.id)
  }
  return ids
}

/**
 * Build curated landing sections from the live catalog only.
 * Any available type not listed in primary groups is appended under More Reports.
 */
export function buildReportsLandingSections(): ReportsLandingSection[] {
  const featured = pickAvailable(FEATURED_IDS)
  const campaigns = pickAvailable(CAMPAIGN_IDS)
  const weekly = pickAvailable(['weekly_ijtema'])
  const baitul = pickAvailable(['baitul_maal'])
  const organisational = pickAvailable(ORGANISATIONAL_IDS)

  const draft: ReportsLandingSection[] = [
    {
      id: 'featured' as const,
      title: 'Featured / Primary',
      description: 'Primary reports for day-to-day management review.',
      reports: featured,
    },
    {
      id: 'campaigns' as const,
      title: 'Campaign Reports / مہمات',
      description:
        'Campaign progress, wing performance, follow-up, and visit progress. Opens the Composer — does not download a PDF by itself.',
      reports: campaigns,
    },
    {
      id: 'weekly_ijtema' as const,
      title: 'Weekly Ijtema / ہفتہ وار اجتماع',
      description:
        'Executive Weekly Ijtema report via Composer. Per-event attendance summaries remain on Weekly Ijtema management.',
      reports: weekly,
    },
    {
      id: 'baitul_maal' as const,
      title: 'Bait-ul-Maal / بیت المال',
      description:
        'Composer Bait-ul-Maal report. Per-cycle summaries remain on Bait-ul-Maal management.',
      reports: baitul,
    },
    {
      id: 'organisational' as const,
      title: 'Organisational / Other',
      description: 'Rukn, Karkun, registration, and organisational status reports.',
      reports: organisational,
    },
  ].filter((section) => section.reports.length > 0)

  const covered = assignedIds(draft)
  // Prefer a stable More order: known secondary ids first, then any remaining catalog types.
  const moreOnly = uniqueById([
    ...pickAvailable(MORE_IDS).filter((report) => !covered.has(report.id)),
    ...listAvailableReportTypes().filter((report) => !covered.has(report.id)),
  ])

  if (moreOnly.length > 0) {
    draft.push({
      id: 'more',
      title: 'More Reports',
      description: 'Specialised and less frequently used report types from the existing catalog.',
      reports: moreOnly,
    })
  }

  return draft
}

export function isKnownReportTypeId(value: string | null | undefined): value is ReportTypeId {
  if (!value) return false
  const def = getReportType(value as ReportTypeId)
  return Boolean(def?.available && def.featureFlag)
}

export function adminReportsComposerPath(reportType?: ReportTypeId): string {
  if (reportType && isKnownReportTypeId(reportType)) {
    return `/admin/reports?type=${encodeURIComponent(reportType)}`
  }
  return '/admin/reports?compose=1'
}
