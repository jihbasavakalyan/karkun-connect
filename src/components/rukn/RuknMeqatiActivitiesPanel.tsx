/**
 * Rukn Home — assigned Meeqati Mansooba سرگرمیاں (ذمہ دار = responsibleRuknId).
 * Read-only. Does not edit planning and does not create Work / Standing Responsibility.
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
      className="rukn-home-card"
      aria-labelledby="rukn-home-meqati-title"
      dir="rtl"
      lang="ur"
    >
      <header className="rukn-home-card-head">
        <h2 id="rukn-home-meqati-title" className="rukn-home-card-title">
          میقاتی منصوبہ
        </h2>
        <p className="rukn-home-card-sub">Meeqati Mansooba</p>
      </header>
      <p className="rukn-home-hint">منصوبہ اور سرگرمی — صرف مطالعہ۔</p>
      {items.length === 0 ? (
        <p className="rukn-home-empty">
          میقاتی ذمہ داری برقرار ہے۔ سرگرمی کی تفصیل ابھی ظاہر نہیں ہو رہی۔
        </p>
      ) : (
        <ul className="rukn-home-list">
          {items.map((item) => (
            <li key={item.id}>
              <p className="rukn-home-list-title">{item.name}</p>
              {item.shobahName || item.objectiveTitle ? (
                <p className="rukn-home-hint">
                  {item.shobahName ? `شعبہ: ${item.shobahName}` : null}
                  {item.shobahName && item.objectiveTitle ? ' · ' : null}
                  {item.objectiveTitle ? `ہدف: ${item.objectiveTitle}` : null}
                </p>
              ) : null}
              {item.scheduleLabel || item.yearStatusLabel ? (
                <p className="rukn-home-hint">
                  {item.scheduleLabel ? `نظام الاوقات: ${item.scheduleLabel}` : null}
                  {item.scheduleLabel && item.yearStatusLabel ? ' · ' : null}
                  {item.yearStatusLabel ? `${item.yearKey}: ${item.yearStatusLabel}` : null}
                </p>
              ) : null}
              {item.summary ? (
                <p className="rukn-home-hint">خلاصہ: {item.summary}</p>
              ) : null}
              {item.action ? (
                <Link to={item.action.href} className="rukn-home-inline-link">
                  {item.action.label}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
