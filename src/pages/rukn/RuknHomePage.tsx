import { Link } from 'react-router-dom'
import { DEMO_RUKN_PORTAL_ID } from '@/constants/demoRukn'
import { ROUTES } from '@/constants/routes'
import { RUKN_COMPLETED_TODAY } from '@/constants/mockMissions'
import {
  generateRuknMissionQueue,
  getCurrentMission,
  getMissionProgress,
  getNextMission,
} from '@/lib/mockMissionEngine'
import { getFirstPendingKarkunIdForRukn } from '@/lib/executionStatus'
import { MissionHeroCard } from '@/components/dashboard/MissionHeroCard'
import { MissionProgress } from '@/components/dashboard/MissionProgress'
import {
  CompletedWorkPanel,
  ContinueMissionButton,
  CurrentVisitPanel,
  NextMissionPanel,
} from '@/components/dashboard/RuknMissionPanels'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

export function RuknHomePage() {
  const { user } = useAuth()
  const ruknId = user?.ruknId ?? DEMO_RUKN_PORTAL_ID
  const { getAssignedKarkunanForRukn } = useAssignmentEngine()
  const assignedKarkunan = getAssignedKarkunanForRukn(ruknId)
  const pendingKarkunId = getFirstPendingKarkunIdForRukn(ruknId)

  const missions = generateRuknMissionQueue()
  const currentMission = getCurrentMission(missions)
  const nextMission = getNextMission(missions)
  const progress = getMissionProgress(missions)
  const currentVisit = missions.find((mission) => mission.type === 'visit' && mission.status === 'in_progress')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Home</h1>
        <p className="mt-2 text-secondary">Your field mission queue for today.</p>
      </div>

      {assignedKarkunan.length > 0 && (
        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Assigned Karkuns</h2>
              <p className="mt-1 text-sm text-secondary">
                {assignedKarkunan.length} assigned · start with Annexure-1
              </p>
            </div>
            <Link to={ROUTES.RUKN_MY_KARKUN}>
              <PrimaryButton type="button" className="px-4 py-2 text-sm">
                View All
              </PrimaryButton>
            </Link>
          </div>
          {pendingKarkunId && (
            <Link to={`${ROUTES.RUKN}/visit/${pendingKarkunId}`} className="mt-4 block">
              <PrimaryButton type="button" fullWidth>
                Open Next Annexure-1
              </PrimaryButton>
            </Link>
          )}
        </section>
      )}

      <section className="space-y-4">
        <MissionHeroCard
          missionTitle={currentMission?.title ?? 'No missions today'}
          estimatedTime={currentMission?.estimatedTime ?? '—'}
        />
        <MissionProgress progress={progress} />
        <ContinueMissionButton ruknId={ruknId} />
      </section>

      <CurrentVisitPanel mission={currentVisit} pendingKarkunId={pendingKarkunId} />
      <NextMissionPanel mission={nextMission} />
      <CompletedWorkPanel items={RUKN_COMPLETED_TODAY} />
    </div>
  )
}
