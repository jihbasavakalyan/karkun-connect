import { Link } from 'react-router-dom'
import { DEMO_RUKN_PORTAL_ID } from '@/constants/demoRukn'
import { ROUTES, ruknVisitPath } from '@/constants/routes'
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
  CurrentVisitPanel,
  NextMissionPanel,
} from '@/components/dashboard/RuknMissionPanels'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

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
        <p className="mt-2 text-secondary">Start today&apos;s campaign execution.</p>
      </div>

      {assignedKarkunan.length > 0 ? (
        <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
          <h2 className="text-lg font-semibold text-text-heading">Today&apos;s Assigned Karkuns</h2>
          <p className="mt-1 text-sm text-secondary">
            {assignedKarkunan.length} assigned
            {pendingKarkunId ? ' · Annexure-1 pending' : ' · all up to date'}
          </p>
          <div className="mt-4 grid gap-2">
            {pendingKarkunId && (
              <Link to={ruknVisitPath(pendingKarkunId)}>
                <PrimaryButton type="button" fullWidth>
                  Open Annexure-1
                </PrimaryButton>
              </Link>
            )}
            <Link to={ROUTES.RUKN_MY_KARKUN}>
              <SecondaryButton type="button" fullWidth>
                View All Assigned Karkuns
              </SecondaryButton>
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-(--radius-card) border border-border bg-surface p-5 text-center shadow-card">
          <p className="text-secondary">No Karkun assigned yet.</p>
          <Link to={ROUTES.RUKN_AVAILABLE_KARKUN} className="mt-4 inline-block">
            <SecondaryButton type="button">Browse Available Karkun</SecondaryButton>
          </Link>
        </section>
      )}

      <section className="space-y-4">
        <MissionHeroCard
          missionTitle={currentMission?.title ?? 'No missions today'}
          estimatedTime={currentMission?.estimatedTime ?? '—'}
        />
        <MissionProgress progress={progress} />
      </section>

      <CurrentVisitPanel mission={currentVisit} />
      <NextMissionPanel mission={nextMission} />
      <CompletedWorkPanel items={RUKN_COMPLETED_TODAY} />
    </div>
  )
}
