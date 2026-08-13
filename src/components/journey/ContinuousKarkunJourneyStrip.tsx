/**
 * Phase 7 — Continuous Karkun journey strip (TASK-056).
 * Derived read model. Not a second journey SoT.
 */

import {
  CONTINUOUS_JOURNEY_STAGE_LABELS,
  countContinuousJourneyByStageForRukn,
  type ContinuousKarkunJourneySnapshot,
} from '@/lib/journey/continuousKarkunJourney'

type ContinuousKarkunJourneyStripProps = {
  snapshot: ContinuousKarkunJourneySnapshot
}

export function ContinuousKarkunJourneyStrip({ snapshot }: ContinuousKarkunJourneyStripProps) {
  return (
    <section aria-label="Continuous Karkun journey">
      <h2 className="text-sm font-semibold text-text-heading">Continuous journey</h2>
      <p className="mt-1 text-xs text-secondary">
        Connection → Development → Participation → Responsibility → Leadership
      </p>
      <p className="mt-1 text-xs text-secondary">Current: {snapshot.stageLabel}</p>
      <ol className="mt-3 flex flex-wrap gap-2">
        {snapshot.steps.map((step) => (
          <li
            key={step.id}
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-semibold',
              step.current
                ? 'border-primary bg-primary/10 text-primary'
                : step.complete
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-border text-secondary',
            ].join(' ')}
          >
            {CONTINUOUS_JOURNEY_STAGE_LABELS[step.id]}
            {step.current && !step.complete ? ' · now' : ''}
          </li>
        ))}
      </ol>
    </section>
  )
}

type ContinuousJourneyCountsStripProps = {
  ruknId: string
}

export function ContinuousJourneyCountsStrip({ ruknId }: ContinuousJourneyCountsStripProps) {
  const rows = countContinuousJourneyByStageForRukn(ruknId)
  if (rows.length === 0) return null

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
      aria-label="Connected Karkun journey"
    >
      <h2 className="text-sm font-semibold text-text-heading">Connected Karkun journey</h2>
      <p className="mt-1 text-xs text-secondary">
        Current stage counts from existing connection, development, participation, and
        responsibility records.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {rows.map((row) => (
          <li
            key={row.stageId}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-heading"
          >
            {row.label} · {row.count}
          </li>
        ))}
      </ul>
    </section>
  )
}
