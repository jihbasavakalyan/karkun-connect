import { Modal } from '@/components/common'
import { listMeqatiPlanYears } from '@/lib/dashboard/meqatiYear'
import {
  formatActivityYearStatusLabel,
  resolveActivityYearStatus,
} from '@/lib/planning/activityYearStatus'
import { formatProgrammeScheduleLabel } from '@/lib/planning/programmeSchedule'
import { formatActivityStatus } from '@/pages/admin/meqati/meqatiPlanningPresentation'
import type { LocalProgramme } from '@/types/localProgramme.types'

type MeqatiActivityReadOnlyDetailProps = {
  activity: LocalProgramme | null
  responsibleName: string | null
  onClose: () => void
}

export function MeqatiActivityReadOnlyDetail({
  activity,
  responsibleName,
  onClose,
}: MeqatiActivityReadOnlyDetailProps) {
  if (!activity) return null

  return (
    <Modal isOpen title={activity.name} onClose={onClose}>
      <dl className="space-y-3 text-sm" dir="rtl" lang="ur">
        <div>
          <dt className="text-secondary">ذمہ دار</dt>
          <dd className="text-text-heading">{responsibleName ?? 'غیر متعین'}</dd>
        </div>
        <div>
          <dt className="text-secondary">نظام الاوقات</dt>
          <dd className="text-text-heading">{formatProgrammeScheduleLabel(activity.frequency)}</dd>
        </div>
        <div>
          <dt className="text-secondary">حالت</dt>
          <dd className="text-text-heading">{formatActivityStatus(activity.status)}</dd>
        </div>
        {activity.summary?.trim() ? (
          <div>
            <dt className="text-secondary">خلاصہ</dt>
            <dd className="text-text-heading whitespace-normal break-words">{activity.summary}</dd>
          </div>
        ) : null}
        <div>
          <dt className="mb-1 text-secondary">عمل درآمد</dt>
          <dd>
            <ul className="space-y-1">
              {listMeqatiPlanYears().map((year) => (
                <li key={year.key}>
                  {year.label}:{' '}
                  {formatActivityYearStatusLabel(
                    resolveActivityYearStatus(activity.yearStatuses, year.key),
                  )}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </Modal>
  )
}
