import { Link } from 'react-router-dom'
import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import type { RuknMissionControlModel } from '@/lib/missionControl/buildRuknMissionControl'
import { adminRuknDetailPath, ROUTES, adminCompliancePath, adminExecutionPath } from '@/constants/routes'
import { McProgressRing, leaderboardStatus } from './McProgressRing'
import type { JourneyStageId } from '@/types/guidance'

type AdminMissionControlPanelsProps = {
  model: AdminMissionControlModel
}

const FUNNEL_FOCUS: JourneyStageId[] = [
  'connected',
  'jih-registration',
  'orientation',
  'participation',
  'development',
]

const FUNNEL_TONE: Record<string, string> = {
  connected: 'mc-funnel-green',
  'jih-registration': 'mc-funnel-blue',
  orientation: 'mc-funnel-blue',
  participation: 'mc-funnel-amber',
  'regular-contact': 'mc-funnel-amber',
  development: 'mc-funnel-purple',
  'first-meeting': 'mc-funnel-blue',
}

function healthTone(value: number): 'green' | 'amber' | 'red' {
  if (value >= 70) return 'green'
  if (value >= 40) return 'amber'
  return 'red'
}

export function AdminMissionControlPanels({ model }: AdminMissionControlPanelsProps) {
  const funnelStages = model.journeyFunnel.filter((stage) => FUNNEL_FOCUS.includes(stage.stageId))
  const maxFunnel = Math.max(...funnelStages.map((stage) => stage.count), 1)

  const visitPressure = Math.max(
    0,
    100 - Math.min(100, model.campaignHealth.criticalFollowUps * 12),
  )
  const developmentPressure = Math.max(
    0,
    100 - Math.min(100, model.campaignHealth.jihPending * 8),
  )

  const missionGroups = [
    {
      id: 'visits',
      label: 'Pending Visits',
      count: model.todaysPriorities.filter((item) => /visit|meeting/i.test(item.title + item.detail)).length,
      route: adminExecutionPath(),
    },
    {
      id: 'registration',
      label: 'Registrations',
      count: model.campaignHealth.jihPending,
      route: adminCompliancePath('jih-portal'),
    },
    {
      id: 'ijtema',
      label: 'Ijtema Follow-ups',
      count: model.todaysPriorities.filter((item) => /ijtema|attendance/i.test(item.title + item.detail)).length,
      route: adminCompliancePath('ijtema'),
    },
    {
      id: 'baitul',
      label: 'Bait-ul-Maal Follow-ups',
      count: Math.max(0, Math.round((100 - model.campaignHealth.baitulMaalCompliance) / 10)),
      route: adminCompliancePath('baitul-maal'),
    },
    {
      id: 'development',
      label: 'Development Follow-ups',
      count: model.todaysPriorities.filter((item) => /develop|tarbiyah|follow/i.test(item.title + item.detail)).length,
      route: ROUTES.ADMIN_FOLLOW_UP,
    },
  ].sort((a, b) => b.count - a.count)

  return (
    <div className="mc-panels">
      <section className="mc-panel mc-panel-primary">
        <h2 className="mc-panel-title">Connection Progress</h2>
        <div className="mc-connection-progress">
          <McProgressRing
            value={model.connectionProgress.pct}
            size={120}
            stroke={11}
            tone="green"
            label={`${model.connectionProgress.pct}%`}
          />
          <div>
            <p className="mc-panel-metric">
              {model.connectionProgress.connected}
              <span className="mc-panel-metric-soft"> / {model.connectionProgress.total}</span>
            </p>
            <p className="mc-caption">Connected of campaign pool</p>
            <div className="mc-progress-track mc-progress-track-lg mt-3">
              <div className="mc-progress-fill" style={{ width: `${model.connectionProgress.pct}%` }} />
            </div>
            <p className="mc-caption mt-2">{model.connectionProgress.remaining} remaining</p>
          </div>
        </div>
      </section>

      <section className="mc-panel mc-panel-primary">
        <h2 className="mc-panel-title">Campaign Health</h2>
        <ul className="mc-health-grid">
          <li>
            <McProgressRing value={model.connectionProgress.pct} size={72} tone={healthTone(model.connectionProgress.pct)} sublabel="Connections" />
          </li>
          <li>
            <McProgressRing value={visitPressure} size={72} tone={healthTone(visitPressure)} sublabel="Visits" />
          </li>
          <li>
            <McProgressRing value={model.campaignHealth.attendanceCompliance} size={72} tone={healthTone(model.campaignHealth.attendanceCompliance)} sublabel="Attendance" />
          </li>
          <li>
            <McProgressRing value={model.campaignHealth.baitulMaalCompliance} size={72} tone={healthTone(model.campaignHealth.baitulMaalCompliance)} sublabel="Bait-ul-Maal" />
          </li>
          <li>
            <McProgressRing value={developmentPressure} size={72} tone={healthTone(developmentPressure)} sublabel="Development" />
          </li>
        </ul>
      </section>

      <section className="mc-panel mc-panel-wide mc-panel-funnel">
        <h2 className="mc-panel-title">Journey Funnel</h2>
        <ol className="mc-funnel-flow">
          {funnelStages.map((stage, index) => (
            <li key={stage.stageId} className={`mc-funnel-stage ${FUNNEL_TONE[stage.stageId] ?? ''}`}>
              <div className="mc-funnel-stage-head">
                <span className="mc-funnel-stage-label">{stage.label}</span>
                <span className="mc-funnel-stage-count">{stage.count}</span>
              </div>
              <div className="mc-progress-track mc-progress-track-lg">
                <div
                  className="mc-progress-fill"
                  style={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                />
              </div>
              {index < funnelStages.length - 1 ? (
                <span className="mc-funnel-arrow" aria-hidden="true">
                  ↓
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="mc-panel">
        <h2 className="mc-panel-title">Rukn Leaderboard</h2>
        {model.ruknLeaderboard.length === 0 ? (
          <p className="mc-caption">No Rukn performance yet.</p>
        ) : (
          <ol className="mc-leaderboard">
            {model.ruknLeaderboard.map((row, index) => {
              const status = leaderboardStatus(row.completionPct)
              return (
                <li key={row.ruknId} className={`mc-leader-row mc-leader-${status.tone}`}>
                  <span className="mc-rank">{index + 1}</span>
                  <div className="mc-leader-main">
                    <Link to={adminRuknDetailPath(row.ruknId)} className="mc-leader-name">
                      {row.ruknName}
                    </Link>
                    <span className="mc-leader-meta">
                      {row.completionPct}% · {row.visits} visits · {row.assignedKarkuns} connected
                    </span>
                  </div>
                  <span className="mc-leader-status" title={status.label}>
                    {status.emoji} {status.label}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className="mc-panel">
        <h2 className="mc-panel-title">Today&apos;s Mission</h2>
        <ul className="mc-mission-groups">
          {missionGroups.map((group) => (
            <li key={group.id}>
              <Link to={group.route} className="mc-mission-group">
                <span className="mc-mission-group-label">{group.label}</span>
                <span className={`mc-mission-group-count ${group.count > 0 ? 'mc-count-attention' : 'mc-count-ok'}`}>
                  {group.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {model.todaysPriorities.length > 0 ? (
          <ul className="mc-priority-list mc-priority-list-compact">
            {model.todaysPriorities.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link to={item.route} className="mc-priority-link">
                  <span className="mc-priority-title">{item.title}</span>
                  <span className="mc-caption">{item.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mc-panel mc-panel-quiet">
        <h2 className="mc-panel-title">Recent Activity</h2>
        {model.recentActivity.length === 0 ? (
          <p className="mc-caption">No recent activity.</p>
        ) : (
          <ul className="mc-activity-list">
            {model.recentActivity.slice(0, 5).map((item) => (
              <li key={item.id}>
                <p className="mc-activity-message">{item.message}</p>
                <p className="mc-caption">{new Date(item.timestamp).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

type RuknMissionControlPanelsProps = {
  model: RuknMissionControlModel
}

export function RuknMissionControlPanels({ model }: RuknMissionControlPanelsProps) {
  const funnelStages = model.journeyFunnel.filter((stage) => FUNNEL_FOCUS.includes(stage.stageId))
  const maxFunnel = Math.max(...funnelStages.map((stage) => stage.count), 1)
  const attendanceTotal =
    model.attendanceStrip.present +
    model.attendanceStrip.absent +
    model.attendanceStrip.excused +
    model.attendanceStrip.notRecorded
  const attendancePct =
    attendanceTotal === 0
      ? 0
      : Math.round((model.attendanceStrip.present / Math.max(attendanceTotal, 1)) * 100)

  return (
    <div className="mc-panels">
      <section className="mc-panel mc-panel-wide mc-panel-funnel">
        <h2 className="mc-panel-title">Journey Funnel</h2>
        <ol className="mc-funnel-flow">
          {funnelStages.map((stage, index) => (
            <li key={stage.stageId} className={`mc-funnel-stage ${FUNNEL_TONE[stage.stageId] ?? ''}`}>
              <div className="mc-funnel-stage-head">
                <span className="mc-funnel-stage-label">{stage.label}</span>
                <span className="mc-funnel-stage-count">{stage.count}</span>
              </div>
              <div className="mc-progress-track mc-progress-track-lg">
                <div
                  className="mc-progress-fill"
                  style={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                />
              </div>
              {index < funnelStages.length - 1 ? (
                <span className="mc-funnel-arrow" aria-hidden="true">
                  ↓
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="mc-panel mc-panel-primary">
        <h2 className="mc-panel-title">Today&apos;s Visits</h2>
        {model.todaysVisits.length === 0 ? (
          <p className="mc-caption">No visits scheduled in today’s timeline.</p>
        ) : (
          <ul className="mc-priority-list">
            {model.todaysVisits.map((item) => (
              <li key={item.id}>
                <Link to={item.route} className="mc-priority-link">
                  <span className="mc-priority-title">{item.title}</span>
                  {item.subtitle ? <span className="mc-caption">{item.subtitle}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mc-panel">
        <h2 className="mc-panel-title">Attendance Strip</h2>
        <div className="mc-attendance-visual">
          <McProgressRing value={attendancePct} size={80} tone="blue" sublabel="Present" />
          <ul className="mc-stat-list mc-stat-strip">
            <li>Present · {model.attendanceStrip.present}</li>
            <li>Absent · {model.attendanceStrip.absent}</li>
            <li>Excused · {model.attendanceStrip.excused}</li>
            <li>Not recorded · {model.attendanceStrip.notRecorded}</li>
          </ul>
        </div>
      </section>

      <section className="mc-panel">
        <h2 className="mc-panel-title">Monthly Target</h2>
        <ul className="mc-health-grid mc-health-grid-compact">
          <li>
            <McProgressRing
              value={Math.min(100, model.monthlyTarget.connected * 10)}
              size={68}
              tone="green"
              label={String(model.monthlyTarget.connected)}
              sublabel="Connected"
            />
          </li>
          <li>
            <McProgressRing
              value={
                model.monthlyTarget.baitulMaalPaid + model.monthlyTarget.baitulMaalPending === 0
                  ? 100
                  : Math.round(
                      (model.monthlyTarget.baitulMaalPaid /
                        Math.max(
                          model.monthlyTarget.baitulMaalPaid + model.monthlyTarget.baitulMaalPending,
                          1,
                        )) *
                        100,
                    )
              }
              size={68}
              tone="amber"
              sublabel="Bait-ul-Maal"
            />
          </li>
          <li>
            <McProgressRing
              value={Math.max(0, 100 - model.monthlyTarget.developmentDue * 15)}
              size={68}
              tone="purple"
              label={String(model.monthlyTarget.developmentDue)}
              sublabel="Dev due"
            />
          </li>
        </ul>
      </section>

      <section className="mc-panel mc-panel-quiet">
        <h2 className="mc-panel-title">Recent Activity</h2>
        {model.recentActivity.length === 0 ? (
          <p className="mc-caption">No recent activity.</p>
        ) : (
          <ul className="mc-activity-list">
            {model.recentActivity.slice(0, 5).map((item) => (
              <li key={item.id}>
                <p className="mc-activity-message">{item.message}</p>
                <p className="mc-caption">{new Date(item.timestamp).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
