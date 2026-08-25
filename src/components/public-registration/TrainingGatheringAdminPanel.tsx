import { useEffect, useMemo, useState } from 'react'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import {
  fetchTrainingRegistrationAdmin,
  markTrainingRegistrationCashPaid,
} from '@/lib/publicRegistration/client'
import { TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import {
  trainingPaymentMethodLabel,
  trainingPaymentStatusLabel,
  trainingRegistrationStatusLabel,
} from '@/lib/publicRegistration/labels'
import type {
  TrainingRegisteredPersonView,
  TrainingRegistrationAdminRow,
  TrainingRegistrationSummary,
  TrainingRuknRelatedPersonView,
} from '@/lib/publicRegistration/types'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

export function TrainingGatheringAdminPanel() {
  const [summary, setSummary] = useState<TrainingRegistrationSummary | null>(null)
  const [registrations, setRegistrations] = useState<TrainingRegistrationAdminRow[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [expandedRuknId, setExpandedRuknId] = useState('')

  const load = async () => {
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (!token) {
      setError('Administrator session required.')
      return
    }
    try {
      const result = await fetchTrainingRegistrationAdmin(token)
      setSummary(result.summary)
      setRegistrations(result.registrations)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load registrations.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const markPaid = async (registrationId: string) => {
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (!token) return
    setBusyId(registrationId)
    try {
      await markTrainingRegistrationCashPaid({ token, registrationId })
      await load()
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Unable to mark paid.')
    } finally {
      setBusyId('')
    }
  }

  const registeredPeople = useMemo(
    () => [...registrations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [registrations],
  )
  const cashPending = useMemo(
    () => registrations.filter((row) => row.paymentStatus === 'cash_pending'),
    [registrations],
  )

  if (!summary && !error) {
    return <p className="text-sm text-secondary">Loading Tarbiyati Ijtema registrations…</p>
  }

  return (
    <section className="mb-6 rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">
        {TRAINING_GATHERING_EVENT.eventTitleEn}
      </h2>
      <p className="font-urdu mt-1 text-base text-text-heading" dir="rtl">
        {TRAINING_GATHERING_EVENT.eventTitleUrdu}
      </p>
      <p className="mt-1 text-sm text-secondary">13 September 2026</p>
      <p className="text-sm text-secondary">
        {TRAINING_GATHERING_EVENT.venue}, {TRAINING_GATHERING_EVENT.city}
      </p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {summary ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Eligible" value={summary.eligible} />
            <Stat label="Registered" value={summary.registered} />
            <Stat label="Remaining" value={summary.remaining} />
            <Stat label="Online Paid" value={summary.onlinePaid} />
            <Stat label="Cash Paid" value={summary.cashPaid} />
            <Stat label="Cash Pending" value={summary.cashPending} />
            <Stat label="New Pending" value={summary.newPersonPending} />
            <Stat label="New Approved" value={summary.newPersonApproved} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GenderGroup
              title="Male"
              eligible={summary.eligibleMale}
              registered={summary.registeredMale}
              remaining={summary.remainingMale}
            />
            <GenderGroup
              title="Female"
              eligible={summary.eligibleFemale}
              registered={summary.registeredFemale}
              remaining={summary.remainingFemale}
            />
            <GenderGroup
              title="Overall"
              eligible={summary.eligible}
              registered={summary.registered}
              remaining={summary.remaining}
            />
          </div>
        </>
      ) : null}

      {summary ? (
        <div className="mt-5">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left"
            onClick={() => setPeopleOpen((open) => !open)}
            aria-expanded={peopleOpen}
          >
            <span className="text-sm font-semibold text-text-heading">
              Registered People
            </span>
            <span className="text-sm text-secondary">{summary.registered}</span>
          </button>
          {peopleOpen ? (
            registeredPeople.length === 0 ? (
              <p className="mt-2 text-sm text-secondary">No registrations yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {registeredPeople.map((row) => (
                  <li key={row.id} className="rounded-lg border border-border px-3 py-3">
                    <PersonDetail
                      person={{
                        karkunName: row.fullName,
                        gender: row.gender,
                        mobile: row.verifiedMobile,
                        registrationId: row.id,
                        ruknNames: row.ruknNames,
                        registrationStatus: row.registrationStatus,
                        paymentMethod: row.paymentMethod,
                        paymentStatus: row.paymentStatus,
                      }}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      ) : null}

      {summary && summary.ruknWise.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-secondary">
                <th className="py-2 pr-3 font-medium">Rukn</th>
                <th className="py-2 pr-3 font-medium">Related</th>
                <th className="py-2 pr-3 font-medium">Registered</th>
                <th className="py-2 font-medium">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {summary.ruknWise.map((row) => (
                <RuknRegistrationRow
                  key={row.ruknId}
                  ruknName={row.ruknName}
                  related={row.related}
                  registered={row.registered}
                  remaining={row.remaining}
                  people={row.relatedPeople}
                  expanded={expandedRuknId === row.ruknId}
                  onToggle={() =>
                    setExpandedRuknId((current) => (current === row.ruknId ? '' : row.ruknId))
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {cashPending.length > 0 ? (
        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold text-text-heading">Cash Pending</h3>
          {cashPending.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.fullName || row.id}</p>
                <p className="text-xs text-secondary">{row.id}</p>
                <p className="text-xs text-secondary">{row.verifiedMobile}</p>
              </div>
              <PrimaryButton
                type="button"
                disabled={busyId === row.id}
                onClick={() => void markPaid(row.id)}
              >
                {busyId === row.id ? 'Saving…' : 'Mark Paid'}
              </PrimaryButton>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function GenderGroup({
  title,
  eligible,
  registered,
  remaining,
}: {
  title: string
  eligible: number
  registered: number
  remaining: number
}) {
  return (
    <div className="rounded-xl border border-border px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{title}</p>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt>{title === 'Overall' ? 'Eligible' : `Eligible ${title}`}</dt>
          <dd className="font-semibold tabular-nums">{eligible}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{title === 'Overall' ? 'Registered' : `Registered ${title}`}</dt>
          <dd className="font-semibold tabular-nums">{registered}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{title === 'Overall' ? 'Remaining' : `Remaining ${title}`}</dt>
          <dd className="font-semibold tabular-nums">{remaining}</dd>
        </div>
      </dl>
    </div>
  )
}

function RuknRegistrationRow({
  ruknName,
  related,
  registered,
  remaining,
  people,
  expanded,
  onToggle,
}: {
  ruknName: string
  related: number
  registered: number
  remaining: number
  people: TrainingRuknRelatedPersonView[]
  expanded: boolean
  onToggle: () => void
}) {
  const registeredPeople = people.filter((person) => person.listStatus === 'registered')
  const notRegisteredPeople = people.filter((person) => person.listStatus === 'not_registered')
  return (
    <>
      <tr className="border-t border-border">
        <td className="py-2 pr-3">
          <button
            type="button"
            className="text-left font-medium text-primary underline-offset-2 hover:underline"
            onClick={onToggle}
            aria-expanded={expanded}
          >
            {ruknName}
          </button>
        </td>
        <td className="py-2 pr-3">{related}</td>
        <td className="py-2 pr-3">{registered}</td>
        <td className="py-2">{remaining}</td>
      </tr>
      {expanded ? (
        <tr className="border-t border-border bg-surface-muted/60">
          <td colSpan={4} className="px-3 py-3">
            {people.length === 0 ? (
              <p className="text-sm text-secondary">No connected Karkuns for this Rukn.</p>
            ) : (
              <div className="space-y-4">
                <RelatedGroup title="Registered" people={registeredPeople} />
                <RelatedGroup title="Not Registered" people={notRegisteredPeople} />
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </>
  )
}

function RelatedGroup({
  title,
  people,
}: {
  title: string
  people: TrainingRuknRelatedPersonView[]
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">{title}</h4>
      {people.length === 0 ? (
        <p className="mt-1 text-sm text-secondary">None.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {people.map((person) => (
            <li
              key={person.karkunId}
              className="rounded-lg border border-border bg-surface px-3 py-3"
            >
              <RelatedPersonDetail person={person} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RelatedPersonDetail({ person }: { person: TrainingRuknRelatedPersonView }) {
  const registered = person.listStatus === 'registered'
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      <Detail label="Karkun name" value={person.karkunName || '—'} />
      <Detail label="Gender" value={person.gender || '—'} />
      <Detail label="Mobile" value={person.mobile || '—'} />
      <Detail
        label="Registration status"
        value={registered ? 'Registered' : 'Not Registered'}
      />
      {registered ? (
        <>
          <Detail label="Registration ID" value={person.registrationId || '—'} />
          <Detail
            label="Payment method"
            value={person.paymentMethod ? trainingPaymentMethodLabel(person.paymentMethod) : '—'}
          />
          <Detail
            label="Payment status"
            value={person.paymentStatus ? trainingPaymentStatusLabel(person.paymentStatus) : '—'}
          />
        </>
      ) : null}
    </dl>
  )
}

function PersonDetail({ person }: { person: TrainingRegisteredPersonView }) {
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      <Detail label="Full name" value={person.karkunName || 'Name is not on this registration record'} />
      <Detail label="Gender" value={person.gender || '—'} />
      <Detail label="Mobile number" value={person.mobile} />
      <Detail label="Registration ID" value={person.registrationId} />
      <Detail label="Rukn" value={person.ruknNames.length > 0 ? person.ruknNames.join(', ') : '—'} />
      <Detail label="Registration status" value={trainingRegistrationStatusLabel(person.registrationStatus)} />
      <Detail label="Payment method" value={trainingPaymentMethodLabel(person.paymentMethod)} />
      <Detail label="Payment status" value={trainingPaymentStatusLabel(person.paymentStatus)} />
    </dl>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-secondary">{label}</dt>
      <dd className="break-words font-medium text-text-heading">{value}</dd>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold text-text-heading">{value}</p>
    </div>
  )
}
