/**
 * KC-0071 — Administrator Executive Dashboard (presentation only).
 * Reuses existing mission-control data helpers — no new queries or calculations engines.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, adminExecutionPath } from '@/constants/routes'
import {
  buildAdminCampaignHealthKpis,
  buildAdminInterventionQueue,
  buildAdminRecentActivityView,
  buildAllActiveRuknPerformance,
  type AdminRuknGenderPerformanceView,
} from '@/lib/missionControl/adminMissionControlPresentation'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useBackgroundHydration } from '@/hooks/useBackgroundHydration'
import { PendingKarkunRequestQueue } from '@/components/admin/PendingKarkunRequestQueue'
import { dashState03WidgetRender } from '@/lib/debug/kc00586DashboardStateProbe'
import { AdminHealthKpiCard } from './AdminHealthKpiCard'
import { resolveAdminHealthKpiPending } from './dashboardMetricReadiness'
import { McProgressRing } from './McProgressRing'

type AdminCommandCenterProps = {
  model: AdminMissionControlModel
  snapshot: AdminCommandCenterSnapshot
  metricsReady?: boolean
}

const RUKN_PAGE_SIZE = 8

const SEVERITY_CLASS = {
  critical: 'exdash-severity-critical',
  attention: 'exdash-severity-attention',
  watch: 'exdash-severity-watch',
} as const

type OverviewMetric = {
  id: string
  label: string
  value: string | number
  hint?: string
}

function summarizeRukns(rows: AdminRuknGenderPerformanceView[]): OverviewMetric[] {
  const total = rows.length
  const assigned = rows.filter((r) => r.assignedKarkuns > 0).length
  const connected = rows.reduce((sum, r) => sum + r.assignedKarkuns, 0)
  const pending = rows.reduce((sum, r) => sum + r.pendingWork, 0)
  const avg =
    total === 0
      ? 0
      : Math.round(rows.reduce((sum, r) => sum + r.completionPct, 0) / total)
  const critical = rows.filter((r) => r.status.tone === 'red' && r.assignedKarkuns > 0).length

  return [
    { id: 'rukns', label: 'Total Rukns', value: total },
    { id: 'assigned', label: 'Assigned', value: assigned, hint: 'With connections' },
    { id: 'connected', label: 'Connected', value: connected, hint: 'Active Karkuns' },
    { id: 'pending', label: 'Pending', value: pending },
    { id: 'progress', label: 'Average Progress', value: `${avg}%` },
    { id: 'critical', label: 'Critical', value: critical },
  ]
}

function activityTone(message: string): 'completed' | 'transfer' | 'pending' | 'critical' | 'idle' {
  const lower = message.toLowerCase()
  if (/transfer|transferred/.test(lower)) return 'transfer'
  if (/critical|overdue|fail|denied|error/.test(lower)) return 'critical'
  if (/pending|await|due/.test(lower)) return 'pending'
  if (/complete|completed|approved|connected|assign|archiv/.test(lower)) return 'completed'
  return 'idle'
}

function RuknPerformanceCard({ row }: { row: AdminRuknGenderPerformanceView }) {
  return (
    <li className="exdash-rukn-card">
      <div className="exdash-rukn-card-top">
        <div className="min-w-0 flex-1">
          <p className="exdash-rukn-name">{row.ruknName}</p>
          <p className="exdash-rukn-meta">
            {row.assignedKarkuns} connected · {row.pendingWork} pending
          </p>
        </div>
        <span className={`exdash-status-badge exdash-status-${row.status.tone}`}>
          {row.status.label}
        </span>
      </div>
      <div className="exdash-rukn-card-bottom">
        <div className="exdash-rukn-progress" aria-hidden="true">
          <div className="exdash-rukn-progress-track">
            <div
              className="exdash-rukn-progress-fill"
              style={{ width: `${Math.max(0, Math.min(100, row.completionPct))}%` }}
            />
          </div>
          <span className="exdash-rukn-pct">{row.completionPct}%</span>
        </div>
        <Link to={row.route} className="exdash-rukn-view">
          Quick View
        </Link>
      </div>
    </li>
  )
}

function PaginatedRuknGrid({
  rows,
  emptyLabel,
}: {
  rows: AdminRuknGenderPerformanceView[]
  emptyLabel: string
}) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(rows.length / RUKN_PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const slice = rows.slice(safePage * RUKN_PAGE_SIZE, safePage * RUKN_PAGE_SIZE + RUKN_PAGE_SIZE)

  if (rows.length === 0) {
    return <p className="exdash-muted">{emptyLabel}</p>
  }

  return (
    <div className="space-y-3">
      <ul className="exdash-rukn-grid">
        {slice.map((row) => (
          <RuknPerformanceCard key={row.ruknId} row={row} />
        ))}
      </ul>
      {totalPages > 1 ? (
        <div className="exdash-pager">
          <button
            type="button"
            className="exdash-pager-btn"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="exdash-pager-meta">
            Page {safePage + 1} of {totalPages} · {rows.length} Rukns
          </span>
          <button
            type="button"
            className="exdash-pager-btn"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      ) : (
        <p className="exdash-pager-meta">{rows.length} Rukns</p>
      )}
    </div>
  )
}

function OverviewMetricGrid({
  metrics,
  title,
}: {
  metrics: OverviewMetric[]
  title: string
}) {
  return (
    <section className="exdash-panel" aria-label={title}>
      <div className="exdash-section-head">
        <h2 className="exdash-section-title">{title}</h2>
      </div>
      <ul className="exdash-metric-grid">
        {metrics.map((metric) => (
          <li key={metric.id} className="exdash-metric-card">
            <p className="exdash-metric-label">{metric.label}</p>
            <p className="exdash-metric-value">{metric.value}</p>
            {metric.hint ? <p className="exdash-metric-hint">{metric.hint}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function AdminCommandCenter({
  model,
  snapshot,
  metricsReady = true,
}: AdminCommandCenterProps) {
  const { assignmentVersion } = useAssignmentEngine()
  const backgroundReady = useBackgroundHydration()
  const [showAllActivity, setShowAllActivity] = useState(false)

  const healthKpis = useMemo(() => {
    void assignmentVersion
    return buildAdminCampaignHealthKpis(model)
  }, [model, assignmentVersion])

  useEffect(() => {
    for (const kpi of healthKpis) {
      const pending = resolveAdminHealthKpiPending(kpi.id, metricsReady, backgroundReady)
      dashState03WidgetRender(
        kpi.id === 'connections'
          ? 'Connections'
          : kpi.id === 'visits-done'
            ? 'Visits'
            : kpi.id === 'visits-pending'
              ? 'Pending'
              : kpi.id === 'follow-ups'
                ? 'FollowUps'
                : kpi.id === 'development'
                  ? 'Development'
                  : `Health:${kpi.id}`,
        pending ? 'loading' : 'ready',
        { value: kpi.value, metricsReady, backgroundReady, pending },
      )
    }
  }, [healthKpis, metricsReady, backgroundReady])

  const interventions = useMemo(() => {
    void assignmentVersion
    if (!backgroundReady) return []
    return buildAdminInterventionQueue(snapshot)
  }, [snapshot, assignmentVersion, backgroundReady])

  useEffect(() => {
    dashState03WidgetRender(
      'InterventionQueue',
      backgroundReady ? (interventions.length === 0 ? 'empty' : 'ready') : 'loading',
      { count: interventions.length, backgroundReady },
    )
  }, [interventions, backgroundReady])

  const allRukns = useMemo(() => {
    void assignmentVersion
    if (!backgroundReady) return []
    return buildAllActiveRuknPerformance()
  }, [assignmentVersion, backgroundReady])

  const maleRukns = useMemo(
    () => allRukns.filter((row) => row.gender === 'Male'),
    [allRukns],
  )
  const femaleRukns = useMemo(
    () => allRukns.filter((row) => row.gender === 'Female'),
    [allRukns],
  )

  const collectiveMetrics = useMemo(() => {
    if (!backgroundReady) {
      return [
        { id: 'rukns', label: 'Total Rukns', value: '—' },
        { id: 'assigned', label: 'Assigned', value: '—' },
        {
          id: 'connected',
          label: 'Connected',
          value: metricsReady ? model.connectionProgress.connected : '—',
        },
        { id: 'pending', label: 'Pending', value: '—' },
        {
          id: 'progress',
          label: 'Average Progress',
          value: metricsReady ? `${model.connectionProgress.pct}%` : '—',
        },
        {
          id: 'critical',
          label: 'Critical',
          value: metricsReady ? model.campaignHealth.criticalFollowUps : '—',
        },
      ] satisfies OverviewMetric[]
    }
    const base = summarizeRukns(allRukns)
    return base.map((metric) =>
      metric.id === 'connected'
        ? {
            ...metric,
            value: metricsReady ? model.connectionProgress.connected : metric.value,
            hint: 'Canonical connected',
          }
        : metric,
    )
  }, [allRukns, backgroundReady, metricsReady, model])

  const maleMetrics = useMemo(() => summarizeRukns(maleRukns), [maleRukns])
  const femaleMetrics = useMemo(() => summarizeRukns(femaleRukns), [femaleRukns])

  const activity = useMemo(() => {
    void assignmentVersion
    if (!backgroundReady) return []
    return buildAdminRecentActivityView(showAllActivity ? 20 : 8)
  }, [assignmentVersion, showAllActivity, backgroundReady])

  return (
    <div className="exdash-stack">
      <OverviewMetricGrid title="Collective Overview" metrics={collectiveMetrics} />

      <section className="exdash-panel" aria-label="Campaign health">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title">Campaign Health</h2>
          <Link to={adminExecutionPath()} className="exdash-section-link">
            Overview →
          </Link>
        </div>
        <ul className="exdash-health-grid" aria-label="Campaign health KPIs">
          {healthKpis.map((kpi) => (
            <AdminHealthKpiCard
              key={kpi.id}
              kpi={kpi}
              metricsReady={metricsReady}
              backgroundReady={backgroundReady}
            />
          ))}
        </ul>
      </section>

      {backgroundReady ? <PendingKarkunRequestQueue /> : null}

      <section className="exdash-panel exdash-panel-emphasis" aria-label="Intervention queue">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title">Intervention Queue</h2>
          <span className="exdash-section-meta">
            {!backgroundReady
              ? 'Loading'
              : interventions.length === 0
                ? 'Clear'
                : `${interventions.length} prioritized`}
          </span>
        </div>
        {!backgroundReady ? (
          <p className="exdash-muted" aria-busy="true">
            Loading campaign data…
          </p>
        ) : interventions.length === 0 ? (
          <p className="exdash-muted">No urgent interventions right now.</p>
        ) : (
          <ol className="exdash-queue">
            {interventions.map((item, index) => (
              <li key={item.id}>
                <Link to={item.route} className={`exdash-queue-item ${SEVERITY_CLASS[item.severity]}`}>
                  <span className="exdash-queue-rank" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="exdash-queue-body">
                    <span className="exdash-queue-title">{item.title}</span>
                    <span className="exdash-queue-detail">{item.detail}</span>
                  </div>
                  <span className={`exdash-queue-badge ${SEVERITY_CLASS[item.severity]}`}>
                    {item.severity}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <OverviewMetricGrid title="Male Overview" metrics={maleMetrics} />
      <section className="exdash-panel" aria-label="Male Rukn performance">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title">Male Rukn Performance</h2>
          <Link to={ROUTES.ADMIN_RUKN} className="exdash-section-link">
            All Rukns →
          </Link>
        </div>
        {!backgroundReady ? (
          <p className="exdash-muted" aria-busy="true">
            Loading campaign data…
          </p>
        ) : (
          <PaginatedRuknGrid rows={maleRukns} emptyLabel="No Male Rukns found." />
        )}
      </section>

      <OverviewMetricGrid title="Female Overview" metrics={femaleMetrics} />
      <section className="exdash-panel" aria-label="Female Rukn performance">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title">Female Rukn Performance</h2>
          <Link to={ROUTES.ADMIN_RUKN} className="exdash-section-link">
            All Rukns →
          </Link>
        </div>
        {!backgroundReady ? (
          <p className="exdash-muted" aria-busy="true">
            Loading campaign data…
          </p>
        ) : (
          <PaginatedRuknGrid rows={femaleRukns} emptyLabel="No Female Rukns found." />
        )}
      </section>

      <section className="exdash-panel exdash-history-panel" aria-label="Recent activity history">
        <div className="exdash-section-head">
          <h2 className="exdash-section-title">History</h2>
          <Link to={ROUTES.ADMIN_COMMUNICATION} className="exdash-section-link">
            Full log →
          </Link>
        </div>
        {!backgroundReady ? (
          <p className="exdash-muted" aria-busy="true">
            Loading campaign data…
          </p>
        ) : activity.length === 0 ? (
          <p className="exdash-muted">No recent campaign activity.</p>
        ) : (
          <>
            <ul className="exdash-history-timeline">
              {activity.map((item) => {
                const tone = activityTone(item.message)
                return (
                  <li key={item.id} className={`exdash-history-item exdash-history-${tone}`}>
                    <span className="exdash-history-dot" aria-hidden="true" />
                    <div className="exdash-history-body">
                      <p className="exdash-history-message">{item.message}</p>
                      <p className="exdash-history-time">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="exdash-expand-btn"
              onClick={() => setShowAllActivity((open) => !open)}
            >
              {showAllActivity ? 'Show less' : 'Show more history'}
            </button>
          </>
        )}
      </section>

      {metricsReady ? (
        <section className="exdash-panel exdash-progress-aside" aria-label="Campaign progress summary">
          <div className="exdash-section-head">
            <h2 className="exdash-section-title">Campaign Pulse</h2>
          </div>
          <div className="exdash-pulse-row">
            <McProgressRing
              value={model.connectionProgress.pct}
              size={72}
              stroke={8}
              tone="green"
              label={`${model.connectionProgress.pct}%`}
              sublabel="Complete"
            />
            <dl className="exdash-pulse-metrics">
              <div>
                <dt>Connected</dt>
                <dd>{model.connectionProgress.connected}</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{model.connectionProgress.remaining}</dd>
              </div>
              <div>
                <dt>Days left</dt>
                <dd>{model.daysRemaining ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}
    </div>
  )
}
