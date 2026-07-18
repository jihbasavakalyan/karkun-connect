/**
 * KC-027B — Probe dashboard builders for the throw caught by StartupErrorBoundary.
 */
import { appendSubmittedForm, getSubmittedMeetingForms } from '../src/stores/annexure1Store'
import { getAllAssignments } from '../src/stores/assignmentStore'
import { getGuidanceForRuknKarkuns } from '../src/lib/guidance/guidanceEngine'
import { buildJourneyTimeline } from '../src/lib/guidance/timelineEngine'
import { getKarkunById } from '../src/constants/mockKarkunRegistry'
import {
  getAnnexure1ExecutionMetrics,
  getTodaysMeetingAssignments,
} from '../src/services/annexure1Service'
import { getExecutionDashboardData } from '../src/lib/executionStatus'
import {
  getAdminCommandCenterSnapshot,
  getRuknCommandCenterSnapshot,
} from '../src/services/campaignAutomationEngine'
import { buildAdminMissionControl } from '../src/lib/missionControl/buildAdminMissionControl'
import { buildRuknMissionControl } from '../src/lib/missionControl/buildRuknMissionControl'
import {
  buildAdminCampaignHealthKpis,
  buildAdminInterventionQueue,
  buildAdminRuknPerformance,
  buildAdminCampaignTrends,
  buildAdminRecentActivityView,
} from '../src/lib/missionControl/adminMissionControlPresentation'
import { buildAdminRelationshipInsights } from '../src/lib/relationshipIntelligencePresentation'

function tryCall(label: string, fn: () => unknown): unknown {
  try {
    const value = fn()
    console.log('OK', label)
    return value
  } catch (error) {
    const err = error as Error
    console.log('THROW', label)
    console.log('MESSAGE', err.message)
    console.log('STACK', (err.stack ?? '').split('\n').slice(0, 12).join('\n'))
    return null
  }
}

appendSubmittedForm({
  id: 'corrupt-1',
  assignmentId: 'A1',
  karkunId: 'K1',
  ruknId: 'R1',
  assignmentNumber: 'ASN-1',
  area: 'Test',
  assignedRukn: 'R1',
  campaignName: 'Test',
  submittedAt: undefined as unknown as string,
  status: 'submitted',
  submissionDate: null as unknown as string,
  visitDate: undefined as unknown as string,
  workerName: 'Test',
  visitConducted: 'yes',
} as never)

console.log('submittedForms', getSubmittedMeetingForms().length)

tryCall('timeline-localeCompare-repro', () => {
  const events = [
    { id: '1', occurredAt: undefined as unknown as string },
    { id: '2', occurredAt: '2026-07-01' },
  ]
  return events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
})

const active = getAllAssignments().find((record) => record.status === 'Active')
console.log('activeAssignment', active?.assignmentId, active?.ruknId, active?.karkunId)
if (active) {
  const karkun = getKarkunById(active.karkunId)
  if (karkun) {
    tryCall('buildJourneyTimeline', () => buildJourneyTimeline(karkun))
  }
  tryCall('getGuidanceForRuknKarkuns', () => getGuidanceForRuknKarkuns(active.ruknId))
}

tryCall('getAnnexure1ExecutionMetrics', () => getAnnexure1ExecutionMetrics())
tryCall('getTodaysMeetingAssignments', () => getTodaysMeetingAssignments())
tryCall('getExecutionDashboardData', () => getExecutionDashboardData())
tryCall('buildAdminRelationshipInsights', () => buildAdminRelationshipInsights())

const snap = tryCall('getAdminCommandCenterSnapshot', () => getAdminCommandCenterSnapshot()) as
  | ReturnType<typeof getAdminCommandCenterSnapshot>
  | null

if (snap) {
  const model = tryCall('buildAdminMissionControl', () => buildAdminMissionControl(snap)) as
    | ReturnType<typeof buildAdminMissionControl>
    | null
  if (model) {
    tryCall('buildAdminCampaignHealthKpis', () => buildAdminCampaignHealthKpis(model))
    tryCall('buildAdminInterventionQueue', () => buildAdminInterventionQueue(snap))
    tryCall('buildAdminRuknPerformance', () => buildAdminRuknPerformance(12))
    tryCall('buildAdminCampaignTrends', () => buildAdminCampaignTrends())
    tryCall('buildAdminRecentActivityView', () => buildAdminRecentActivityView(5))
  }
}

const ruknSnap = tryCall('getRuknCommandCenterSnapshot', () =>
  getRuknCommandCenterSnapshot(active?.ruknId ?? 'R001'),
) as ReturnType<typeof getRuknCommandCenterSnapshot> | null
if (ruknSnap) {
  tryCall('buildRuknMissionControl', () =>
    buildRuknMissionControl(active?.ruknId ?? 'R001', ruknSnap),
  )
}
