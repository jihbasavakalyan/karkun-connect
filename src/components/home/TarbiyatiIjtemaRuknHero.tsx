import { Link } from 'react-router-dom'
import { JihLogoMark } from '@/components/public-registration/JihLogoMark'
import { SecondaryButton, Skeleton } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { useTrainingRuknProgress } from '@/hooks/useTrainingRuknProgress'
import { TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import { PUBLIC_TRAINING_REGISTRATION_URL } from '@/lib/publicRegistration/adminTracking'

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-2 py-2 text-center sm:px-3">
      <p className="text-[11px] leading-tight text-secondary sm:text-xs">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-heading">{value}</p>
    </div>
  )
}

function OwnRegistrationStatus({ registered }: { registered: boolean }) {
  return (
    <p className="text-sm text-text-heading">
      <span className="text-secondary">My Registration: </span>
      {registered ? (
        <span className="font-semibold text-emerald-700">✅ Registered</span>
      ) : (
        <span className="font-semibold text-amber-800">❌ Not Registered</span>
      )}
    </p>
  )
}

/** Authenticated Rukn Home — event info plus scoped connected-Karkun registration progress. */
export function TarbiyatiIjtemaRuknHero() {
  const { status, progress, error, retry } = useTrainingRuknProgress()

  return (
    <section
      className="rounded-(--radius-card) border border-primary/25 bg-surface p-4 shadow-card"
      aria-label="Tarbiyati Ijtema registration"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="mx-auto w-16 shrink-0 sm:mx-0 sm:w-20">
          <JihLogoMark />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="font-urdu text-xl font-semibold text-text-heading" dir="rtl" lang="ur">
            {TRAINING_GATHERING_EVENT.eventTitleUrdu}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text-heading">
            {TRAINING_GATHERING_EVENT.eventTitleEn}
          </h2>
          <p className="mt-1 text-sm text-secondary">13 September 2026</p>
          <p className="text-sm text-secondary">
            {TRAINING_GATHERING_EVENT.venue}
            <br />
            {TRAINING_GATHERING_EVENT.city}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {status === 'loading' ? (
          <div aria-busy="true" aria-label="Loading registration progress">
            <Skeleton className="h-5 w-48 rounded-md" />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-left" role="alert">
            <p className="text-sm text-text-heading">
              {error || 'Unable to load registration progress.'}
            </p>
            <SecondaryButton className="mt-2" size="sm" onClick={retry}>
              Retry
            </SecondaryButton>
          </div>
        ) : null}

        {status === 'ready' && progress ? (
          <>
            <OwnRegistrationStatus registered={progress.ownRegistered} />
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Connected Karkuns" value={progress.connectedCount} />
              <Metric label="Registered" value={progress.registeredCount} />
              <Metric label="Not Registered" value={progress.notRegisteredCount} />
            </div>
            {progress.connectedCount === 0 ? (
              <p className="text-sm text-secondary">No connected Karkuns yet.</p>
            ) : null}
            <Link
              to={ROUTES.RUKN_TARBIYATI_IJTEMA}
              className="inline-flex w-full items-center justify-center rounded-xl border border-primary/30 bg-surface px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 sm:w-auto"
            >
              View Registration Progress
            </Link>
          </>
        ) : null}

        <a
          href={PUBLIC_TRAINING_REGISTRATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:w-auto"
        >
          Register for Tarbiyati Ijtema
        </a>
      </div>
    </section>
  )
}
