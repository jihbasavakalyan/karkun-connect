import { RUKN_COMPLETED_TODAY } from '@/constants/mockMissions'
import {
  generateRuknMissionQueue,
  getCurrentMission,
  getMissionProgress,
  getNextMission,
} from '@/lib/mockMissionEngine'
import { MissionHeroCard } from '@/components/dashboard/MissionHeroCard'
import { MissionProgress } from '@/components/dashboard/MissionProgress'
import {
  CompletedWorkPanel,
  ContinueMissionButton,
  CurrentVisitPanel,
  NextMissionPanel,
} from '@/components/dashboard/RuknMissionPanels'

export function RuknHomePage() {
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

      <section className="space-y-4">
        <MissionHeroCard
          missionTitle={currentMission?.title ?? 'No missions today'}
          estimatedTime={currentMission?.estimatedTime ?? '—'}
        />
        <MissionProgress progress={progress} />
        <ContinueMissionButton />
      </section>

      <CurrentVisitPanel mission={currentVisit} />
      <NextMissionPanel mission={nextMission} />
      <CompletedWorkPanel items={RUKN_COMPLETED_TODAY} />
    </div>
  )
}
