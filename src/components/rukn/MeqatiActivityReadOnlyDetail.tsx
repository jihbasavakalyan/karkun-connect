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

/**
 * Claude-approved Rukn Activity Detail — minimal read-only context.
 * Open label/value pairs; no card chrome around the context block.
 */
export function MeqatiActivityReadOnlyDetail({
  activity,
  responsibleName,
  onClose,
}: MeqatiActivityReadOnlyDetailProps) {
  if (!activity) return null

  return (
    <Modal isOpen title={activity.name} onClose={onClose}>
      <div className="rukn-activity-detail" dir="rtl" lang="ur">
        <dl className="rukn-activity-detail-facts">
          <div className="rukn-activity-detail-fact">
            <dt>ذمہ دار</dt>
            <dd>{responsibleName ?? 'غیر متعین'}</dd>
          </div>
          <div className="rukn-activity-detail-fact">
            <dt>نظام الاوقات</dt>
            <dd>{formatProgrammeScheduleLabel(activity.frequency)}</dd>
          </div>
          <div className="rukn-activity-detail-fact">
            <dt>موجودہ صورتحال</dt>
            <dd>
              <span className="rukn-resp-status">{formatActivityStatus(activity.status)}</span>
            </dd>
          </div>
          {activity.summary?.trim() ? (
            <div className="rukn-activity-detail-fact">
              <dt>حالیہ / آخری رپورٹ</dt>
              <dd className="whitespace-normal break-words">{activity.summary}</dd>
            </div>
          ) : (
            <div className="rukn-activity-detail-fact">
              <dt>حالیہ / آخری رپورٹ</dt>
              <dd>ابھی کوئی رپورٹ درج نہیں۔</dd>
            </div>
          )}
          <div className="rukn-activity-detail-fact">
            <dt>موجودہ متوقع عمل</dt>
            <dd>صورتحال کے مطابق کارگزاری درج کریں۔</dd>
          </div>
        </dl>

        <div className="rukn-activity-detail-years">
          <p className="rukn-activity-detail-years-label">عمل درآمد (سال بہ سال)</p>
          <ul>
            {listMeqatiPlanYears().map((year) => (
              <li key={year.key}>
                <span>{year.label}</span>
                <span>
                  {formatActivityYearStatusLabel(
                    resolveActivityYearStatus(activity.yearStatuses, year.key),
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="rukn-activity-detail-note">
          یہ تفصیل صرف مطالعہ کے لیے ہے۔ کارگزاری درج کرنے کی سہولت موجودہ ورک فلو کے مطابق دستیاب
          ہو گی۔
        </p>
      </div>
    </Modal>
  )
}
