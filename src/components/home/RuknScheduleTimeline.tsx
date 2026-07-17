import { ROUTES } from '@/constants/routes'
import { TodaysVisitQueue } from '@/components/home/TodaysVisitQueue'
import type { ScheduleItem } from '@/types/campaignAutomation.types'

type RuknScheduleTimelineProps = {
  schedule: ScheduleItem[]
  completedToday?: number
}

export function RuknScheduleTimeline({ schedule, completedToday }: RuknScheduleTimelineProps) {
  return (
    <TodaysVisitQueue
      schedule={schedule}
      visitQueuePath={ROUTES.RUKN_MY_KARKUN}
      upcomingPath={ROUTES.RUKN_MY_KARKUN}
      variant="section"
      completedToday={completedToday}
    />
  )
}
