/**
 * Reports guidance card (KC-009.1) — Urdu companion copy.
 */

import { useReportGuidance } from './ContextualGuidanceHooks'
import type { ConversationRole } from '@/runtime/service'
import {
  RAFEEQ_BRAND,
  RAFEEQ_EMPTY_LINES,
  RAFEEQ_SUBTITLE,
} from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'

export type ReportGuidanceCardProps = {
  route: string
  role: ConversationRole
}

export function ReportGuidanceCard({ route, role }: ReportGuidanceCardProps) {
  const { enabled, loading, viewModel } = useReportGuidance({ route, role })

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
        <h3 className="cd-block-title">مہم کی پیش رفت</h3>
        <p className="cd-supporting">
          {viewModel.campaignProgressSummary ?? 'پیش رفت کا خلاصہ اس وقت دستیاب نہیں۔'}
        </p>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">نامکمل رپورٹنگ</h3>
        {viewModel.missingReporting.length === 0 ? (
          <p className="cd-caption">کوئی نامکمل رپورٹنگ نہیں۔</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.missingReporting.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">تجویز کردہ جائزہ</h3>
        {viewModel.suggestedReviewActions.length === 0 ? (
          <p className="cd-caption">اس وقت کوئی خاص جائزہ تجویز نہیں۔</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.suggestedReviewActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
