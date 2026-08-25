import { JihLogoMark } from '@/components/public-registration/JihLogoMark'
import { TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import { PUBLIC_TRAINING_REGISTRATION_URL } from '@/lib/publicRegistration/adminTracking'

/** Authenticated Rukn Home — prominent public registration route. No extra Firestore access. */
export function TarbiyatiIjtemaRuknHero() {
  return (
    <section
      className="rounded-(--radius-card) border border-primary/25 bg-surface p-4 shadow-card"
      aria-label="Tarbiyati Ijtema registration"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="mx-auto w-20 shrink-0 sm:mx-0">
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
          <a
            href={PUBLIC_TRAINING_REGISTRATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:w-auto"
          >
            Register for Tarbiyati Ijtema
          </a>
        </div>
      </div>
    </section>
  )
}
