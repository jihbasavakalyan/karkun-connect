import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { ruknMaster, type Rukn } from '@/data/ruknMaster'
import {
  REMOVAL_REASON_OPTIONS,
  getRemovalReasonLabel,
  type RemovalReason,
} from '@/types/assignment'

type TransferConnectionModalProps = {
  isOpen: boolean
  karkunName: string
  currentRukn: Rukn | null
  onClose: () => void
  onSubmit: (input: {
    newRuknId: string
    effectiveFrom: string
    transferReason: RemovalReason
    remarks?: string
  }) => void | Promise<void>
  error?: string
  loading?: boolean
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function TransferConnectionModal({
  isOpen,
  karkunName,
  currentRukn,
  onClose,
  onSubmit,
  error,
  loading = false,
}: TransferConnectionModalProps) {
  const [newRuknId, setNewRuknId] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [transferReason, setTransferReason] = useState<RemovalReason>('Transferred')
  const [remarks, setRemarks] = useState('')
  const [localError, setLocalError] = useState('')

  // KC-0052: reset form whenever the dialog opens so stale target Rukn cannot no-op transfer.
  useEffect(() => {
    if (!isOpen) return
    setNewRuknId('')
    setEffectiveFrom(new Date().toISOString().slice(0, 10))
    setTransferReason('Transferred')
    setRemarks('')
    setLocalError('')
  }, [isOpen, currentRukn?.id, karkunName])

  const eligibleRukns = useMemo(
    () =>
      ruknMaster.filter(
        (rukn) =>
          rukn.status === 'active' &&
          rukn.id !== currentRukn?.id &&
          (!currentRukn?.gender || rukn.gender === currentRukn.gender),
      ),
    [currentRukn],
  )

  const handleSubmit = () => {
    const target = newRuknId.trim()
    if (!target) {
      setLocalError('Please select a new Rukn before transferring.')
      return
    }
    if (currentRukn && target === currentRukn.id) {
      setLocalError('Select a different Rukn. Transfer to the same Rukn has no effect.')
      return
    }
    if (!eligibleRukns.some((rukn) => rukn.id === target)) {
      setLocalError('Selected Rukn is not eligible for this transfer.')
      return
    }
    setLocalError('')
    void onSubmit({
      newRuknId: target,
      effectiveFrom,
      transferReason,
      remarks: remarks.trim() || undefined,
    })
  }

  if (!currentRukn) return null

  const displayError = localError || error

  return (
    <Modal
      isOpen={isOpen}
      title={`Transfer connection — ${karkunName}`}
      onClose={loading ? () => undefined : onClose}
      footer={
        <div className="flex w-full flex-col gap-3">
          {displayError ? (
            <p className="text-sm text-red-600" role="alert">
              {displayError}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <SecondaryButton type="button" onClick={onClose} disabled={loading}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              disabled={!newRuknId.trim() || loading}
              loading={loading}
              onClick={handleSubmit}
            >
              Transfer
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Transfer from <strong className="text-text-heading">{currentRukn.name}</strong> to a new
          Rukn. Visit, communication, and audit history are preserved. Future execution belongs to
          the new Rukn.
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="transfer-new-rukn" className="text-sm font-medium text-text-heading">
            New Rukn
          </label>
          <select
            id="transfer-new-rukn"
            value={newRuknId}
            onChange={(e) => {
              setNewRuknId(e.target.value)
              setLocalError('')
            }}
            className={selectClassName}
            required
            disabled={loading}
          >
            <option value="">Select Rukn…</option>
            {eligibleRukns.map((rukn) => (
              <option key={rukn.id} value={rukn.id}>
                {rukn.name}
              </option>
            ))}
          </select>
        </div>

        <InputField
          id="transfer-date"
          label="Effective From"
          type="date"
          value={effectiveFrom}
          onValueChange={setEffectiveFrom}
          required
          disabled={loading}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="transfer-reason" className="text-sm font-medium text-text-heading">
            Reason
          </label>
          <select
            id="transfer-reason"
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value as RemovalReason)}
            className={selectClassName}
            required
            disabled={loading}
          >
            {REMOVAL_REASON_OPTIONS.map((reason) => (
              <option key={reason} value={reason}>
                {getRemovalReasonLabel(reason)}
              </option>
            ))}
          </select>
        </div>

        <TextAreaField
          id="transfer-remarks"
          label="Remarks (optional)"
          value={remarks}
          onValueChange={setRemarks}
          rows={2}
          disabled={loading}
        />
      </div>
    </Modal>
  )
}
