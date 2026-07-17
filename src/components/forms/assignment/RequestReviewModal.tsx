import { useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS, FORM_SELECT_CLASS } from '@/components/ui/formStyles'
import type { AssignmentReviewReason } from '@/types/assignmentReview.types'

const REASONS: AssignmentReviewReason[] = [
  'Needs attention',
  'Unable to continue',
  'Wrong assignment',
  'Shifted area',
  'Personal reason',
  'Other',
]

type RequestReviewModalProps = {
  isOpen: boolean
  karkunName: string
  onClose: () => void
  onConfirm: (reason: AssignmentReviewReason, notes: string) => void
  error?: string
}

export function RequestReviewModal({
  isOpen,
  karkunName,
  onClose,
  onConfirm,
  error,
}: RequestReviewModalProps) {
  const [reason, setReason] = useState<AssignmentReviewReason>('Needs attention')
  const [notes, setNotes] = useState('')

  return (
    <Modal
      isOpen={isOpen}
      title="Request Review"
      onClose={onClose}
      size="md"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => onConfirm(reason, notes)}>
            Submit Request
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-secondary">
          Ask an Administrator to review the connection for{' '}
          <span className="font-semibold text-text-heading">{karkunName}</span>. Ownership does not
          change until Admin decides.
        </p>

        <label className="block">
          <span className={FORM_LABEL_CLASS}>Reason</span>
          <select
            className={FORM_SELECT_CLASS}
            value={reason}
            onChange={(event) => setReason(event.target.value as AssignmentReviewReason)}
          >
            {REASONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={FORM_LABEL_CLASS}>Notes (optional)</span>
          <textarea
            className={FORM_INPUT_CLASS}
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Share context that will help the Administrator decide."
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </Modal>
  )
}
