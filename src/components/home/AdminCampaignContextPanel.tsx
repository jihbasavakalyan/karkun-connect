import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath } from '@/constants/routes'
import { getCommunicationDashboardMetrics } from '@/stores/communicationStore'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import { getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { getBaitulMaalDashboardMetrics } from '@/services/baitulMaalService'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getCampaignProgressOverview } from '@/lib/commandCenterPresentation'
import { getRecentActivity } from '@/stores/activityLogStore'
import { humanizeConnectedKarkuns } from '@/lib/homePresentation'
import { JOURNEY_STAGE_LABELS, JOURNEY_STAGE_ORDER } from '@/types/guidance'
import type { JourneyStageId } from '@/types/guidance'

function buildJourneyDistribution(): { stageId: JourneyStageId; count: number }[] {
  const activeAssignments = getAllAssignments().filter((record) => record.status === 'Active')
  const ruknIds = [...new Set(activeAssignments.map((record) => record.ruknId))]
  const stageCounts = new Map<JourneyStageId, number>()

  for (const ruknId of ruknIds) {
    for (const guidance of getGuidanceForRuknKarkuns(ruknId)) {
      stageCounts.set(
        guidance.currentStage,
        (stageCounts.get(guidance.currentStage) ?? 0) + 1,
      )
    }
  }

  return JOURNEY_STAGE_ORDER.map((stageId) => ({
    stageId,
    count: stageCounts.get(stageId) ?? 0,
  })).filter((entry) => entry.count > 0)
}

export function AdminCampaignContextPanel() {
  const overview = getCampaignProgressOverview()
  const assignmentMetrics = getAssignmentDashboardMetrics()
  const jih = getJihWebPortalDashboardMetrics()
  const ijtema = getIjtemaAttendanceDashboardMetrics()
  const baitulMaal = getBaitulMaalDashboardMetrics()
  const communication = getCommunicationDashboardMetrics()
  const journeyDistribution = buildJourneyDistribution()
  const maxJourneyCount = Math.max(...journeyDistribution.map((entry) => entry.count), 1)
  const activities = getRecentActivity(5)

  const complianceItems = [
    { id: 'jih', label: 'JIH Portal', pending: jih.notRegistered + jih.pendingReports, route: adminCompliancePath('jih-portal') },
    { id: 'ijtema', label: 'Ijtema', pending: ijtema.absent, route: adminCompliancePath('ijtema') },
    { id: 'baitul-maal', label: 'Baitul Maal', pending: baitulMaal.pending, route: adminCompliancePath('baitul-maal') },
  ].filter((item) => item.pending > 0)

  return (
    <aside className="cd-panel cd-panel-secondary cd-panel-context" aria-label="Campaign information">
      <h2 className="cd-section-heading cd-section-heading-muted">Campaign information</h2>

      <div className="cd-context-block">
        <h3 className="cd-context-title">Campaign progress</h3>
        <div className="cd-progress-bar" role="progressbar" aria-valuenow={overview.overall} aria-valuemin={0} aria-valuemax={100}>
          <div className="cd-progress-fill" style={{ width: `${overview.overall}%` }} />
        </div>
        <p className="cd-caption">Overall momentum across execution, coverage, and follow-up.</p>
      </div>

      <div className="cd-context-block">
        <h3 className="cd-context-title">Connected Karkuns</h3>
        <p className="cd-supporting">{humanizeConnectedKarkuns(assignmentMetrics.activeAssignments)}</p>
        <Link to={ROUTES.ADMIN_ASSIGNMENTS} className="cd-text-link">View connections</Link>
      </div>

      <div className="cd-context-block">
        <h3 className="cd-context-title">Journey distribution</h3>
        {journeyDistribution.length === 0 ? (
          <p className="cd-caption">No journey data yet.</p>
        ) : (
          <ul className="cd-journey-bars">
            {journeyDistribution.map((entry) => (
              <li key={entry.stageId}>
                <div className="cd-journey-row">
                  <span>{JOURNEY_STAGE_LABELS[entry.stageId]}</span>
                  <span>{entry.count}</span>
                </div>
                <div className="cd-journey-track">
                  <div
                    className="cd-journey-fill"
                    style={{ width: `${(entry.count / maxJourneyCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-context-block">
        <h3 className="cd-context-title">Compliance</h3>
        {complianceItems.length === 0 ? (
          <p className="cd-caption">Compliance is on track.</p>
        ) : (
          <ul className="cd-caption-list">
            {complianceItems.map((item) => (
              <li key={item.id}>
                <Link to={item.route} className="cd-text-link">
                  {item.label} — {item.pending} open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-context-block">
        <h3 className="cd-context-title">Monthly Bait-ul-Maal</h3>
        <ul className="cd-caption-list">
          <li>Compliance — {baitulMaal.compliancePercentage}%</li>
          <li>
            <Link to={adminCompliancePath('baitul-maal', 'Pending')} className="cd-text-link">
              Pending — {baitulMaal.pending}
            </Link>
          </li>
          <li>
            <Link to={adminCompliancePath('baitul-maal', 'Exempt')} className="cd-text-link">
              Exempt — {baitulMaal.exempt}
            </Link>
          </li>
          <li className="text-secondary">{baitulMaal.campaignTrendLabel}</li>
        </ul>
      </div>

      <div className="cd-context-block">
        <h3 className="cd-context-title">Communication</h3>
        <ul className="cd-caption-list">
          <li>
            {communication.messagesToday === 0
              ? 'No messages sent today yet.'
              : `${communication.messagesToday} message${communication.messagesToday === 1 ? '' : 's'} sent today.`}
          </li>
          <li>
            {communication.scheduled === 0
              ? 'Nothing scheduled for later.'
              : `${communication.scheduled} scheduled.`}
          </li>
        </ul>
        <Link to={ROUTES.ADMIN_COMMUNICATION} className="cd-text-link">Open communication</Link>
      </div>

      <div className="cd-context-block">
        <h3 className="cd-context-title">Recent activity</h3>
        {activities.length === 0 ? (
          <p className="cd-caption">No campaign activity recorded yet.</p>
        ) : (
          <ol className="cd-activity-feed">
            {activities.map((entry) => (
              <li key={entry.id}>
                <p className="cd-activity-message">{entry.message}</p>
                <time className="cd-activity-time">
                  {new Date(entry.timestamp).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  )
}
