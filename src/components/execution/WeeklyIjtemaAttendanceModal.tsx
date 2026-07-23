/**
 * KC-0080 — Weekly Ijtema attendance record/edit modal.
 */

import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'
import { useBusyAction } from '@/hooks/useBusyAction'
import {
  getCurrentIjtemaAttendance,
  updateIjtemaAttendance,
} from '@/services/ijtemaAttendanceService'
import type { IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'

const fieldClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const STATUS_OPTIONS: IjtemaAttendanceStatus[] = ['Present', 'Absent', 'Excused']

export const IJTEMA_REMARK_PRESETS = [
  'Out of station',
  'Illness',
  'Office duty',
  'Family commitment',
  'Other',
] as const

type WeeklyIjtemaAttendanceModalProps = {
  isOpen: boolean
  karkunId: string
  karkunName: string
  ruknId: string
  onClose: () => void
  onSaved?: () => void
}

export function WeeklyIjtemaAttendanceModal({
  isOpen,
  karkunId,
  karkunName,
  ruknId,
  onClose,
  onSaved,
}: WeeklyIjtemaAttendanceModalProps) {
  const { user } = useAuth()
  const { busy: saving, run } = useBusyAction()
  const current = getCurrentIjtemaAttendance(karkunId)
  const hasRecord = current.status !== 'Not recorded'

  const [status, setStatus] = useState<IjtemaAttendanceStatus>(
    hasRecord ? (current.status as IjtemaAttendanceStatus) : 'Present',
  )
  const [remarks, setRemarks] = useState(current.remarks ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const next = getCurrentIjtemaAttendance(karkunId)
    setStatus(next.status === 'Not recorded' ? 'Present' : next.status)
    setRemarks(next.remarks ?? '')
    setError('')
  }, [isOpen, karkunId])

  if (!isOpen) return null

  const handleSave = () => {
    void run(
      async () => {
        setError('')
        const result = updateIjtemaAttendance({
          karkunId,
          status,
          remarks,
          updatedBy: user?.displayName ?? user?.uid ?? ruknId,
          ruknId,
        })
        if (!result.success) {
          setError(result.error)
          return
        }
        onSaved?.()
        onClose()
      },
      { key: `ijtema-modal:${karkunId}`, waitForPendingWrites: true, minMs: 400 },
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      title={hasRecord ? 'Edit Attendance' : 'Record Attendance'}
      onClose={saving ? () => undefined : onClose}
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSave} disabled={saving} loading={saving}>
            {saving ? 'Saving…' : 'Save Attendance'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          <span className="font-medium text-text-heading">{karkunName}</span>
          {' · '}
          Week ending {current.weekLabel}
        </p>

        <fieldset>
          <legend className="text-sm font-medium text-text-heading">Status</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                disabled={saving}
                className={[
                  'rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-60',
                  status === option
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-text-heading',
                ].join(' ')}
                onClick={() => setStatus(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-heading">Remarks (optional)</label>
          <div className="flex flex-wrap gap-1.5">
            {IJTEMA_REMARK_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={saving}
                className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs text-text-heading disabled:opacity-60"
                onClick={() => setRemarks(preset === 'Other' ? '' : preset)}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            disabled={saving}
            className={fieldClass}
            placeholder="Optional remark…"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  )
}
