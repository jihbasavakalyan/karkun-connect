import type { AdminMissionControlModel } from '@/lib/missionControl/buildAdminMissionControl'
import type { RuknMissionControlModel } from '@/lib/missionControl/buildRuknMissionControl'
import { Link } from 'react-router-dom'
import { adminRuknDetailPath } from '@/constants/routes'

type AdminMissionControlPanelsProps = {
  model: AdminMissionControlModel
}

export function AdminMissionControlPanels({ model }: AdminMissionControlPanelsProps) {
  const maxFunnel = Math.max(...model.journeyFunnel.map((stage) => stage.count), 1)

  return (
    <div className="mc-panels">
      <section className="mc-panel">
        <h2 className="mc-panel-title">Connection Progress</h2>
        <p className="mc-panel-metric">
          {model.connectionProgress.connected} / {model.connectionProgress.total}
        </p>
        <div className="mc-progress-track">
          <div className="mc-progress-fill" style={{ width: `${model.connectionProgress.pct}%` }} />
        </div>
        <p className="mc-caption mt-2">{model.connectionProgress.remaining} remaining</p>
      </section>

      <section className="mc-panel">
        <h2 className="mc-panel-title">Campaign Health</h2>
        <ul className="mc-stat-list">
          <li>Overall · {model.campaignHealth.overall}%</li>
          <li>Attendance · {model.campaignHealth.attendanceCompliance}%</li>
          <li>Bait-ul-Maal · {model.campaignHealth.baitulMaalCompliance}%</li>
          <li>JIH pending · {model.campaignHealth.jihPending}</li>
          <li>Critical follow-ups · {model.campaignHealth.criticalFollowUps}</li>
        </ul>
      </section>

      <section className="mc-panel mc-panel-wide">
        <h2 className="mc-panel-title">Journey Funnel</h2>
        <ul className="mc-funnel">
          {model.journeyFunnel.map((stage) => (
            <li key={stage.stageId}>
              <div className="mc-funnel-row">
                <span>{stage.label}</span>
                <span>{stage.count}</span>
              </div>
              <div className="mc-progress-track">
                <div
                  className="mc-progress-fill"
                  style={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mc-panel">
        <h2 className="mc-panel-title">Rukn Leaderboard</h2>
        {model.ruknLeaderboard.length === 0 ? (
          <p className="mc-caption">No Rukn performance yet.</p>
        ) : (
          <ol className="mc-leaderboard">
            {model.ruknLeaderboard.map((row, index) => (
              <li key={row.ruknId}>
                <span className="mc-rank">{index + 1}</span>
                <Link to={adminRuknDetailPath(row.ruknId)} className="mc-leader-name">
                  {row.ruknName}
                </Link>
                <span className="mc-leader-meta">
                  {row.completionPct}% · {row.visits} visits · {row.assignedKarkuns} connected
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mc-panel">
        <h2 className="mc-panel-title">Today&apos;s Priorities</h2>
        {model.todaysPriorities.length === 0 ? (
          <p className="mc-caption">No critical priorities right now.</p>
        ) : (
          <ul className="mc-priority-list">
            {model.todaysPriorities.map((item) => (
              <li key={item.id}>
                <Link to={item.route} className="mc-priority-link">
                  <span className="mc-priority-title">{item.title}</span>
                  <span className="mc-caption">{item.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mc-panel">
        <h2 className="mc-panel-title">Recent Activity</h2>
        {model.recentActivity.length === 0 ? (
          <p className="mc-caption">No recent activity.</p>
        ) : (
          <ul className="mc-activity-list">
            {model.recentActivity.map((item) => (
              <li key={item.id}>
                <p className="mc-activity-message">{item.message}</p>
                <p className="mc-caption">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
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
  const maxFunnel = Math.max(...model.journeyFunnel.map((stage) => stage.count), 1)

  return (
    <div className="mc-panels">
      <section className="mc-panel mc-panel-wide">
        <h2 className="mc-panel-title">Journey Funnel</h2>
        <ul className="mc-funnel">
          {model.journeyFunnel.map((stage) => (
            <li key={stage.stageId}>
              <div className="mc-funnel-row">
                <span>{stage.label}</span>
                <span>{stage.count}</span>
              </div>
              <div className="mc-progress-track">
                <div
                  className="mc-progress-fill"
                  style={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mc-panel">
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
        <ul className="mc-stat-list mc-stat-strip">
          <li>Present · {model.attendanceStrip.present}</li>
          <li>Absent · {model.attendanceStrip.absent}</li>
          <li>Excused · {model.attendanceStrip.excused}</li>
          <li>Not recorded · {model.attendanceStrip.notRecorded}</li>
        </ul>
      </section>

      <section className="mc-panel">
        <h2 className="mc-panel-title">Monthly Target</h2>
        <ul className="mc-stat-list">
          <li>Connected · {model.monthlyTarget.connected}</li>
          <li>Bait-ul-Maal paid · {model.monthlyTarget.baitulMaalPaid}</li>
          <li>Bait-ul-Maal pending · {model.monthlyTarget.baitulMaalPending}</li>
          <li>Development due · {model.monthlyTarget.developmentDue}</li>
        </ul>
      </section>

      <section className="mc-panel">
        <h2 className="mc-panel-title">Recent Activity</h2>
        {model.recentActivity.length === 0 ? (
          <p className="mc-caption">No recent activity.</p>
        ) : (
          <ul className="mc-activity-list">
            {model.recentActivity.map((item) => (
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
