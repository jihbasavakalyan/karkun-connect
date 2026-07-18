/**
 * KC-015 — Administrator Mission Control command center panels.
 * Presentation only: health, intervention, Rukn performance, trends, activity.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, adminCommunicationPath, adminExecutionPath } from '@/constants/routes'
import {
  buildAdminCampaignHealthKpis,
  buildAdminCampaignTrends,
  buildAdminInterventionQueue,
  buildAdminRecentActivityView,
  buildAdminRuknPerformance,
  type AdminHealthKpi,
} from '@/lib/missionControl/adminMissionControlPresentation'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { PendingKarkunRequestQueue } from '@/components/admin/PendingKarkunRequestQueue'

type AdminCommandCenterProps = {
  model: AdminMissionControlModel
  snapshot: AdminCommandCenterSnapshot
}

const HEALTH_TONE: Record<AdminHealthKpi['tone'], string> = {
  green: 'mc-kpi-tone-green',
  amber: 'mc-kpi-tone-amber',
  red: 'mc-kpi-tone-red',
  neutral: 'mc-kpi-tone-neutral',
}

const SEVERITY_CLASS = {
  critical: 'acc-severity-critical',
  attention: 'acc-severity-attention',
  watch: 'acc-severity-watch',
} as const

export function AdminCommandCenter({ model, snapshot }: AdminCommandCenterProps) {
  const { assignmentVersion } = useAssignmentEngine()
  const [showAllActivity, setShowAllActivity] = useState(false)

  const healthKpis = useMemo(() => {
    void assignmentVersion
    return buildAdminCampaignHealthKpis(model)
  }, [model, assignmentVersion])

  const interventions = useMemo(() => {
    void assignmentVersion
    return buildAdminInterventionQueue(snapshot)
  }, [snapshot, assignmentVersion])

  const ruknRows = useMemo(() => {
    void assignmentVersion
    return buildAdminRuknPerformance(12)
  }, [assignmentVersion])

  const trends = useMemo(() => {
    void assignmentVersion
    return buildAdminCampaignTrends()
  }, [assignmentVersion])

  const activity = useMemo(() => {
    void assignmentVersion
    return buildAdminRecentActivityView(showAllActivity ? 20 : 5)
  }, [assignmentVersion, showAllActivity])

  return (
    <div className="acc-stack">
      <section className="mc-panel mc-panel-compact acc-section" aria-label="Campaign health">
        <div className="acc-section-head">
          <h2 className="mc-panel-title">Campaign Health</h2>
          <Link to={adminExecutionPath()} className="acc-section-link">
            Overview →
          </Link>
        </div>
        <ul className="acc-health-grid" aria-label="Campaign health KPIs">
          {healthKpis.map((kpi) => {
            const tone = HEALTH_TONE[kpi.tone]
            const body = (
              <>
                <span className="acc-health-label">{kpi.label}</span>
                <span className={`acc-health-value ${tone}`}>{kpi.value}</span>
                {kpi.hint ? <span className="acc-health-hint">{kpi.hint}</span> : null}
              </>
            )
            return (
              <li key={kpi.id} className={`acc-health-card ${tone}`}>
                {kpi.route ? (
                  <Link to={kpi.route} className="acc-health-link">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <PendingKarkunRequestQueue />

      <section className="mc-panel mc-panel-compact mc-panel-primary acc-section" aria-label="Intervention queue">
        <div className="acc-section-head">
          <h2 className="mc-panel-title">Intervention Queue</h2>
          <span className="acc-section-meta">
            {interventions.length === 0 ? 'Clear' : `${interventions.length} prioritized`}
          </span>
        </div>
        {interventions.length === 0 ? (
          <p className="mc-caption">No urgent interventions right now.</p>
        ) : (
          <ol className="acc-queue">
            {interventions.map((item, index) => (
              <li key={item.id}>
                <Link to={item.route} className={`acc-queue-item ${SEVERITY_CLASS[item.severity]}`}>
                  <span className="acc-queue-rank" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="acc-queue-body">
                    <span className="acc-queue-title">{item.title}</span>
                    <span className="acc-queue-detail">{item.detail}</span>
                  </div>
                  <span className={`acc-queue-badge ${SEVERITY_CLASS[item.severity]}`}>
                    {item.severity}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mc-panel mc-panel-compact acc-section" aria-label="Rukn performance">
        <div className="acc-section-head">
          <h2 className="mc-panel-title">Rukn Performance</h2>
          <Link to={ROUTES.ADMIN_RUKN} className="acc-section-link">
            All Rukns →
          </Link>
        </div>
        {ruknRows.length === 0 ? (
          <p className="mc-caption">No Rukn performance yet.</p>
        ) : (
          <div className="acc-rukn-table-wrap">
            <table className="acc-rukn-table">
              <thead>
                <tr>
                  <th scope="col">Rukn</th>
                  <th scope="col">Assigned</th>
                  <th scope="col">Done</th>
                  <th scope="col">Pending</th>
                  <th scope="col">%</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {ruknRows.map((row) => (
                  <tr key={row.ruknId} className={`acc-rukn-row acc-rukn-${row.status.tone}`}>
                    <td>
                      <Link to={row.route} className="acc-rukn-name">
                        {row.ruknName}
                      </Link>
                      {row.lastActivity ? (
                        <span className="acc-rukn-last">{row.lastActivity}</span>
                      ) : (
                        <span className="acc-rukn-last">No recent activity</span>
                      )}
                    </td>
                    <td>{row.assignedKarkuns}</td>
                    <td>{row.visits}</td>
                    <td>{row.pendingWork}</td>
                    <td>
                      <span className="acc-rukn-pct">{row.completionPct}%</span>
                    </td>
                    <td>
                      <span className={`acc-rukn-status acc-status-${row.status.tone}`}>
                        {row.status.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="acc-split">
        <section className="mc-panel mc-panel-compact acc-section" aria-label="Campaign trends">
          <div className="acc-section-head">
            <h2 className="mc-panel-title">Campaign Trends</h2>
          </div>
          <ul className="acc-trends">
            {trends.map((trend) => (
              <li key={trend.id} className="acc-trend-card">
                <span className="acc-trend-label">{trend.label}</span>
                <span className="acc-trend-value">{trend.value}</span>
                {trend.detail ? <span className="acc-trend-detail">{trend.detail}</span> : null}
                <span
                  className="acc-trend-bar"
                  style={{
                    width: `${Math.min(100, Math.max(12, Number.parseInt(String(trend.value), 10) || 40))}%`,
                  }}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="mc-panel mc-panel-compact mc-panel-quiet acc-section" aria-label="Recent activity">
          <div className="acc-section-head">
            <h2 className="mc-panel-title">Recent Activity</h2>
            <Link to={adminCommunicationPath()} className="acc-section-link">
              History →
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="mc-caption">No recent campaign activity.</p>
          ) : (
            <>
              <ul className="mc-activity-list mc-activity-list-compact">
                {activity.map((item) => (
                  <li key={item.id}>
                    <p className="mc-activity-message">{item.message}</p>
                    <p className="mc-caption">{new Date(item.timestamp).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="acc-expand-btn"
                onClick={() => setShowAllActivity((open) => !open)}
              >
                {showAllActivity ? 'Show less' : 'Show more activity'}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
