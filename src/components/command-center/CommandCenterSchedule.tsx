import { TodaysVisitQueue } from '@/components/home/TodaysVisitQueue'
import { adminExecutionPath } from '@/constants/routes'
import type { ScheduleItem } from '@/types/campaignAutomation.types'

type CommandCenterScheduleProps = {
  schedule: ScheduleItem[]
}

export function CommandCenterSchedule({ schedule }: CommandCenterScheduleProps) {
  return (
    <TodaysVisitQueue
      schedule={schedule}
      visitQueuePath={adminExecutionPath('pending')}
      upcomingPath={adminExecutionPath('pending')}
      variant="home"
    />
  )
}
