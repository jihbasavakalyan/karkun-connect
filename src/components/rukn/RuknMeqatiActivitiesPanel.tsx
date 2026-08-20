/**
 * Rukn Home — assigned Meqati سرگرمیاں (ذمہ دار = responsibleRuknId).
 * Read-only context. Operational links reuse existing Rukn surfaces.
 * Does not edit planning and does not create Work / Standing Responsibility.
 */

import { Link } from 'react-router-dom'
import { buildRuknMeqatiActivities } from '@/lib/rukn/ruknMeqatiActivities'

type RuknMeqatiActivitiesPanelProps = {
  ruknId: string
}

export function RuknMeqatiActivitiesPanel({ ruknId }: RuknMeqatiActivitiesPanelProps) {
  const items = buildRuknMeqatiActivities(ruknId)

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
      aria-label="میری میقاتی سرگرمیاں"
      dir="rtl"
      lang="ur"
    >
      <h2 className="text-sm font-semibold text-text-heading">میری میقاتی سرگرمیاں</h2>
      <p className="mt-1 text-xs text-secondary">
        سرگرمیاں جن کے آپ ذمہ دار ہیں — مجھے ابھی کیا کرنا ہے؟
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">
          اس وقت آپ کی ذمہ داری کی کوئی میقاتی سرگرمی نہیں۔
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="py-2.5">
              <p className="text-sm font-semibold text-text-heading">{item.name}</p>
              {item.shobahName || item.objectiveTitle ? (
                <p className="mt-0.5 text-xs text-secondary">
                  {item.shobahName ? `شعبہ: ${item.shobahName}` : null}
                  {item.shobahName && item.objectiveTitle ? ' · ' : null}
                  {item.objectiveTitle ? `ہدف: ${item.objectiveTitle}` : null}
                </p>
              ) : null}
              {item.scheduleLabel || item.yearStatusLabel ? (
                <p className="mt-0.5 text-xs text-secondary">
                  {item.scheduleLabel ? `نظام الاوقات: ${item.scheduleLabel}` : null}
                  {item.scheduleLabel && item.yearStatusLabel ? ' · ' : null}
                  {item.yearStatusLabel
                    ? `${item.yearKey}: ${item.yearStatusLabel}`
                    : null}
                </p>
              ) : null}
              {item.action ? (
                <Link
                  to={item.action.href}
                  className="mt-1 inline-block text-sm font-medium text-primary"
                >
                  {item.action.label} →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
