import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { SecondaryButton, Skeleton, StatusBadge } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageShell } from '@/components/ui/PageShell'
import { ROUTES, ruknVisitPath } from '@/constants/routes'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useTrainingRuknProgress } from '@/hooks/useTrainingRuknProgress'
import { TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import { TrainingRegistrationProgressMetrics } from '@/components/home/TrainingRegistrationProgressMetrics'
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

function ProgressPeopleList({
  title,
  people,
}: {
  title: string
  people: TrainingRuknProgressPerson[]
}) {
  return (
    <section className="mt-4" aria-label={title}>
      <h3 className="mb-2 text-sm font-semibold text-text-heading">{title}</h3>
      {people.length === 0 ? (
        <p className="text-sm text-secondary">No people in this filter.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {people.map((person) => (
            <li key={person.karkunId}>
              <Link
                to={ruknVisitPath(person.karkunId)}
                className="flex flex-col gap-1 px-3 py-3 hover:bg-surface-muted sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-text-heading">{person.name}</span>
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
      )}
    </section>
  )
}

export function TarbiyatiIjtemaRegistrationProgressPage() {
  const ruknId = useRequiredRuknId()
  const { status, progress, error, retry } = useTrainingRuknProgress()
  const [filter, setFilter] = useState<ProgressFilter>('all')

  const visibleKarkuns = useMemo(() => {
    if (!progress) return []
    return progress.karkuns.filter((person) => matchesFilter(person, filter))
  }, [filter, progress])
  const visibleMuttafiqeen = useMemo(() => {
    if (!progress) return []
    return progress.muttafiqeen.filter((person) => matchesFilter(person, filter))
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
            <div className="mt-3">
              <TrainingRegistrationProgressMetrics progress={progress} />
            </div>
          </section>

          {progress.connectedCount === 0 && progress.muttafiqConnectedCount === 0 ? (
            <p className="mt-4 text-sm text-secondary">No connected Karkuns or Muttafiq yet.</p>
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

              <ProgressPeopleList title="Karkun" people={visibleKarkuns} />
              <ProgressPeopleList title="Muttafiq" people={visibleMuttafiqeen} />
            </>
          )}
        </>
      ) : null}
    </PageShell>
  )
}
