import { useEffect, useMemo, useState } from 'react'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import {
  confirmTrainingRegistrationUpiPaid,
  exportTrainingRegistrationCsv,
  fetchTrainingRegistrationAdmin,
  markTrainingRegistrationCashPaid,
} from '@/lib/publicRegistration/client'
import { TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import {
  matchesRegisteredPeopleFilters,
  matchesRegisteredPeopleSearch,
  paymentQueueTitle,
} from '@/lib/publicRegistration/adminTracking'
import {
  trainingOrganisationalCategoryLabel,
  trainingPaymentMethodLabel,
  trainingPaymentStatusLabel,
  trainingRegistrationStatusLabel,
} from '@/lib/publicRegistration/labels'
import type {
  PublicPersonGender,
  TrainingOrganisationalCategory,
  TrainingPaymentMethod,
  TrainingPaymentStatus,
  TrainingRegistrationAdminRow,
  TrainingRegistrationSummary,
  TrainingRuknRelatedPersonView,
} from '@/lib/publicRegistration/types'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type PeopleFilters = {
  category: TrainingOrganisationalCategory | ''
  gender: PublicPersonGender
  paymentMethod: Exclude<TrainingPaymentMethod, 'online'> | ''
  paymentStatus: Extract<
    TrainingPaymentStatus,
    'cash_pending' | 'paid_cash' | 'upi_pending' | 'paid_upi'
  > | ''
}

const EMPTY_FILTERS: PeopleFilters = {
  category: '',
  gender: '',
  paymentMethod: '',
  paymentStatus: '',
}

export function TrainingGatheringAdminPanel() {
  const [summary, setSummary] = useState<TrainingRegistrationSummary | null>(null)
  const [registrations, setRegistrations] = useState<TrainingRegistrationAdminRow[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<PeopleFilters>(EMPTY_FILTERS)
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

  const withAdminToken = async (
    registrationId: string,
    action: (token: string) => Promise<unknown>,
    failure: string,
  ) => {
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (!token) return
    setBusyId(registrationId)
    try {
      await action(token)
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : failure)
    } finally {
      setBusyId('')
    }
  }

  const markPaid = (registrationId: string) =>
    withAdminToken(
      registrationId,
      (token) => markTrainingRegistrationCashPaid({ token, registrationId }),
      'Unable to mark paid.',
    )

  const confirmUpi = (registrationId: string) =>
    withAdminToken(
      registrationId,
      (token) => confirmTrainingRegistrationUpiPaid({ token, registrationId }),
      'Unable to confirm UPI payment.',
    )

  const exportCsv = async () => {
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (!token) return
    setExporting(true)
    try {
      const result = await exportTrainingRegistrationCsv(token)
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setError('')
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export CSV.')
    } finally {
      setExporting(false)
    }
  }

  const registeredPeople = useMemo(
    () => [...registrations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [registrations],
  )
  const displayedPeople = useMemo(
    () =>
      registeredPeople.filter(
        (row) =>
          matchesRegisteredPeopleSearch(row, search) &&
          matchesRegisteredPeopleFilters(row, filters),
      ),
    [registeredPeople, search, filters],
  )
  const cashPending = useMemo(
    () => registeredPeople.filter((row) => row.paymentStatus === 'cash_pending'),
    [registeredPeople],
  )
  const cashPaid = useMemo(
    () => registeredPeople.filter((row) => row.paymentStatus === 'paid_cash'),
    [registeredPeople],
  )
  const upiPending = useMemo(
    () => registeredPeople.filter((row) => row.paymentStatus === 'upi_pending'),
    [registeredPeople],
  )
  const upiPaid = useMemo(
    () => registeredPeople.filter((row) => row.paymentStatus === 'paid_upi'),
    [registeredPeople],
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
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Registered" value={summary.registered} />
            <Stat label="Registered Male" value={summary.registeredMale} />
            <Stat label="Registered Female" value={summary.registeredFemale} />
            <Stat label="Cash Paid" value={summary.cashPaid} />
            <Stat label="Cash Pending" value={summary.cashPending} />
            <Stat label="UPI Paid" value={summary.upiPaid} />
            <Stat label="UPI Pending" value={summary.upiPending} />
          </div>
          <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-sm text-secondary">
            Razorpay / Online Gateway: Unavailable
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-secondary">
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium">Male</th>
                  <th className="py-2 pr-3 font-medium">Female</th>
                  <th className="py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {(['rukn', 'karkun', 'muttafiq', 'other'] as const).map((key) => (
                  <tr key={key} className="border-t border-border">
                    <td className="py-2 pr-3 font-medium">{trainingOrganisationalCategoryLabel(key)}</td>
                    <td className="py-2 pr-3 tabular-nums">{summary.byCategory[key].male}</td>
                    <td className="py-2 pr-3 tabular-nums">{summary.byCategory[key].female}</td>
                    <td className="py-2 tabular-nums">{summary.byCategory[key].total}</td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="py-2 pr-3 font-semibold">TOTAL</td>
                  <td className="py-2 pr-3 font-semibold tabular-nums">{summary.registeredMale}</td>
                  <td className="py-2 pr-3 font-semibold tabular-nums">{summary.registeredFemale}</td>
                  <td className="py-2 font-semibold tabular-nums">{summary.registered}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {summary ? (
        <div className="mt-6 rounded-xl border border-primary/20 bg-surface-muted/40 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-text-heading">Registered People</h3>
              <p className="text-sm text-secondary">
                Registered People (Total: {summary.registered})
              </p>
            </div>
            <PrimaryButton type="button" disabled={exporting} onClick={() => void exportCsv()}>
              {exporting ? 'Exporting…' : 'Export CSV'}
            </PrimaryButton>
          </div>
          <p className="mt-2 text-xs text-secondary">
            This list contains every completed registration. Search and filters change only what is
            displayed. CSV export always includes all registrations.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className="mb-1 block text-xs font-medium text-secondary">
                Search name, mobile, registration ID, or UTR
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="Search registered people"
              />
            </label>
            <FilterSelect
              label="Category"
              value={filters.category}
              onChange={(value) =>
                setFilters((current) => ({ ...current, category: value as PeopleFilters['category'] }))
              }
              options={[
                { value: '', label: 'All categories' },
                { value: 'rukn', label: 'Rukn' },
                { value: 'karkun', label: 'Karkun' },
                { value: 'muttafiq', label: 'Muttafiq' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <FilterSelect
              label="Gender"
              value={filters.gender}
              onChange={(value) =>
                setFilters((current) => ({ ...current, gender: value as PublicPersonGender }))
              }
              options={[
                { value: '', label: 'All genders' },
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
              ]}
            />
            <FilterSelect
              label="Payment"
              value={filters.paymentMethod}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  paymentMethod: value as PeopleFilters['paymentMethod'],
                }))
              }
              options={[
                { value: '', label: 'All payment methods' },
                { value: 'cash', label: 'Cash' },
                { value: 'upi', label: 'UPI' },
              ]}
            />
            <FilterSelect
              label="Payment status"
              value={filters.paymentStatus}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  paymentStatus: value as PeopleFilters['paymentStatus'],
                }))
              }
              options={[
                { value: '', label: 'All payment statuses' },
                { value: 'cash_pending', label: 'Cash Pending' },
                { value: 'paid_cash', label: 'Cash Paid' },
                { value: 'upi_pending', label: 'UPI Pending' },
                { value: 'paid_upi', label: 'UPI Paid' },
              ]}
            />
            <div className="flex items-end">
              <SecondaryButton type="button" onClick={() => setFilters(EMPTY_FILTERS)}>
                All
              </SecondaryButton>
            </div>
          </div>
          {displayedPeople.length === 0 ? (
            <p className="mt-3 text-sm text-secondary">No registrations match the current view.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {displayedPeople.map((row) => (
                <li key={row.id} className="rounded-lg border border-border bg-surface px-3 py-3">
                  <PersonDetail row={row} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Payment queues
        </h3>
        <PaymentQueue
          title="Cash Pending"
          rows={cashPending}
          actionLabel="Mark Paid"
          busyId={busyId}
          onAction={(id) => void markPaid(id)}
        />
        <PaymentQueue title="Cash Paid" rows={cashPaid} />
        <PaymentQueue
          title="UPI Pending"
          rows={upiPending}
          actionLabel="Confirm UPI Paid"
          busyId={busyId}
          onAction={(id) => void confirmUpi(id)}
          showUpiEvidence
        />
        <PaymentQueue title="UPI Paid" rows={upiPaid} showUpiEvidence />
      </div>

      {summary && summary.ruknWise.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <h3 className="mb-2 text-sm font-semibold text-text-heading">Rukn tracking</h3>
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
                  ruknOwnRegistered={row.ruknOwnRegistered}
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
    </section>
  )
}

function PaymentQueue({
  title,
  rows,
  actionLabel,
  busyId,
  onAction,
  showUpiEvidence = false,
}: {
  title: string
  rows: TrainingRegistrationAdminRow[]
  actionLabel?: string
  busyId?: string
  onAction?: (registrationId: string) => void
  showUpiEvidence?: boolean
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-3">
      <h4 className="text-sm font-semibold text-text-heading">
        {title}
        <span className="ml-2 font-normal text-secondary">{rows.length}</span>
      </h4>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-secondary">None.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-lg bg-surface-muted px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{paymentQueueTitle(row.paymentStatus, row.fullName)}</p>
                <p className="text-xs text-secondary">{row.id}</p>
                <p className="text-xs text-secondary">{row.verifiedMobile}</p>
                {showUpiEvidence ? (
                  <dl className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                    <Detail label="Gender" value={row.gender || '—'} />
                    <Detail
                      label="Category"
                      value={trainingOrganisationalCategoryLabel(row.organisationalCategory)}
                    />
                    <Detail label="UTR" value={row.utr || '—'} />
                    <Detail label="Payment submitted" value={row.paymentSubmittedAt || '—'} />
                    {row.ruknId ? <Detail label="Rukn ID" value={row.ruknId} /> : null}
                    {row.ruknNames.length > 0 ? (
                      <Detail label="Rukn" value={row.ruknNames.join(', ')} />
                    ) : null}
                  </dl>
                ) : null}
              </div>
              {actionLabel && onAction ? (
                <PrimaryButton
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => onAction(row.id)}
                >
                  {busyId === row.id ? 'Saving…' : actionLabel}
                </PrimaryButton>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RuknRegistrationRow({
  ruknName,
  related,
  registered,
  remaining,
  ruknOwnRegistered,
  people,
  expanded,
  onToggle,
}: {
  ruknName: string
  related: number
  registered: number
  remaining: number
  ruknOwnRegistered: boolean
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
            <div className="space-y-4">
              <p className="text-sm">
                Own Registration:{' '}
                <strong>{ruknOwnRegistered ? 'Registered' : 'Not Registered'}</strong>
              </p>
              {people.length === 0 ? (
                <p className="text-sm text-secondary">No connected Karkuns for this Rukn.</p>
              ) : (
                <>
                  <RelatedGroup title="Registered" people={registeredPeople} />
                  <RelatedGroup title="Not Registered" people={notRegisteredPeople} />
                </>
              )}
            </div>
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
      <Detail label="Name" value={person.karkunName || '—'} />
      <Detail
        label="Category"
        value={trainingOrganisationalCategoryLabel(person.organisationalCategory)}
      />
      <Detail label="Gender" value={person.gender || '—'} />
      {registered ? (
        <Detail
          label="Payment status"
          value={person.paymentStatus ? trainingPaymentStatusLabel(person.paymentStatus) : '—'}
        />
      ) : null}
    </dl>
  )
}

function PersonDetail({ row }: { row: TrainingRegistrationAdminRow }) {
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <Detail label="Full Name" value={row.fullName || 'Name is not on this registration record'} />
      <Detail label="Gender" value={row.gender || '—'} />
      <Detail
        label="Category"
        value={trainingOrganisationalCategoryLabel(row.organisationalCategory)}
      />
      <Detail label="Mobile" value={row.verifiedMobile || '—'} />
      <Detail label="Registration ID" value={row.id} />
      <Detail label="Registration Date/Time" value={row.createdAt || '—'} />
      <Detail label="Rukn Name" value={row.ruknNames.length > 0 ? row.ruknNames.join(', ') : '—'} />
      <Detail label="Rukn ID" value={row.ruknId || '—'} />
      <Detail label="Person ID" value={row.personId || '—'} />
      <Detail
        label="Registration Status"
        value={trainingRegistrationStatusLabel(row.registrationStatus)}
      />
      <Detail label="Payment Method" value={trainingPaymentMethodLabel(row.paymentMethod)} />
      <Detail label="Payment Status" value={trainingPaymentStatusLabel(row.paymentStatus)} />
      <Detail label="UTR" value={row.utr || '—'} />
      <Detail label="Payment Submitted At" value={row.paymentSubmittedAt || '—'} />
      <Detail label="Payment Verified At" value={row.paymentVerifiedAt || '—'} />
      <Detail label="Payment Verified By" value={row.paymentVerifiedBy || '—'} />
    </dl>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-secondary">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
