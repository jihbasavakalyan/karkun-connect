import {
  ADMIN_MISSION_QUEUE,
  RUKN_MISSION_QUEUE,
  type AdminMission,
  type MissionStatus,
  type RuknMission,
} from '@/constants/mockMissions'

let ruknMissionSession: RuknMission[] | null = null

function ensureRuknMissionSession(): RuknMission[] {
  if (!ruknMissionSession) {
    ruknMissionSession = structuredClone(RUKN_MISSION_QUEUE)
  }
  return ruknMissionSession
}

export function generateAdminMissionQueue(): AdminMission[] {
  return structuredClone(ADMIN_MISSION_QUEUE)
}

export function generateRuknMissionQueue(): RuknMission[] {
  return structuredClone(ensureRuknMissionSession())
}

export function completeVisitReportSubmission(): {
  completed: RuknMission[]
  nextMission?: RuknMission
} {
  const missions = ensureRuknMissionSession()
  const completed: RuknMission[] = []

  for (const mission of missions) {
    if (mission.status === 'in_progress') {
      mission.status = 'completed'
      completed.push(mission)
    }
  }

  const submitReport = missions.find(
    (mission) => mission.type === 'submit-report' && mission.status === 'pending',
  )
  if (submitReport && completed.some((mission) => mission.type === 'visit')) {
    submitReport.status = 'completed'
    completed.push(submitReport)
  }

  const nextPending = missions.find((mission) => mission.status === 'pending')
  if (nextPending) {
    nextPending.status = 'in_progress'
  }

  return {
    completed,
    nextMission:
      missions.find((mission) => mission.status === 'in_progress') ??
      missions.find((mission) => mission.status === 'pending'),
  }
}

export function getCurrentMission<T extends { status: MissionStatus }>(
  missions: T[],
): T | undefined {
  return (
    missions.find((mission) => mission.status === 'in_progress') ??
    missions.find((mission) => mission.status === 'pending')
  )
}

export function getNextMission<T extends { status: MissionStatus }>(
  missions: T[],
): T | undefined {
  const currentIndex = missions.findIndex(
    (mission) => mission.status === 'in_progress' || mission.status === 'pending',
  )

  if (currentIndex === -1) {
    return undefined
  }

  return missions.slice(currentIndex + 1).find((mission) => mission.status === 'pending')
}

export function getMissionProgress(missions: { status: MissionStatus }[]): number {
  if (missions.length === 0) {
    return 0
  }

  const completed = missions.filter((mission) => mission.status === 'completed').length
  return Math.round((completed / missions.length) * 100)
}

export function getCompletedMissions<T extends { status: MissionStatus }>(missions: T[]): T[] {
  return missions.filter((mission) => mission.status === 'completed')
}
