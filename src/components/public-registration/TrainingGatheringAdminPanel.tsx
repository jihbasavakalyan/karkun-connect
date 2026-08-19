import { useEffect, useState } from 'react'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import {
  fetchTrainingRegistrationAdmin,
  markTrainingRegistrationCashPaid,
} from '@/lib/publicRegistration/client'
import { TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import type {
  TrainingRegistrationRecord,
  TrainingRegistrationSummary,
} from '@/lib/publicRegistration/types'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

export function TrainingGatheringAdminPanel() {
  const [summary, setSummary] = useState<TrainingRegistrationSummary | null>(null)
  const [registrations, setRegistrations] = useState<TrainingRegistrationRecord[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

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

  if (!summary && !error) {
    return <p className="text-sm text-secondary">Loading training gathering registrations…</p>
  }

  return (
    <section className="mb-6 rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Training Gathering — 13 Sep 2026</h2>
      <p className="mt-1 text-sm text-secondary">
        {TRAINING_GATHERING_EVENT.venue}, {TRAINING_GATHERING_EVENT.city} · ₹
        {TRAINING_GATHERING_EVENT.feeInr}
      </p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {summary ? (
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
                <tr key={row.ruknId} className="border-t border-border">
                  <td className="py-2 pr-3">{row.ruknName}</td>
                  <td className="py-2 pr-3">{row.related}</td>
                  <td className="py-2 pr-3">{row.registered}</td>
                  <td className="py-2">{row.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {registrations.filter((row) => row.paymentStatus === 'cash_pending').length > 0 ? (
        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold text-text-heading">Cash pending</h3>
          {registrations
            .filter((row) => row.paymentStatus === 'cash_pending')
            .map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="font-medium">{row.id}</p>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-muted px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold text-text-heading">{value}</p>
    </div>
  )
}
