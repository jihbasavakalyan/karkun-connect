/**
 * Compliance guidance card (KC-009.1) — Urdu companion copy.
 */

import { useComplianceGuidance } from './ContextualGuidanceHooks'
import {
  RAFEEQ_BRAND,
  RAFEEQ_EMPTY_LINES,
  RAFEEQ_SUBTITLE,
} from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'

export type ComplianceGuidanceCardProps = {
  route?: string
}

export function ComplianceGuidanceCard({
  route = '/admin/compliance',
}: ComplianceGuidanceCardProps) {
  const { enabled, loading, viewModel } = useComplianceGuidance({ route })

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
        <h3 className="cd-block-title">باقی جمع کرانیاں</h3>
        {viewModel.outstandingSubmissions.length === 0 ? (
          <p className="cd-caption">کوئی باقی جمع کرانی نہیں۔</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.outstandingSubmissions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">آنے والی آخری تاریخیں</h3>
        {viewModel.upcomingDeadlines.length === 0 ? (
          <p className="cd-caption">کوئی قریبی آخری تاریخ نہیں۔</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.upcomingDeadlines.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">نامکمل ریکارڈ</h3>
        {viewModel.missingRecords.length === 0 ? (
          <p className="cd-caption">کوئی نامکمل ریکارڈ نہیں۔</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.missingRecords.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
