/**
 * KC-037C-F — Active section builders (presentation from KC-033 / CampaignReportModel).
 * Replaces planned stubs for these ids with featureFlag:true builders.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getAllMuttafiqeen, getPeopleStatistics } from '@/lib/peopleStore'
import { ruknMaster } from '@/data/ruknMaster'
import { APP_VERSION } from '@/constants/app'
import { registerSection } from '../sectionRegistry'
import type { ReportContext, SectionModel, ReportTypeId } from '../types'
import { campaignModelFromContext, pairView } from './campaignModelAccess'
import { buildProviderInsights } from '../insights/buildProviderInsights'
import { reportLabel } from '../localization/reportLabels'
import { scoreFromPairs } from '../scoring/scoringConfig'
import type {
  AuditAppendixView,
  InsightItemView,
  KpiCardView,
  NarrativeBlockView,
  RankRowView,
} from '../presentationKinds'

const ALL_TYPES: ReportTypeId[] = [
  'executive_campaign',
  'campaign_progress',
  'men_performance',
  'women_performance',
  'rukn_performance',
  'individual_rukn',
  'individual_karkun',
  'weekly_ijtema',
  'visit_progress',
  'baitul_maal',
  'app_registration',
  'pending_activities',
  'communication',
  'follow_up',
  'muttafiqeen',
  'connections',
  'snapshot_summary',
  'mathematical_audit',
  'integrity',
  'historical_comparison',
]

function section(
  id: string,
  title: string,
  description: string,
  priority: number,
  types: ReportTypeId[],
  build: (ctx: ReportContext) => unknown,
): void {
  registerSection({
    id,
    title,
    displayName: title,
    description,
    requiredProviders: [
      'connections',
      'visits',
      'weeklyIjtema',
      'baitulMaal',
      'appRegistration',
      'campaignHealth',
    ],
    configurationSchema: `${id}_v1`,
    renderPriority: priority,
    supportedOutputs: ['pdf', 'dashboard', 'excel', 'csv', 'json', 'mobile_summary'],
    supportedReportTypes: types,
    supportedDetailLevels: ['executive', 'standard', 'detailed', 'audit'],
    dependencies: [],
    defaultEnabled: false,
    featureFlag: true,
    visibility: 'always',
    status: 'active',
    buildModel: (ctx) =>
      ({
        sectionId: id,
        kind: `${id}_v1`,
        data: build(ctx),
      }) satisfies SectionModel,
  })
}

function narrativeFromExecutive(ctx: ReportContext): NarrativeBlockView {
  const m = campaignModelFromContext(ctx)
  const e = m.executive
  const lang = ctx.localization.language
  return {
    whereAreWe: `${reportLabel('overview', lang)} · overall ${e.overallCampaignProgress}% · Health-driven snapshot.`,
    achieved: `Connections ${e.connected.completed}/${e.connected.total} · Visits ${e.visits.completed}/${e.visits.total} · App ${e.appRegistration.completed}/${e.appRegistration.total}.`,
    remaining: `Pending — connections ${e.connected.pending}, visits ${e.visits.pending}, app ${e.appRegistration.pending}, WI ${e.weeklyIjtema.pending}, BM ${e.baitulMaal.pending}.`,
    responsible: `${e.totalRukns} active Rukns (${e.maleRukns} men / ${e.femaleRukns} women).`,
    action: m.recommendations.slice(0, 3).join(' · ') || 'Review exception lists in appendix.',
  }
}

function genderPerformance(ctx: ReportContext, gender: 'Male' | 'Female') {
  const m = campaignModelFromContext(ctx)
  const rows = gender === 'Male' ? m.maleRukns : m.femaleRukns
  const ranked: RankRowView[] = [...rows]
    .filter((r) => r.assignedKarkuns > 0)
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 10)
    .map((r, i) => ({
      rank: i + 1,
      id: r.ruknId,
      name: r.ruknName,
      gender: r.gender,
      score: r.performanceScore,
      pct: r.overallPct,
    }))
  const needsAttention = [...rows]
    .filter((r) => r.criticalReasons.length > 0 || r.pendingActivities > 0)
    .sort((a, b) => a.overallPct - b.overallPct)
    .slice(0, 10)
    .map((r) => ({
      id: r.ruknId,
      name: r.ruknName,
      pending: r.pendingActivities,
      reasons: r.criticalReasons,
      pct: r.overallPct,
    }))
  const kpis: KpiCardView[] = [
    {
      id: 'rukns',
      title: 'Rukns',
      value: rows.length,
      metricFamily: 'census',
    },
    {
      id: 'connected',
      title: reportLabel('connectionProgress', ctx.localization.language),
      value: rows.reduce((s, r) => s + r.connections.completed, 0),
      metricFamily: 'connection',
    },
    {
      id: 'visits',
      title: reportLabel('visitProgress', ctx.localization.language),
      value: `${rows.reduce((s, r) => s + r.visits.completed, 0)}/${rows.reduce((s, r) => s + r.visits.total, 0)}`,
      metricFamily: 'visit',
    },
  ]
  return {
    gender,
    overview: kpis,
    rows: rows.map((r) => ({
      ruknId: r.ruknId,
      ruknName: r.ruknName,
      connections: pairView(r.connections),
      visits: pairView(r.visits),
      weeklyIjtema: pairView(r.weeklyIjtema),
      baitulMaal: pairView(r.baitulMaal),
      appRegistration: pairView(r.appRegistration),
      pendingActivities: r.pendingActivities,
      performanceScore: r.performanceScore,
      overallPct: r.overallPct,
    })),
    topPerformers: ranked,
    needsAttention,
    rankings: ranked,
    narrative: narrativeFromExecutive(ctx),
    connectionVsVisit:
      'Connection = administrative assignment. Visit = personal physical meeting. Never interchangeable.',
  }
}

function domainFromProviders(ctx: ReportContext, domain: 'visits' | 'connections' | 'weekly_ijtema' | 'baitul_maal' | 'app_registration') {
  const p = ctx.providers
  const m = campaignModelFromContext(ctx)
  if (domain === 'visits') {
    const v = p.visits.get()
    return {
      domain,
      label: reportLabel('visitProgress', ctx.localization.language),
      overall: pairView({ completed: v.completed, total: v.planned, pending: v.pending, pct: v.pct }),
      byRukn: m.allRukns.map((r) => ({
        ruknId: r.ruknId,
        name: r.ruknName,
        gender: r.gender,
        metric: pairView(r.visits),
      })),
      byGender: {
        male: m.activityProgress.find((a) => a.label.includes('دور') || a.label.toLowerCase().includes('visit'))
          ?.male ?? pairView(m.executive.visits),
        female:
          m.activityProgress.find((a) => a.label.includes('دور') || a.label.toLowerCase().includes('visit'))
            ?.female ?? pairView(m.executive.visits),
      },
      rankings: [...m.allRukns]
        .filter((r) => r.visits.total > 0)
        .sort((a, b) => b.visits.pct - a.visits.pct)
        .slice(0, 10)
        .map((r, i) => ({
          rank: i + 1,
          id: r.ruknId,
          name: r.ruknName,
          score: r.visits.pct,
          pct: r.visits.pct,
        })),
      narrative: narrativeFromExecutive(ctx),
      note: 'Visit ≠ Connection.',
    }
  }
  if (domain === 'connections') {
    const c = p.connections.get()
    return {
      domain,
      label: reportLabel('connectionProgress', ctx.localization.language),
      overall: pairView({
        completed: c.connected,
        total: c.total,
        pending: c.remaining,
        pct: c.progressPct,
      }),
      byRukn: m.allRukns.map((r) => ({
        ruknId: r.ruknId,
        name: r.ruknName,
        gender: r.gender,
        metric: pairView(r.connections),
      })),
      rankings: [...m.allRukns]
        .sort((a, b) => b.connections.pct - a.connections.pct)
        .slice(0, 10)
        .map((r, i) => ({
          rank: i + 1,
          id: r.ruknId,
          name: r.ruknName,
          score: r.connections.pct,
          pct: r.connections.pct,
        })),
      narrative: narrativeFromExecutive(ctx),
      note: 'Connection = administrative assignment to a Rukn.',
    }
  }
  if (domain === 'weekly_ijtema') {
    const wi = p.weeklyIjtema.getKpi()
    const slice = p.weeklyIjtema.getHealthSlice()
    return {
      domain,
      label: reportLabel('weeklyIjtema', ctx.localization.language),
      overall: {
        completed: slice.current ?? wi.present,
        total: slice.total ?? wi.totalAssigned,
        pending: Math.max(0, (slice.total ?? wi.totalAssigned) - (slice.current ?? wi.present)),
        pct: slice.pct ?? (wi.totalAssigned ? Math.round((wi.present / wi.totalAssigned) * 100) : 0),
      },
      byRukn: m.allRukns.map((r) => ({
        ruknId: r.ruknId,
        name: r.ruknName,
        gender: r.gender,
        metric: pairView(r.weeklyIjtema),
      })),
      neverAttended: m.allRukns.filter((r) => r.weeklyIjtema.completed === 0 && r.weeklyIjtema.total > 0).map((r) => r.ruknName),
      narrative: narrativeFromExecutive(ctx),
      historicalNote: reportLabel('snapshotOnly', ctx.localization.language),
    }
  }
  if (domain === 'baitul_maal') {
    const bm = p.baitulMaal.getKpi()
    const slice = p.baitulMaal.getHealthSlice()
    return {
      domain,
      label: reportLabel('baitulMaal', ctx.localization.language),
      overall: {
        completed: slice.current ?? bm.contributed,
        total: slice.total ?? bm.totalAssigned,
        pending: bm.pending,
        pct: slice.pct ?? 0,
      },
      byRukn: m.allRukns.map((r) => ({
        ruknId: r.ruknId,
        name: r.ruknName,
        gender: r.gender,
        metric: pairView(r.baitulMaal),
      })),
      narrative: narrativeFromExecutive(ctx),
    }
  }
  const app = p.appRegistration.get()
  return {
    domain,
    label: reportLabel('appRegistration', ctx.localization.language),
    overall: pairView({
      completed: app.registered,
      total: app.eligible,
      pending: app.pending,
      pct: app.pct,
    }),
    byRukn: m.allRukns.map((r) => ({
      ruknId: r.ruknId,
      name: r.ruknName,
      gender: r.gender,
      metric: pairView(r.appRegistration),
    })),
    narrative: narrativeFromExecutive(ctx),
  }
}

export function registerActivePlatformSections(): void {
  section(
    'executive_summary',
    'Executive Summary',
    'Where we are, achievements, remaining work, priorities',
    100,
    ['executive_campaign', 'snapshot_summary', 'campaign_progress'],
    (ctx) => ({
      narrative: narrativeFromExecutive(ctx),
      kpis: (() => {
        const e = campaignModelFromContext(ctx).executive
        return [
          { id: 'overall', title: 'Overall Progress', value: `${e.overallCampaignProgress}%`, metricFamily: 'other' },
          {
            id: 'connections',
            title: reportLabel('connectionProgress', ctx.localization.language),
            value: `${e.connected.completed}/${e.connected.total}`,
            metricFamily: 'connection',
          },
          {
            id: 'visits',
            title: reportLabel('visitProgress', ctx.localization.language),
            value: `${e.visits.completed}/${e.visits.total}`,
            metricFamily: 'visit',
          },
        ] satisfies KpiCardView[]
      })(),
      recommendations: campaignModelFromContext(ctx).recommendationGroups,
    }),
  )

  section(
    'kpi_dashboard',
    'Campaign KPIs',
    'Canonical KPI cards from KC-033',
    110,
    ALL_TYPES.filter((t) => t !== 'individual_karkun'),
    (ctx) => {
      const e = campaignModelFromContext(ctx).executive
      const health = ctx.providers.campaignHealth.getOverallPct()
      return {
        cards: [
          { id: 'health', title: 'Campaign Health', value: `${health}%`, metricFamily: 'other' },
          {
            id: 'conn',
            title: reportLabel('connectionProgress', ctx.localization.language),
            value: `${e.connected.pct}%`,
            subtitle: `${e.connected.completed}/${e.connected.total}`,
            metricFamily: 'connection',
          },
          {
            id: 'visit',
            title: reportLabel('visitProgress', ctx.localization.language),
            value: `${e.visits.pct}%`,
            subtitle: `${e.visits.completed}/${e.visits.total}`,
            metricFamily: 'visit',
          },
          {
            id: 'wi',
            title: reportLabel('weeklyIjtema', ctx.localization.language),
            value: `${e.weeklyIjtema.pct}%`,
            metricFamily: 'ijtema',
          },
          {
            id: 'bm',
            title: reportLabel('baitulMaal', ctx.localization.language),
            value: `${e.baitulMaal.pct}%`,
            metricFamily: 'baitul_maal',
          },
          {
            id: 'app',
            title: reportLabel('appRegistration', ctx.localization.language),
            value: `${e.appRegistration.pct}%`,
            metricFamily: 'app',
          },
        ] satisfies KpiCardView[],
      }
    },
  )

  section(
    'mens_performance',
    reportLabel('menPerformance', 'en'),
    "Men's wing performance from provider-backed Rukn rows",
    120,
    ['executive_campaign', 'men_performance', 'campaign_progress'],
    (ctx) => genderPerformance(ctx, 'Male'),
  )

  section(
    'womens_performance',
    reportLabel('womenPerformance', 'en'),
    "Women's wing performance from provider-backed Rukn rows",
    130,
    ['executive_campaign', 'women_performance', 'campaign_progress'],
    (ctx) => genderPerformance(ctx, 'Female'),
  )

  section(
    'individual_rukn_performance',
    'Individual Rukn Performance',
    'Single Rukn scorecard (scopeTarget.ruknId)',
    140,
    ['rukn_performance', 'individual_rukn', 'executive_campaign'],
    (ctx) => {
      const m = campaignModelFromContext(ctx)
      const ruknId = ctx.config.scopeTarget?.ruknId
      const row = ruknId
        ? m.allRukns.find((r) => r.ruknId === ruknId)
        : m.allRukns[0]
      if (!row) {
        return { missing: true, message: 'Select a Rukn (scopeTarget.ruknId).' }
      }
      const master = ruknMaster.find((r) => r.id === row.ruknId)
      return {
        profile: {
          ruknId: row.ruknId,
          name: row.ruknName,
          gender: row.gender,
          status: master?.status ?? 'active',
        },
        assignedKarkuns: row.assignedKarkuns,
        connections: pairView(row.connections),
        visits: pairView(row.visits),
        weeklyIjtema: pairView(row.weeklyIjtema),
        baitulMaal: pairView(row.baitulMaal),
        appRegistration: pairView(row.appRegistration),
        pendingActivities: row.pendingActivities,
        performanceScore: scoreFromPairs(row, 'individual_rukn'),
        overallPct: row.overallPct,
        strengths: row.criticalReasons.length === 0 ? ['No critical flags'] : [],
        recommendations: row.criticalReasons,
        narrative: narrativeFromExecutive(ctx),
      }
    },
  )

  section(
    'individual_karkun_performance',
    'Individual Karkun Performance',
    'Single Karkun dossier (scopeTarget.personId)',
    150,
    ['individual_karkun'],
    (ctx) => {
      const personId = ctx.config.scopeTarget?.personId
      if (!personId) {
        return { missing: true, message: 'Select a Karkun (scopeTarget.personId).' }
      }
      const person = getKarkunById(personId)
      if (!person) {
        return { missing: true, message: `Karkun not found: ${personId}` }
      }
      const wi = ctx.providers.weeklyIjtema.getCurrentAttendanceView(personId)
      const bm = ctx.providers.baitulMaal.getComplianceStatusView(personId)
      return {
        profile: {
          id: person.id,
          name: person.name,
          gender: person.gender,
          mobile: person.mobile,
          status: person.status,
        },
        connectedDate: (person as { connectedAt?: string }).connectedAt || null,
        responsibleRuknId: person.assignedRuknId || null,
        responsibleRuknName: person.assignedRukn || null,
        visitStatus: 'Person-level visit status via Connection Journey; aggregates use Visit providers.',
        weeklyIjtema: wi,
        baitulMaal: bm,
        appRegistration: person.jihAppRegistrationStatus || null,
        pendingTasks: [],
        remarks: 'KPIs via KC-033 attendance/compliance views; no alternate math.',
      }
    },
  )

  section(
    'weekly_ijtema',
    reportLabel('weeklyIjtema', 'en'),
    'Weekly Ijtema attendance analytics',
    160,
    ['executive_campaign', 'weekly_ijtema'],
    (ctx) => domainFromProviders(ctx, 'weekly_ijtema'),
  )

  section(
    'visits',
    reportLabel('visitProgress', 'en'),
    'Visit progress (never Connection)',
    170,
    ['executive_campaign', 'visit_progress', 'campaign_progress'],
    (ctx) => domainFromProviders(ctx, 'visits'),
  )

  section(
    'app_registration',
    reportLabel('appRegistration', 'en'),
    'JIH App registration',
    180,
    ['executive_campaign', 'app_registration'],
    (ctx) => domainFromProviders(ctx, 'app_registration'),
  )

  section(
    'baitul_maal',
    reportLabel('baitulMaal', 'en'),
    'Baitul Maal compliance',
    190,
    ['executive_campaign', 'baitul_maal'],
    (ctx) => domainFromProviders(ctx, 'baitul_maal'),
  )

  section(
    'connections',
    reportLabel('connectionProgress', 'en'),
    'Administrative Connection progress (never Visit)',
    195,
    ['executive_campaign', 'connections', 'campaign_progress'],
    (ctx) => domainFromProviders(ctx, 'connections'),
  )

  section(
    'muttafiqeen_summary',
    reportLabel('muttafiqeen', 'en'),
    'Muttafiqeen census (outside campaign execution)',
    198,
    ['executive_campaign', 'muttafiqeen'],
    (_ctx) => {
      const people = getPeopleStatistics()
      const all = getAllMuttafiqeen()
      return {
        total: people.totalMuttafiqeen ?? all.length,
        male: people.maleMuttafiqeen ?? all.filter((m) => m.gender === 'Male').length,
        female: people.femaleMuttafiqeen ?? all.filter((m) => m.gender === 'Female').length,
        connected: all.filter((m) => Boolean(m.assignedRuknId || m.assignedRukn)).length,
        statusBreakdown: {
          active: all.filter((m) => m.status === 'active').length,
          inactive: all.filter((m) => m.status !== 'active').length,
        },
        conversionTrackingReady: true,
        note: 'Muttafiqeen are outside campaign execution KPIs.',
      }
    },
  )

  section(
    'pending_tasks',
    reportLabel('pending', 'en'),
    'Pending operational work by Rukn',
    200,
    ['pending_activities', 'executive_campaign', 'follow_up'],
    (ctx) => {
      const m = campaignModelFromContext(ctx)
      return {
        exceptionLists: m.exceptionLists,
        pendingByRukn: m.pendingByRukn.map((r) => ({
          ruknId: r.ruknId,
          name: r.ruknName,
          pending: r.pendingActivities,
        })),
        narrative: narrativeFromExecutive(ctx),
      }
    },
  )

  section(
    'communication_status',
    'Communication Status',
    'Communication overview placeholder fed by pending/follow-up presentation',
    205,
    ['communication', 'follow_up'],
    (ctx) => ({
      narrative: narrativeFromExecutive(ctx),
      note: 'Detailed communication analytics reuse pending/follow-up until dedicated provider lands.',
      recommendations: campaignModelFromContext(ctx).recommendationGroups,
    }),
  )

  section(
    'top_performers',
    reportLabel('rankings', 'en'),
    'Top performers from provider-backed scores',
    210,
    ALL_TYPES,
    (ctx) => ({
      topOverall: campaignModelFromContext(ctx).topOverallPerformers,
      categoryLeaders: campaignModelFromContext(ctx).categoryLeaders,
    }),
  )

  section(
    'lowest_performers',
    reportLabel('needsAttention', 'en'),
    'Needs attention lists',
    215,
    ALL_TYPES,
    (ctx) => ({
      criticalRukns: campaignModelFromContext(ctx).criticalRukns.map((r) => ({
        ruknId: r.ruknId,
        name: r.ruknName,
        pct: r.overallPct,
        reasons: r.criticalReasons,
      })),
      exceptionLists: campaignModelFromContext(ctx).exceptionLists,
    }),
  )

  section(
    'trend_analysis',
    'Trend Analysis',
    'Historical comparison when evidence exists',
    220,
    ALL_TYPES,
    (ctx) => ({
      available: false,
      message: reportLabel('snapshotOnly', ctx.localization.language),
      currentSnapshot: {
        health: ctx.providers.campaignHealth.getOverallPct(),
        connections: ctx.providers.connections.get().progressPct,
        visits: ctx.providers.visits.get().pct,
      },
    }),
  )

  section(
    'recommendations',
    reportLabel('recommendations', 'en'),
    'Priority actions from presentation model + Rafeeq',
    240,
    ALL_TYPES,
    (ctx) => ({
      groups: campaignModelFromContext(ctx).recommendationGroups,
      insights: buildProviderInsights(ctx).filter((i) => i.source === 'rafeeq'),
    }),
  )

  section(
    'rafeeq_insights',
    reportLabel('insights', 'en'),
    'Rafeeq / provider insights (advise-only)',
    230,
    ALL_TYPES,
    (ctx) => ({
      items: buildProviderInsights(ctx) as InsightItemView[],
    }),
  )

  section(
    'data_quality',
    reportLabel('auditAppendix', 'en'),
    'Integrity / snapshot / provider metadata appendix',
    250,
    ALL_TYPES,
    (ctx) => {
      const appendix: AuditAppendixView = {
        integritySummary: 'Composer sections bound to KC-033 providers; no alternate KPI math.',
        snapshotKind: ctx.config.dateRange.kind,
        dataSources: [
          'CanonicalMetricProviders.connections',
          'CanonicalMetricProviders.visits',
          'CanonicalMetricProviders.weeklyIjtema',
          'CanonicalMetricProviders.baitulMaal',
          'CanonicalMetricProviders.appRegistration',
          'CanonicalMetricProviders.campaignHealth',
        ],
        providerVersion: 'KC-033',
        generatedAt: ctx.runtime.now.toISOString(),
        reportVersion: `KC-037C-F / app ${APP_VERSION}`,
        exportMetadata: {
          reportType: ctx.config.reportType,
          outputType: ctx.config.outputType,
          detailLevel: ctx.config.detailLevel,
          language: ctx.config.language,
        },
      }
      return { appendix }
    },
  )
}
