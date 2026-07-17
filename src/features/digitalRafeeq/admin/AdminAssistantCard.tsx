/**
 * Administrator Dashboard Assistant card (KC-009.1) — Urdu companion copy.
 * Brand heading remains Digital Rafeeq.
 */

import type { AdminAssistantViewModel } from './AdminAssistantTypes'
import {
  RAFEEQ_BRAND,
  RAFEEQ_EMPTY_LINES,
  RAFEEQ_SUBTITLE,
} from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'

export type AdminAssistantCardProps = {
  viewModel: AdminAssistantViewModel
  loading?: boolean
}

const HEALTH_URDU: Record<string, string> = {
  Healthy: 'الحمد للہ — نظام درست چل رہا ہے',
  Degraded: 'نظام محدود انداز میں چل رہا ہے',
  Unavailable: 'اس وقت معاونت دستیاب نہیں',
}

export function AdminAssistantCard({
  viewModel,
  loading = false,
}: AdminAssistantCardProps) {
  const healthClass =
    viewModel.healthLabel === 'Healthy'
      ? 'cd-rafeeq-health-healthy'
      : viewModel.healthLabel === 'Degraded'
        ? 'cd-rafeeq-health-degraded'
        : 'cd-rafeeq-health-unavailable'

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
        <h3 className="cd-block-title">حالت</h3>
        <p className={`cd-rafeeq-status ${healthClass}`}>
          {HEALTH_URDU[viewModel.healthLabel] ?? viewModel.healthLabel}
        </p>
        {viewModel.healthDetail ? (
          <p className="cd-caption">{viewModel.healthDetail}</p>
        ) : null}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">آج کی ترجیح</h3>
        {viewModel.primaryPriority ? (
          <p className="cd-supporting">{viewModel.primaryPriority}</p>
        ) : (
          <p className="cd-caption">{RAFEEQ_EMPTY_LINES.noPriority}</p>
        )}
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
        <h3 className="cd-block-title">مہم کا خلاصہ</h3>
        {viewModel.campaignSummary ? (
          <p className="cd-supporting">{viewModel.campaignSummary}</p>
        ) : (
          <p className="cd-caption">مہم کا خلاصہ اس وقت دستیاب نہیں۔</p>
        )}
      </div>

      {viewModel.outstandingActions.length > 0 ? (
        <div className="cd-block cd-rafeeq-block">
          <h3 className="cd-block-title">باقی ذمہ داریاں</h3>
          <ul className="cd-caption-list">
            {viewModel.outstandingActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
