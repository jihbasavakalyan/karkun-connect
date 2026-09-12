import { useEffect, useMemo, useState } from 'react'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import {
  confirmTrainingRegistrationUpiPaid,
  fetchTrainingRegistrationAdmin,
  markTrainingRegistrationCashPaid,
  setTrainingOnlinePaymentEnabled,
} from '@/lib/publicRegistration/client'
import { TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import {
  matchesAdminPeopleDirectoryFilters,
  matchesAdminPeopleDirectorySearch,
  paymentQueueTitle,
} from '@/lib/publicRegistration/adminTracking'
import { downloadTrainingAdminPeopleExcel } from '@/lib/publicRegistration/peopleDirectoryExcel'
import {
  trainingOrganisationalCategoryLabel,
  trainingPaymentMethodLabel,
  trainingPaymentStatusLabel,
  trainingRegistrationStatusLabel,
} from '@/lib/publicRegistration/labels'
import type {
  PublicPersonGender,
  TrainingAdminRegistrationFilter,
  TrainingAdminSearchPerson,
  TrainingOrganisationalCategory,
  TrainingPaymentMethod,
  TrainingPaymentStatus,
  TrainingRegistrationAdminRow,
  TrainingRegistrationSummary,
  TrainingRuknRelatedPersonView,
} from '@/lib/publicRegistration/types'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Modal } from '@/components/common/Modal'
import { InboxAccordionSection } from '@/components/inbox/InboxAccordionSection'
import { StatusBadge } from '@/components/ui'

type PeopleFilters = {
  category: Extract<TrainingOrganisationalCategory, 'karkun' | 'muttafiq'> | ''
  gender: PublicPersonGender
  registration: TrainingAdminRegistrationFilter | ''
  paymentMethod: Exclude<TrainingPaymentMethod, 'online'> | ''
  paymentStatus: Extract<
    TrainingPaymentStatus,
    'cash_pending' | 'paid_cash' | 'upi_pending' | 'paid_upi'
  > | ''
}

const EMPTY_FILTERS: PeopleFilters = {
  category: '',
  gender: '',
  registration: '',
  paymentMethod: '',
  paymentStatus: '',
}

