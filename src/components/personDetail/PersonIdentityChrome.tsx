import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RUFAQA_LABEL_EN, RUFAQA_LABEL_UR } from '@/lib/rufaqa/rufaqaNav'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'

type PersonIdentityChromeProps = {
  backHref: string
  categoryLabel: string
  name: string
  badges?: ReactNode
  facts?: Array<{ label: string; value: ReactNode }>
  actions?: ReactNode
}

export function PersonIdentityChrome({
  backHref,
  categoryLabel,
  name,
  badges,
  facts,
  actions,
}: PersonIdentityChromeProps) {
  return (
    <header className="kc-person-detail-header">
      <Link to={backHref} className="kc-person-detail-back">
        <span aria-hidden>← </span>
        <span dir="rtl" lang="ur">
          {RUFAQA_LABEL_UR}
        </span>
        <span>
          {' '}
          / {RUFAQA_LABEL_EN} → {categoryLabel}
        </span>
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="kc-person-detail-name">{formatPersonNameForDisplay(name)}</h1>
          {badges ? <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div> : null}
        </div>
        {actions ? <div className="kc-person-detail-actions">{actions}</div> : null}
      </div>

      {facts && facts.length > 0 ? (
        <dl className="kc-person-detail-facts">
          {facts.map((fact) => (
            <div key={fact.label} className="kc-person-detail-fact">
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  )
}
