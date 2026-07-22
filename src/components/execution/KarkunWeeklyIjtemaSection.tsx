/**
 * KC-0080 — Weekly Ijtema on Karkun Detail (Connection Journey).
 */

import { useEffect, useState } from 'react'
import { WeeklyIjtemaAttendanceModal } from '@/components/execution/WeeklyIjtemaAttendanceModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  formatWeekLabel,
  type IjtemaAttendanceStatus,
} from '@/types/ijtemaAttendance'
import {
  getCurrentIjtemaAttendance,
  getIjtemaAttendanceHistory,
} from '@/services/ijtemaAttendanceService'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'

type KarkunWeeklyIjtemaSectionProps = {
  karkunId: string
  karkunName: string
  ruknId: string
}

export function KarkunWeeklyIjtemaSection({
  karkunId,
  karkunName,
  ruknId,
}: KarkunWeeklyIjtemaSectionProps) {
  const [tick, setTick] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    return subscribeToIjtemaAttendanceStore(() => setTick((v) => v + 1))
  }, [])

  void tick
  const current = getCurrentIjtemaAttendance(karkunId)
  const history = getIjtemaAttendanceHistory(karkunId, 5)
  const hasRecord = current.status !== 'Not recorded'

  return (
    <section className="app-screen-block rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-text-heading">Weekly Ijtema</h2>
          <p className="mt-0.5 text-xs text-secondary">Week ending {current.weekLabel}</p>
        </div>
        {hasRecord ? (
          <SecondaryButton type="button" className="px-3 py-1.5 text-sm" onClick={() => setModalOpen(true)}>
            Edit Attendance
          </SecondaryButton>
        ) : (
          <PrimaryButton type="button" className="px-3 py-1.5 text-sm" onClick={() => setModalOpen(true)}>
            Record Attendance
          </PrimaryButton>
        )}
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-secondary">Status</dt>
          <dd className="font-medium text-text-heading">
            {hasRecord ? (current.status as IjtemaAttendanceStatus) : 'Pending'}
          </dd>
        </div>
        {current.remarks ? (
          <div>
            <dt className="text-secondary">Remarks</dt>
            <dd className="font-medium text-text-heading">{current.remarks}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-text-heading">Attendance History</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-secondary">No attendance recorded yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {history.map((record) => (
              <li
                key={`${record.karkunId}-${record.weekEndingDate}`}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="text-secondary">{formatWeekLabel(record.weekEndingDate)}</span>
                <span className="font-medium text-text-heading">{record.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <WeeklyIjtemaAttendanceModal
        isOpen={modalOpen}
        karkunId={karkunId}
        karkunName={karkunName}
        ruknId={ruknId}
        onClose={() => setModalOpen(false)}
        onSaved={() => setTick((v) => v + 1)}
      />
    </section>
  )
}