export function TrainingGatheringAdminPanel() {
  const [summary, setSummary] = useState<TrainingRegistrationSummary | null>(null)
  const [registrations, setRegistrations] = useState<TrainingRegistrationAdminRow[]>([])
  const [peopleDirectory, setPeopleDirectory] = useState<TrainingAdminSearchPerson[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<PeopleFilters>(EMPTY_FILTERS)
  const [expandedRuknId, setExpandedRuknId] = useState('')
  const [expandedPersonId, setExpandedPersonId] = useState('')
  const [cashMarkPaidTarget, setCashMarkPaidTarget] = useState<TrainingRegistrationAdminRow | null>(null)
  const [selectedCollectorId, setSelectedCollectorId] = useState('')
  const [onlineBusy, setOnlineBusy] = useState(false)
  const [openQueue, setOpenQueue] = useState('')

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
      setPeopleDirectory(result.peopleDirectory)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load registrations.')
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const confirmUpi = (registrationId: string) =>
    withAdminToken(
      registrationId,
      (token) => confirmTrainingRegistrationUpiPaid({ token, registrationId }),
      'Unable to confirm UPI payment.',
    )

  const markCashPaid = (registrationId: string, cashPaidToId: string) =>
    withAdminToken(
      registrationId,
      (token) => markTrainingRegistrationCashPaid({ token, registrationId, cashPaidToId }),
      'Unable to mark cash payment as paid.',
    )

  const cashCollectors = useMemo(() => {
    if (summary?.cashCollectors && summary.cashCollectors.length > 0) {
      return summary.cashCollectors
    }
    if (summary?.ruknWise) {
      return summary.ruknWise
        .map((r) => ({ id: r.ruknId, name: r.ruknName }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }
    return []
  }, [summary])

  const setOnlinePayment = async (onlinePaymentEnabled: boolean) => {
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (!token) return
    setOnlineBusy(true)
    try {
      await setTrainingOnlinePaymentEnabled({ token, onlinePaymentEnabled })
      await load()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update online payment.')
    } finally {
      setOnlineBusy(false)
    }
  }

  const registrationById = useMemo(() => {
    const map = new Map<string, TrainingRegistrationAdminRow>()
    for (const row of registrations) map.set(row.id, row)
    return map
  }, [registrations])

  const registeredPeople = useMemo(
    () => [...registrations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [registrations],
  )
  const displayedPeople = useMemo(() => {
    if (!peopleDirectory) return []
    return peopleDirectory.filter(
      (row) =>
        matchesAdminPeopleDirectorySearch(row, search) &&
        matchesAdminPeopleDirectoryFilters(row, filters),
    )
  }, [peopleDirectory, search, filters])

  const exportExcel = () => {
    if (!peopleDirectory) {
      setError('People directory is still loading.')
      return
    }
    setExporting(true)
    try {
      downloadTrainingAdminPeopleExcel(displayedPeople)
      setError('')
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export Excel.')
    } finally {
      setExporting(false)
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedPersonId('')
  }, [search, filters])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (search.trim()) setOpenQueue('people')
  }, [search])

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

  const toggleQueue = (id: string) => {
    setOpenQueue((current) => (current === id ? '' : id))
  }

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
            Razorpay remains deferred. Online Payment uses the official UPI QR.
          </p>
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-text-heading">Online Payment</p>
              <p className="text-xs text-secondary">
                {summary.onlinePaymentEnabled === false
                  ? 'Currently unavailable to public registrants.'
                  : 'Public registrants can pay ₹100 using UPI.'}
              </p>
            </div>
            <PrimaryButton
              type="button"
              disabled={onlineBusy}
              onClick={() => void setOnlinePayment(summary.onlinePaymentEnabled === false)}
            >
              {onlineBusy
                ? 'Saving…'
                : summary.onlinePaymentEnabled === false
                  ? 'Enable Online Payment'
                  : 'Disable Online Payment'}
            </PrimaryButton>
          </div>
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
        <div className="mt-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-secondary">
              Registered People (Total: {summary.registered})
            </p>
            <PrimaryButton
              type="button"
              disabled={exporting || !peopleDirectory}
              onClick={exportExcel}
            >
              {exporting ? 'Exporting…' : 'Export Excel'}
            </PrimaryButton>
          </div>
          <p className="text-xs text-secondary">
            Search eligible Karkun and Muttafiq by name, mobile, or person ID. Registration status
            shows who is already registered. Export Excel downloads the currently filtered people
            list.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block sm:col-span-2 lg:col-span-3">
                <span className="mb-1 block text-xs font-medium text-secondary">
                  Search name, mobile, person ID, registration ID, UTR, or cash collector
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  placeholder="Search Karkun and Muttafiq"
                  aria-label="Search Karkun and Muttafiq"
                />
              </label>
              <FilterSelect
                label="Category"
                value={filters.category}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    category: value as PeopleFilters['category'],
                  }))
                }
                options={[
                  { value: '', label: 'All categories' },
                  { value: 'karkun', label: 'Karkun' },
                  { value: 'muttafiq', label: 'Muttafiq' },
                ]}
              />
              <FilterSelect
                label="Registration"
                value={filters.registration}
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    registration: value as PeopleFilters['registration'],
                  }))
                }
                options={[
                  { value: '', label: 'All' },
                  { value: 'registered', label: 'Registered' },
                  { value: 'not_registered', label: 'Not Registered' },
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
          <InboxAccordionSection
            title="People"
            count={peopleDirectory ? displayedPeople.length : 0}
            open={openQueue === 'people'}
            onToggle={() => toggleQueue('people')}
          >
            {!peopleDirectory ? (
              <p className="mt-3 text-sm text-secondary">Loading people directory…</p>
            ) : displayedPeople.length === 0 ? (
              <p className="mt-3 text-sm text-secondary">No people match the current view.</p>
            ) : (
              <div className="mt-3">
                <div className="mb-1 hidden grid-cols-[1.25rem_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_auto] gap-3 px-3 text-xs font-medium text-secondary sm:grid">
                  <span className="sr-only">Details</span>
                  <span>Name</span>
                  <span>Mobile</span>
                  <span>Person ID</span>
                  <span>Status</span>
                </div>
                <ul className="max-h-[min(70vh,40rem)] space-y-2 overflow-y-auto">
                  {displayedPeople.map((row) => (
                    <DirectoryPersonRow
                      key={row.personId}
                      row={row}
                      registration={
                        row.registrationId ? registrationById.get(row.registrationId) : undefined
                      }
                      expanded={expandedPersonId === row.personId}
                      onToggle={() =>
                        setExpandedPersonId((current) =>
                          current === row.personId ? '' : row.personId,
                        )
                      }
                    />
                  ))}
                </ul>
              </div>
            )}
          </InboxAccordionSection>

          <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-secondary">
            Payment queues
          </h3>
          <InboxAccordionSection
            title="Cash Pending"
            count={cashPending.length}
            open={openQueue === 'cash_pending'}
            onToggle={() => toggleQueue('cash_pending')}
          >
            <PaymentQueue
              title="Cash Pending"
              rows={cashPending}
              actionLabel="Mark Paid"
              busyId={busyId}
              onAction={(id) => {
                const target = cashPending.find((row) => row.id === id)
                if (target) {
                  setCashMarkPaidTarget(target)
                  setSelectedCollectorId(target.cashPaidToId || '')
                }
              }}
              showCashCollector
            />
          </InboxAccordionSection>
          <InboxAccordionSection
            title="Cash Paid"
            count={cashPaid.length}
            open={openQueue === 'cash_paid'}
            onToggle={() => toggleQueue('cash_paid')}
          >
            <PaymentQueue title="Cash Paid" rows={cashPaid} showCashCollector />
          </InboxAccordionSection>
          <InboxAccordionSection
            title="UPI Pending"
            count={upiPending.length}
            open={openQueue === 'upi_pending'}
            onToggle={() => toggleQueue('upi_pending')}
          >
            <PaymentQueue
              title="UPI Pending"
              rows={upiPending}
              actionLabel="Confirm UPI Paid"
              busyId={busyId}
              onAction={(id) => void confirmUpi(id)}
              showUpiEvidence
            />
          </InboxAccordionSection>
          <InboxAccordionSection
            title="UPI Paid"
            count={upiPaid.length}
            open={openQueue === 'upi_paid'}
            onToggle={() => toggleQueue('upi_paid')}
          >
            <PaymentQueue title="UPI Paid" rows={upiPaid} showUpiEvidence />
          </InboxAccordionSection>

          {summary.ruknWise.length > 0 ? (
            <InboxAccordionSection
              title="Rukn tracking"
              count={summary.ruknWise.length}
              open={openQueue === 'rukn_tracking'}
              onToggle={() => toggleQueue('rukn_tracking')}
            >
              <div className="overflow-x-auto">
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
            </InboxAccordionSection>
          ) : null}
        </div>
      ) : null}

      {cashMarkPaidTarget ? (
        <Modal
          isOpen={Boolean(cashMarkPaidTarget)}
          title="Confirm Cash Payment"
          onClose={() => {
            if (!busyId) {
              setCashMarkPaidTarget(null)
              setSelectedCollectorId('')
            }
          }}
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <SecondaryButton
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => {
                  setCashMarkPaidTarget(null)
                  setSelectedCollectorId('')
                }}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton
                type="button"
                disabled={!selectedCollectorId || Boolean(busyId)}
                onClick={async () => {
                  if (!selectedCollectorId || !cashMarkPaidTarget) return
                  const targetId = cashMarkPaidTarget.id
                  const collectorId = selectedCollectorId
                  await markCashPaid(targetId, collectorId)
                  setCashMarkPaidTarget(null)
                  setSelectedCollectorId('')
                }}
              >
                {busyId === cashMarkPaidTarget.id ? 'Saving…' : 'Mark Paid'}
              </PrimaryButton>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-surface-muted p-3 text-sm">
              <p className="font-semibold text-text-heading">{cashMarkPaidTarget.fullName}</p>
              <p className="text-xs text-secondary">Registration ID: {cashMarkPaidTarget.id}</p>
              <p className="text-xs text-secondary">Mobile: {cashMarkPaidTarget.verifiedMobile}</p>
              <p className="mt-1 font-medium text-text-heading">
                Registration Fee: ₹{TRAINING_GATHERING_EVENT.feeInr}
              </p>
            </div>

            <div>
              <label
                htmlFor="admin-cash-paid-to-select"
                className="mb-1 block text-sm font-medium text-text-heading"
              >
                Cash paid to:
              </label>
              <select
                id="admin-cash-paid-to-select"
                value={selectedCollectorId}
                onChange={(event) => setSelectedCollectorId(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              >
                <option value="">Select Person</option>
                {cashCollectors.map((collector) => (
                  <option key={collector.id} value={collector.id}>
                    {collector.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCollectorId ? (
              <p className="text-xs text-secondary">
                Selected collector:{' '}
                <strong className="text-text-heading">
                  {cashCollectors.find((c) => c.id === selectedCollectorId)?.name || selectedCollectorId}
                </strong>
              </p>
            ) : null}
          </div>
        </Modal>
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
  showCashCollector = false,
}: {
  title: string
  rows: TrainingRegistrationAdminRow[]
  actionLabel?: string
  busyId?: string
  onAction?: (registrationId: string) => void
  showUpiEvidence?: boolean
  showCashCollector?: boolean
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
                {showCashCollector && row.cashPaidToName ? (
                  <p className="text-xs text-secondary">Cash Paid To: {row.cashPaidToName}</p>
                ) : null}
                {showUpiEvidence && row.utr ? (
                  <p className="text-xs text-secondary">UTR: {row.utr}</p>
                ) : null}
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
        <>
          <Detail
            label="Payment Method"
            value={person.paymentMethod ? trainingPaymentMethodLabel(person.paymentMethod) : '—'}
          />
          <Detail
            label="Payment Status"
            value={
              person.paymentStatus === 'paid_cash' || person.paymentStatus === 'paid_upi' || person.paymentStatus === 'paid_online'
                ? 'Paid'
                : person.paymentStatus
                  ? trainingPaymentStatusLabel(person.paymentStatus)
                  : '—'
            }
          />
          {person.paymentMethod === 'cash' && (person.paymentStatus === 'paid_cash' || person.cashPaidToName) ? (
            <Detail label="Cash Paid To" value={person.cashPaidToName || '—'} />
          ) : null}
        </>
      ) : null}
    </dl>
  )
}

function DirectoryPersonRow({
  row,
  registration,
  expanded,
  onToggle,
}: {
  row: TrainingAdminSearchPerson
  registration?: TrainingRegistrationAdminRow
  expanded: boolean
  onToggle: () => void
}) {
  const name = row.name || 'Name is not on this person record'
  const mobile = row.mobile || '—'
  const detailId = `directory-person-detail-${row.personId}`
  return (
    <li
      className={[
        'rounded-lg border bg-surface',
        expanded ? 'border-primary ring-1 ring-primary/20' : 'border-border',
      ].join(' ')}
    >
      <button
        type="button"
        className="min-h-11 w-full min-w-0 px-3 py-2.5 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailId}
      >
        <span className="hidden min-w-0 sm:grid sm:grid-cols-[1.25rem_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_auto] sm:items-center sm:gap-3">
          <span className="text-secondary" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
          <span className="truncate font-medium text-text-heading">{name}</span>
          <span className="truncate tabular-nums text-text-heading">{mobile}</span>
          <span className="truncate text-text-heading">{row.personId}</span>
          <StatusBadge variant={row.registered ? 'success' : 'warning'}>
            {row.registered ? 'Registered' : 'Not Registered'}
          </StatusBadge>
        </span>
        <span className="flex min-w-0 items-start gap-2 sm:hidden">
          <span className="mt-0.5 w-5 shrink-0 text-secondary" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words font-medium text-text-heading">{name}</span>
            <span className="mt-0.5 block break-all text-sm tabular-nums text-text-heading">
              {mobile}
            </span>
            <span className="mt-1 block break-all text-xs text-secondary">{row.personId}</span>
            <span className="mt-2 inline-block">
              <StatusBadge variant={row.registered ? 'success' : 'warning'}>
                {row.registered ? 'Registered' : 'Not Registered'}
              </StatusBadge>
            </span>
          </span>
        </span>
        <span className="sr-only">{expanded ? 'Hide details' : 'Show details'}</span>
      </button>
      {expanded ? (
        <div id={detailId} className="border-t border-border px-3 py-3">
          {registration ? (
            <PersonDetail row={registration} />
          ) : (
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Full Name" value={name} />
              <Detail label="Person ID" value={row.personId} />
              <Detail label="Mobile" value={mobile} />
              <Detail label="Gender" value={row.gender || '—'} />
              <Detail
                label="Category"
                value={trainingOrganisationalCategoryLabel(row.organisationalCategory)}
              />
              <Detail label="Registration Status" value="Not Registered" />
              <Detail
                label="Connected Rukn"
                value={row.ruknNames.length > 0 ? row.ruknNames.join(', ') : '—'}
              />
            </dl>
          )}
        </div>
      ) : null}
    </li>
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
      <Detail
        label="Payment Status"
        value={
          row.paymentStatus === 'paid_cash' || row.paymentStatus === 'paid_upi' || row.paymentStatus === 'paid_online'
            ? 'Paid'
            : trainingPaymentStatusLabel(row.paymentStatus)
        }
      />
      <Detail label="Cash Paid To" value={row.cashPaidToName || '—'} />
      <Detail label="UTR / Transaction Reference" value={row.utr || '—'} />
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
        className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
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
