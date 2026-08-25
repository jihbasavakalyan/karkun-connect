import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { SecondaryButton, Skeleton, StatusBadge } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageShell } from '@/components/ui/PageShell'
import { ROUTES, ruknVisitPath } from '@/constants/routes'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useTrainingRuknProgress } from '@/hooks/useTrainingRuknProgress'
import { TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import type { TrainingRuknProgressPerson } from '@/lib/publicRegistration/types'

type ProgressFilter = 'all' | 'registered' | 'not_registered'

const FILTERS: ReadonlyArray<{ id: ProgressFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'registered', label: 'Registered' },
  { id: 'not_registered', label: 'Not Registered' },
]

function matchesFilter(person: TrainingRuknProgressPerson, filter: ProgressFilter): boolean {
  if (filter === 'registered') return person.registered
  if (filter === 'not_registered') return !person.registered
  return true
}

export function TarbiyatiIjtemaRegistrationProgressPage() {
  const ruknId = useRequiredRuknId()
  const { status, progress, error, retry } = useTrainingRuknProgress()
  const [filter, setFilter] = useState<ProgressFilter>('all')

  const visible = useMemo(() => {
    if (!progress) return []
    return progress.karkuns.filter((person) => matchesFilter(person, filter))
  }, [filter, progress])

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return (
    <PageShell variant="narrow">
      <PageHeader
        title="Tarbiyati Ijtema Registration"
        description={`${TRAINING_GATHERING_EVENT.eventTitleEn} · 13 September 2026`}
      />
      <p className="mb-4">
        <Link to={ROUTES.RUKN} className="text-sm font-medium text-primary hover:underline">
          Back to Home
        </Link>
      </p>

      {status === 'loading' ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading registration progress">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4" role="alert">
          <p className="text-sm text-text-heading">
            {error || 'Unable to load registration progress.'}
          </p>
          <SecondaryButton className="mt-3" onClick={retry}>
            Retry
          </SecondaryButton>
        </div>
      ) : null}

      {status === 'ready' && progress ? (
        <>
          <section
            className="rounded-xl border border-border bg-surface p-4 shadow-card"
            aria-label="Registration summary"
          >
            <p className="text-sm text-text-heading">
              <span className="text-secondary">My Registration: </span>
              <span className="font-semibold">
                {progress.ownRegistered ? '✅ Registered' : '❌ Not Registered'}
              </span>
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface-muted px-2 py-2">
                <dt className="text-[11px] text-secondary sm:text-xs">Connected Karkuns</dt>
                <dd className="text-lg font-semibold tabular-nums text-text-heading">
                  {progress.connectedCount}
                </dd>
              </div>
              <div className="rounded-lg bg-surface-muted px-2 py-2">
                <dt className="text-[11px] text-secondary sm:text-xs">Registered</dt>
                <dd className="text-lg font-semibold tabular-nums text-text-heading">
                  {progress.registeredCount}
                </dd>
              </div>
              <div className="rounded-lg bg-surface-muted px-2 py-2">
                <dt className="text-[11px] text-secondary sm:text-xs">Not Registered</dt>
                <dd className="text-lg font-semibold tabular-nums text-text-heading">
                  {progress.notRegisteredCount}
                </dd>
              </div>
            </dl>
          </section>

          {progress.connectedCount === 0 ? (
            <p className="mt-4 text-sm text-secondary">No connected Karkuns yet.</p>
          ) : (
            <>
              <div
                className="mt-4 flex flex-wrap gap-2"
                role="tablist"
                aria-label="Registration status filter"
              >
                {FILTERS.map((item) => {
                  const selected = filter === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={[
                        'rounded-full px-3 py-1.5 text-sm font-medium',
                        selected
                          ? 'bg-primary text-white'
                          : 'border border-border bg-surface text-text-heading hover:bg-surface-muted',
                      ].join(' ')}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {visible.map((person) => (
                  <li key={person.karkunId}>
                    <Link
                      to={ruknVisitPath(person.karkunId)}
                      className="flex flex-col gap-1 px-3 py-3 hover:bg-surface-muted sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-text-heading">
                          {person.name}
                        </span>
                        {person.gender || person.category ? (
                          <span className="block text-xs text-secondary">
                            {[person.gender, person.category].filter(Boolean).join(' · ')}
                          </span>
                        ) : null}
                      </span>
                      <span className="break-all text-sm text-secondary">{person.mobile}</span>
                      <StatusBadge variant={person.registered ? 'success' : 'warning'}>
                        {person.registered ? 'Registered' : 'Not Registered'}
                      </StatusBadge>
                    </Link>
                  </li>
                ))}
              </ul>
              {visible.length === 0 ? (
                <p className="mt-3 text-sm text-secondary">No people in this filter.</p>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </PageShell>
  )
}
