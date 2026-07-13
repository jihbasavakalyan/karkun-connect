import { useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { REMOVAL_REASON_OPTIONS, getRemovalReasonLabel } from '@/types/assignment'
import type { Rukn } from '@/data/ruknMaster'
import type { RemovalReason } from '@/types/assignment'

type RemoveAssignmentModalProps = {
  isOpen: boolean
  rukn: Rukn | null
  currentKarkunName: string
  onClose: () => void
  onSubmit: (input: {
    effectiveFrom: string
    removalReason: RemovalReason
    remarks?: string
  }) => void
  error?: string
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function RemoveAssignmentModal({
  isOpen,
  rukn,
  currentKarkunName,
  onClose,
  onSubmit,
  error,
}: RemoveAssignmentModalProps) {
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [removalReason, setRemovalReason] = useState<RemovalReason>('Temporary removal')
  const [remarks, setRemarks] = useState('')

  const handleSubmit = () => {
    onSubmit({ effectiveFrom, removalReason, remarks: remarks || undefined })
  }

  if (!rukn) return null

  return (
    <Modal
      isOpen={isOpen}
      title={`Disconnect — ${rukn.name}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSubmit}>
            Disconnect
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Disconnect <strong className="text-text-heading">{currentKarkunName}</strong> from this Rukn.
          Connection history will be preserved.
        </p>

        <InputField
          id="remove-date"
          label="Effective From"
          type="date"
          value={effectiveFrom}
          onValueChange={setEffectiveFrom}
          required
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="remove-reason" className="text-sm font-medium text-text-heading">
            Reason
          </label>
          <select
            id="remove-reason"
            value={removalReason}
            onChange={(e) => setRemovalReason(e.target.value as RemovalReason)}
            className={selectClassName}
          >
            {REMOVAL_REASON_OPTIONS.map((reason) => (
              <option key={reason} value={reason}>
                {getRemovalReasonLabel(reason)}
              </option>
            ))}
          </select>
        </div>

        <TextAreaField
          id="remove-remarks"
          label="Remarks (optional)"
          value={remarks}
          onValueChange={setRemarks}
          rows={2}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

      </div>
    </Modal>
  )
}
