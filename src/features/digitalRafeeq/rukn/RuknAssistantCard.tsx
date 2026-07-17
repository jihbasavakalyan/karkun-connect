/**
 * Rukn Home Assistant card sections (KC-009.1) — Urdu companion copy.
 */

import type { RuknAssistantViewModel } from './RuknAssistantTypes'
import {
  RAFEEQ_BRAND,
  RAFEEQ_EMPTY_LINES,
  RAFEEQ_SUBTITLE,
} from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'

export type RuknAssistantCardProps = {
  viewModel: RuknAssistantViewModel
  loading?: boolean
}

export function RuknAssistantCard({
  viewModel,
  loading = false,
}: RuknAssistantCardProps) {
  return (
    <div
      className="cd-panel cd-panel-secondary cd-rafeeq-panel urdu-text"
      aria-label={RAFEEQ_BRAND}
      dir="rtl"
      lang="ur"
    >
      <h2 className="cd-section-heading" dir="ltr" lang="en" style={{ textAlign: 'left' }}>
        {RAFEEQ_BRAND}
      </h2>
      <p className="cd-caption">{RAFEEQ_SUBTITLE}</p>

      {loading ? <p className="cd-caption">{RAFEEQ_EMPTY_LINES.preparing}</p> : null}

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">آج کا مشن</h3>
        {viewModel.todaysMission ? (
          <p className="cd-supporting">{viewModel.todaysMission}</p>
        ) : (
          <p className="cd-caption">{RAFEEQ_EMPTY_LINES.noPriority}</p>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">آج کی رابطہ فہرست</h3>
        <ul className="cd-caption-list">
          <li>
            <span className="cd-supporting">مربوط کارکن — </span>
            {viewModel.connectQueue.connectedKarkuns}
          </li>
          <li>
            <span className="cd-supporting">باقی ملاقاتیں — </span>
            {viewModel.connectQueue.pendingVisits}
          </li>
          <li>
            <span className="cd-supporting">طے شدہ ملاقاتیں — </span>
            {viewModel.connectQueue.pendingMeetings}
          </li>
        </ul>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">تجاویز</h3>
        {viewModel.recommendations.length === 0 ? (
          <p className="cd-caption">اس وقت کوئی خاص تجویز نہیں۔</p>
        ) : (
          <ul className="cd-action-list">
            {viewModel.recommendations.map((item) => (
              <li key={item.id}>
                <span className="cd-supporting">{item.title}</span>
                {item.detail ? <span className="cd-caption"> {item.detail}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">ذاتی پیش رفت</h3>
        <ul className="cd-caption-list">
          <li>
            <span className="cd-supporting">مکمل روابط — </span>
            {viewModel.personalProgress.connectionsCompleted}
          </li>
          <li>
            <span className="cd-supporting">مکمل ملاقاتیں — </span>
            {viewModel.personalProgress.meetingsCompleted}
          </li>
          <li>
            <span className="cd-supporting">تعمیل یاد دہانیاں — </span>
            {viewModel.personalProgress.complianceReminders}
          </li>
        </ul>
      </div>
    </div>
  )
}
