import { Link } from 'react-router-dom'
import { ROUTES, adminCompliancePath } from '@/constants/routes'
import { CommandCenterCampaignProgress } from '@/components/command-center/CommandCenterCampaignProgress'
import { CommandCenterRecentActivity } from '@/components/command-center/CommandCenterRecentActivity'
import { CommandCenterHero } from '@/components/command-center/CommandCenterHero'
import { getCommunicationDashboardMetrics } from '@/stores/communicationStore'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import { getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { getBaitulMaalDashboardMetrics } from '@/services/baitulMaalService'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getAllAssignments } from '@/stores/assignmentStore'
import { humanizeConnectedKarkuns } from '@/lib/homePresentation'
import { JOURNEY_STAGE_LABELS, JOURNEY_STAGE_ORDER } from '@/types/guidance'
import type { JourneyStageId } from '@/types/guidance'
import type { CampaignHeroData } from '@/types/campaignAutomation.types'
import { CampaignPulseCard } from './CampaignPulseCard'
import { HomeSection } from './HomeSection'

type AdminCampaignInfoSectionProps = {
  hero: CampaignHeroData | null
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

export function AdminCampaignInfoSection({ hero }: AdminCampaignInfoSectionProps) {
  const assignmentMetrics = getAssignmentDashboardMetrics()
  const jih = getJihWebPortalDashboardMetrics()
  const ijtema = getIjtemaAttendanceDashboardMetrics()
  const baitulMaal = getBaitulMaalDashboardMetrics()
  const communication = getCommunicationDashboardMetrics()
  const journeyDistribution = buildJourneyDistribution()
  const maxJourneyCount = Math.max(...journeyDistribution.map((entry) => entry.count), 1)

  const complianceItems = [
    {
      id: 'jih',
      label: 'JIH Portal',
      pending: jih.notRegistered + jih.pendingReports,
      route: adminCompliancePath('jih-portal'),
    },
    {
      id: 'ijtema',
      label: 'Ijtema',
      pending: ijtema.absent,
      route: adminCompliancePath('ijtema'),
    },
    {
      id: 'baitul-maal',
      label: 'Baitul Maal',
      pending: baitulMaal.pending,
      route: adminCompliancePath('baitul-maal'),
    },
  ].filter((item) => item.pending > 0)

  return (
    <HomeSection
      title="Campaign Information"
      subtitle="Awareness without distraction — know how the campaign is moving."
      variant="secondary"
    >
      <div className="home-stack-tight">
        {hero && <CommandCenterHero hero={hero} />}

        <div className="home-grid-2">
          <CommandCenterCampaignProgress />
          <CampaignPulseCard scope="admin" />
        </div>

        <div className="home-grid-3">
          <article className="home-card home-card-muted">
            <p className="home-eyebrow">Connected Karkuns</p>
            <p className="mt-2 text-sm text-text-heading">
              {humanizeConnectedKarkuns(assignmentMetrics.activeAssignments)}
            </p>
            <Link to={ROUTES.ADMIN_ASSIGNMENTS} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              View connections →
            </Link>
          </article>

          <article className="home-card home-card-muted">
            <p className="home-eyebrow">Journey Distribution</p>
            {journeyDistribution.length === 0 ? (
              <p className="mt-2 text-sm text-secondary">No journey data yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {journeyDistribution.map((entry) => (
                  <li key={entry.stageId}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-text-heading">
                        {JOURNEY_STAGE_LABELS[entry.stageId]}
                      </span>
                      <span className="shrink-0 font-semibold text-primary">{entry.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(entry.count / maxJourneyCount) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="home-card home-card-muted">
            <p className="home-eyebrow">Compliance Overview</p>
            {complianceItems.length === 0 ? (
              <p className="mt-2 text-sm text-secondary">Compliance is on track.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {complianceItems.map((item) => (
                  <li key={item.id}>
                    <Link to={item.route} className="home-action-row text-sm">
                      <span className="text-text-heading">{item.label}</span>
                      <span className="font-semibold text-primary">
                        {item.pending} open
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <div className="home-grid-2">
          <CommandCenterRecentActivity />

          <article className="home-card">
            <p className="home-eyebrow">Communication Summary</p>
            <ul className="mt-3 space-y-2 text-sm text-text-heading">
              <li>
                {communication.messagesToday === 0
                  ? 'No messages sent today yet.'
                  : `${communication.messagesToday} message${communication.messagesToday === 1 ? '' : 's'} sent today.`}
              </li>
              <li>
                {communication.scheduled === 0
                  ? 'Nothing scheduled for later.'
                  : `${communication.scheduled} message${communication.scheduled === 1 ? '' : 's'} scheduled.`}
              </li>
              <li>
                {communication.failed === 0
                  ? 'All recent messages delivered.'
                  : `${communication.failed} message${communication.failed === 1 ? '' : 's'} need a retry.`}
              </li>
            </ul>
            <Link to={ROUTES.ADMIN_COMMUNICATION} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Open communication →
            </Link>
          </article>
        </div>
      </div>
    </HomeSection>
  )
}
