/**
 * Rukn Responsibilities — Claude open Urdu-first operational list.
 * Same localProgrammes.responsibleRuknId path as Meeqati Mansooba. Not Phase 4.
 */

import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { buildRuknMeqatiActivities } from '@/lib/rukn/ruknMeqatiActivities'

type RuknResponsibilitiesHomePanelProps = {
  ruknId: string
}

export function RuknResponsibilitiesHomePanel({ ruknId }: RuknResponsibilitiesHomePanelProps) {
  const items = buildRuknMeqatiActivities(ruknId)

  return (
    <section
      className="rukn-resp"
      aria-label="میری ذمہ داریاں"
      dir="rtl"
      lang="ur"
    >
      <header className="rukn-resp-head">
        <p className="rukn-resp-sub">میقاتی منصوبہ سے منسوب سرگرمیاں</p>
      </header>
      {items.length === 0 ? (
        <p className="rukn-resp-empty">
          میقاتی ذمہ داری برقرار ہے۔ سرگرمی کی تفصیل ابھی ظاہر نہیں ہو رہی۔
        </p>
      ) : (
        <ul className="rukn-resp-list">
          {items.map((item) => (
            <li key={item.id} className="rukn-resp-row">
              <p className="rukn-resp-name">{item.name}</p>
              <dl className="rukn-resp-meta">
                {item.shobahName ? (
                  <div>
                    <dt>شعبہ</dt>
                    <dd>{item.shobahName}</dd>
                  </div>
                ) : null}
                {item.objectiveTitle ? (
                  <div>
                    <dt>ہدف</dt>
                    <dd>{item.objectiveTitle}</dd>
                  </div>
                ) : null}
                {item.scheduleLabel ? (
                  <div>
                    <dt>نظام الاوقات</dt>
                    <dd>{item.scheduleLabel}</dd>
                  </div>
                ) : null}
                {item.yearStatusLabel ? (
                  <div>
                    <dt>صورتحال</dt>
                    <dd>
                      <span className="rukn-resp-status">{item.yearStatusLabel}</span>
                    </dd>
                  </div>
                ) : null}
              </dl>
              {item.action ? (
                <Link to={item.action.href} className="rukn-resp-link">
                  {item.action.label}
                </Link>
              ) : (
                <Link to={ROUTES.RUKN_MEQATI_MANSOOBA} className="rukn-resp-link">
                  میقاتی منصوبہ میں دیکھیں
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
