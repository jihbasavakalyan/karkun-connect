/**
 * Rukn Home — read-only responsibilities from Meeqati ذمہ دار assignment.
 * Same localProgrammes.responsibleRuknId path as Meeqati Mansooba. Not Phase 4.
 */

import { buildRuknMeqatiActivities } from '@/lib/rukn/ruknMeqatiActivities'

type RuknResponsibilitiesHomePanelProps = {
  ruknId: string
}

export function RuknResponsibilitiesHomePanel({ ruknId }: RuknResponsibilitiesHomePanelProps) {
  const items = buildRuknMeqatiActivities(ruknId)

  return (
    <section
      className="rukn-home-card"
      aria-labelledby="rukn-home-responsibilities-title"
      dir="rtl"
      lang="ur"
    >
      <header className="rukn-home-card-head">
        <h2 id="rukn-home-responsibilities-title" className="rukn-home-card-title">
          رکن کی ذمہ داریاں
        </h2>
        <p className="rukn-home-card-sub">Rukn Responsibilities</p>
      </header>
      {items.length === 0 ? (
        <p className="rukn-home-empty">
          اس وقت آپ کی ذمہ داری کی کوئی میقاتی سرگرمی نہیں۔
        </p>
      ) : (
        <ul className="rukn-home-list">
          {items.map((item) => (
            <li key={item.id}>
              <p className="rukn-home-list-title">{item.name}</p>
              <p className="rukn-home-hint">
                {item.shobahName ? `شعبہ: ${item.shobahName}` : null}
                {item.shobahName && item.yearStatusLabel ? ' · ' : null}
                {item.yearStatusLabel ? item.yearStatusLabel : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
