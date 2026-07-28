/**
 * KC-0124 / KC-0126 — 360° Person Profile overview (campaign journey surface).
 * Presentation polish only — profile data unchanged.
 */

import { Link } from 'react-router-dom'
import { buildPerson360Profile } from '@/lib/personProfile'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'
import { UI_LABELS } from '@/lib/uiTerminology'

type Person360OverviewProps = {
  personId: string
}

function toneClass(tone: 'ok' | 'pending' | 'neutral'): string {
  if (tone === 'ok') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (tone === 'pending') return 'border-amber-200 bg-amber-50 text-amber-950'
  return 'border-border bg-surface-muted text-text-heading'
}

export function Person360Overview({ personId }: Person360OverviewProps) {
  const profile = buildPerson360Profile(personId)
  if (!profile.found) return null

  const { header, responsibility, campaignStatus, journeyStages, timeline, communications, quickActions } =
    profile

  return (
    <div className="person-360 space-y-5">
      <section className="person-360-card rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary"
            aria-hidden
          >
            {header.photoPlaceholder}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
              360° Person Profile
            </p>
            <h2 className="truncate text-xl font-semibold text-text-heading sm:text-2xl">
              {formatPersonNameForDisplay(header.name)}
            </h2>
            <dl className="mt-3 grid gap-2 text-sm text-secondary sm:grid-cols-2">
              <div>
                <dt className="inline font-medium text-text-heading">Mobile: </dt>
                <dd className="inline">{header.mobile || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-text-heading">Gender: </dt>
                <dd className="inline">{header.gender || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-text-heading">Registry: </dt>
                <dd className="inline">{header.registry}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-text-heading">
                  {UI_LABELS.campaignSituation}:{' '}
                </dt>
                <dd className="inline">{header.campaignStatus || '—'}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-text-heading">
                  {UI_LABELS.connectedRukn}:{' '}
                </dt>
                <dd className="inline">{header.connectedRuknName}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-text-heading">Ward / Area: </dt>
                <dd className="inline">
                  {[header.ward, header.area].filter(Boolean).join(' · ') || '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickActions.map((action) =>
            action.kind === 'link' && action.href ? (
              <Link
                key={action.id}
                to={action.href}
                className="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-semibold text-text-heading hover:border-primary/40 hover:text-primary"
              >
                {action.label}
              </Link>
            ) : (
              <span
                key={action.id}
                className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-secondary"
                title="Available when eligible"
              >
                {action.label}
              </span>
            ),
          )}
        </div>
      </section>

      <section className="person-360-card rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <h3 className="text-sm font-semibold text-text-heading">{UI_LABELS.campaignSituation}</h3>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {campaignStatus.map((item) => (
            <li
              key={item.id}
              className={`rounded-lg border px-3 py-2.5 text-sm ${toneClass(item.tone)}`}
            >
              <p className="font-semibold">{item.label}</p>
              <p className="mt-0.5 opacity-90">{item.value}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="person-360-card rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <h3 className="text-sm font-semibold text-text-heading">Campaign Journey</h3>
        <ol className="mt-3 flex flex-wrap gap-2">
          {journeyStages.map((stage) => (
            <li
              key={stage.id}
              className={[
                'rounded-full border px-3 py-1.5 text-xs font-semibold',
                stage.current
                  ? 'border-primary bg-primary/10 text-primary'
                  : stage.complete
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-border text-secondary',
              ].join(' ')}
            >
              {stage.label}
            </li>
          ))}
        </ol>
      </section>

      <section className="person-360-card rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <h3 className="text-sm font-semibold text-text-heading">{UI_LABELS.responsibility}</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-secondary">Responsible Rukn</dt>
            <dd className="mt-0.5 font-medium text-text-heading">
              {responsibility.responsibleRuknName}
            </dd>
          </div>
          <div>
            <dt className="text-secondary">Connected Since</dt>
            <dd className="mt-0.5 font-medium text-text-heading">{responsibility.connectedSince}</dd>
          </div>
          <div>
            <dt className="text-secondary">{UI_LABELS.connection}</dt>
            <dd className="mt-0.5 font-medium text-text-heading">
              {responsibility.connectionStatus}
            </dd>
          </div>
        </dl>
        {responsibility.assignmentHistory.length > 0 ? (
          <ul className="mt-4 space-y-2.5 border-t border-border pt-3">
            {responsibility.assignmentHistory.slice(0, 5).map((row) => (
              <li key={row.assignmentId} className="text-sm text-secondary">
                <span className="font-medium text-text-heading">{row.ruknName}</span>
                {' · '}
                {row.assignmentNumber} · {row.status} · since {row.connectedSince}
                {row.endedDate ? ` → ${row.endedDate}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-secondary">No assignment history yet.</p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="person-360-card rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
          <h3 className="text-sm font-semibold text-text-heading">Timeline</h3>
          <p className="mt-1 text-xs text-secondary">Newest first</p>
          {timeline.length === 0 ? (
            <p className="mt-3 text-sm text-secondary">No timeline events yet.</p>
          ) : (
            <ul className="person-360-timeline mt-3 max-h-80 space-y-3 overflow-y-auto pe-1">
              {timeline.slice(0, 25).map((row) => (
                <li key={row.id} className="border-b border-border/60 pb-3 text-sm last:border-0">
                  <p className="font-medium text-text-heading">{row.activity}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {row.date}
                    {row.actor ? ` · ${row.actor}` : ''}
                    {row.module ? ` · ${row.module}` : ''}
                  </p>
                  {row.status ? <p className="mt-1 text-secondary">{row.status}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="person-360-card rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
          <h3 className="text-sm font-semibold text-text-heading">Communication history</h3>
          {communications.length === 0 ? (
            <p className="mt-3 text-sm text-secondary">No communication history yet.</p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto pe-1">
              {communications.slice(0, 20).map((row) => (
                <li key={row.id} className="border-b border-border/60 pb-3 text-sm last:border-0">
                  <p className="font-medium text-text-heading">{row.title}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {row.sentAt}
                    {row.actor ? ` · ${row.actor}` : ''}
                    {row.status ? ` · ${row.status}` : ''}
                  </p>
                  {row.preview ? <p className="mt-1 text-secondary">{row.preview}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
