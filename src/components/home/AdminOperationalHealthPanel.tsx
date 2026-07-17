/**
 * Administrator Home — campaign health strip (KC-006 Sprint 6.6).
 */

import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath, adminExecutionPath } from '@/constants/routes'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import { getBaitulMaalDashboardMetrics } from '@/services/baitulMaalService'
import { getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getTeamPerformanceRows } from '@/lib/commandCenterPresentation'
import { JOURNEY_STAGE_LABELS, JOURNEY_STAGE_ORDER } from '@/types/guidance'
import type { JourneyStageId } from '@/types/guidance'
import type { AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'

type AdminOperationalHealthPanelProps = {
  snapshot: AdminCommandCenterSnapshot
}

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

export function AdminOperationalHealthPanel({ snapshot }: AdminOperationalHealthPanelProps) {
  const ijtema = getIjtemaAttendanceDashboardMetrics()
  const baitulMaal = getBaitulMaalDashboardMetrics()
  const assignments = getAssignmentDashboardMetrics()
  const journeyDistribution = buildJourneyDistribution()
  const teamRows = getTeamPerformanceRows().slice(0, 5)
  const criticalFollowUps =
    snapshot.followUpQueue.find((group) => group.section === 'overdue')?.items.length ?? 0

  const attendanceCompliance =
    ijtema.present + ijtema.absent + ijtema.excused + ijtema.notRecorded === 0
      ? 100
      : Math.round(
          (ijtema.present / Math.max(ijtema.present + ijtema.absent + ijtema.notRecorded, 1)) *
            100,
        )

  return (
    <section className="cd-panel cd-panel-secondary" aria-label="Campaign health">
      <h2 className="cd-section-heading cd-section-heading-sm">Campaign health</h2>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <li className="rounded-lg border border-border bg-surface-muted px-3 py-2">
          <span className="block text-xs text-secondary">Attendance Compliance</span>
          <Link to={adminCompliancePath('ijtema')} className="mt-0.5 block text-xl font-semibold text-primary">
            {attendanceCompliance}%
          </Link>
          <span className="text-xs text-secondary">
            {ijtema.notRecorded} not recorded · {ijtema.absent} absent
          </span>
        </li>
        <li className="rounded-lg border border-border bg-surface-muted px-3 py-2">
          <span className="block text-xs text-secondary">Bait-ul-Maal Compliance</span>
          <Link
            to={adminCompliancePath('baitul-maal')}
            className="mt-0.5 block text-xl font-semibold text-primary"
          >
            {baitulMaal.compliancePercentage}%
          </Link>
          <span className="text-xs text-secondary">{baitulMaal.pending} pending</span>
        </li>
        <li className="rounded-lg border border-border bg-surface-muted px-3 py-2">
          <span className="block text-xs text-secondary">Critical Follow-ups</span>
          <Link to={adminExecutionPath('follow-ups')} className="mt-0.5 block text-xl font-semibold text-primary">
            {criticalFollowUps}
          </Link>
        </li>
        <li className="rounded-lg border border-border bg-surface-muted px-3 py-2">
          <span className="block text-xs text-secondary">Active Connections</span>
          <Link to={ROUTES.ADMIN_ASSIGNMENTS} className="mt-0.5 block text-xl font-semibold text-primary">
            {assignments.activeAssignments}
          </Link>
        </li>
      </ul>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-text-heading">Journey Distribution</h3>
          {journeyDistribution.length === 0 ? (
            <p className="cd-caption mt-1">No journey data yet.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {journeyDistribution.map((entry) => (
                <li key={entry.stageId} className="flex justify-between text-sm">
                  <span className="text-secondary">{JOURNEY_STAGE_LABELS[entry.stageId]}</span>
                  <span className="font-semibold text-text-heading">{entry.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-heading">Rukn Performance</h3>
          {teamRows.length === 0 ? (
            <p className="cd-caption mt-1">No Rukn performance rows yet.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {teamRows.map((row) => (
                <li key={row.ruknId} className="flex justify-between text-sm">
                  <span className="text-secondary">{row.ruknName}</span>
                  <span className="font-semibold text-text-heading">
                    {row.visits}/{row.assignedKarkuns}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
