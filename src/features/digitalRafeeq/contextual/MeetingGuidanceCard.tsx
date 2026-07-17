/**
 * Meeting workflow guidance card (KC-009.1) — Urdu companion copy.
 */

import { useMeetingGuidance } from './ContextualGuidanceHooks'
import type { ConversationRole } from '@/runtime/service'
import {
  RAFEEQ_BRAND,
  RAFEEQ_EMPTY_LINES,
  RAFEEQ_SUBTITLE,
} from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'

export type MeetingGuidanceCardProps = {
  route: string
  role: ConversationRole
  payload?: Readonly<Record<string, unknown>>
}

export function MeetingGuidanceCard({
  route,
  role,
  payload,
}: MeetingGuidanceCardProps) {
  const { enabled, loading, viewModel } = useMeetingGuidance({
    route,
    role,
    payload,
  })

  if (!enabled) return null
  if (viewModel.visibility === 'hidden' && !loading) return null

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
        <h3 className="cd-block-title">ملاقات کی یاد دہانی</h3>
        {viewModel.agendaReminders.length === 0 ? (
          <p className="cd-caption">اس وقت کوئی خاص یاد دہانی نہیں۔</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.agendaReminders.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">گزشتہ ملاقات</h3>
        <p className="cd-supporting">
          {viewModel.previousMeetingSummary ?? 'گزشتہ ملاقات کا خلاصہ دستیاب نہیں۔'}
        </p>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">باقی ذمہ داریاں</h3>
        {viewModel.pendingActionItems.length === 0 ? (
          <p className="cd-caption">کوئی باقی ذمہ داری نہیں۔</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.pendingActionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
