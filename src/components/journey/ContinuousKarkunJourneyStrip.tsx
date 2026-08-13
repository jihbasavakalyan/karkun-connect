/**
 * Phase 7 — Continuous Karkun journey strip (TASK-056 + TASK-057–059).
 * Derived read model. Not a second journey SoT.
 */

import { Link } from 'react-router-dom'
import {
  CONTINUOUS_JOURNEY_STAGE_LABELS,
  countContinuousJourneyByStageForRukn,
  type ContinuousKarkunJourneySnapshot,
  type JourneyLinkedAction,
  type JourneyResponsibilityVisibility,
} from '@/lib/journey/continuousKarkunJourney'

type ContinuousKarkunJourneyStripProps = {
  snapshot: ContinuousKarkunJourneySnapshot
}

function ActionRow({ label, action }: { label: string; action: JourneyLinkedAction }) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-surface-muted px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</p>
      <Link to={action.href} className="mt-1 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-text-heading">{action.title}</span>
          <span className="mt-0.5 block truncate text-xs text-secondary">{action.detail}</span>
        </span>
        <span className="shrink-0 text-sm font-medium text-primary">{action.actionLabel} →</span>
      </Link>
    </div>
  )
}

function ResponsibilityRow({ row }: { row: JourneyResponsibilityVisibility }) {
  return (
    <li className="mt-2 rounded-lg border border-border px-3 py-2 text-sm">
      <Link to={row.href} className="block">
        <span className="font-semibold text-text-heading">{row.nature}</span>
        <span className="mt-0.5 block text-xs text-secondary">
          {row.unitName}
          {' · '}
          {row.inForce ? 'In force' : 'Not in force'}
          {' · '}
          {row.tenureLabel}
        </span>
        {row.relatedWorkTitle ? (
          <span className="mt-0.5 block text-xs text-secondary">Work: {row.relatedWorkTitle}</span>
        ) : null}
      </Link>
    </li>
  )
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

      {snapshot.developmentAction ? (
        <ActionRow label="Development action" action={snapshot.developmentAction} />
      ) : (
        <p className="mt-3 text-xs text-secondary">No pending development action from existing records.</p>
      )}

      {snapshot.followUp ? (
        <ActionRow label="Follow-up" action={snapshot.followUp} />
      ) : (
        <p className="mt-2 text-xs text-secondary">
          {snapshot.developmentAction
            ? 'Next step is the development action above.'
            : 'No open follow-up from existing records.'}
        </p>
      )}

      {snapshot.responsibilities.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Responsibility</p>
          <ul>
            {snapshot.responsibilities.map((row) => (
              <ResponsibilityRow key={row.id} row={row} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-xs text-secondary">No Phase 4 responsibility on record.</p>
      )}
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
