import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS, FORM_SELECT_CLASS } from '@/components/ui/formStyles'
import type { AssignmentReviewReason } from '@/types/assignmentReview.types'

/** KC-0129 — Review dialog actions; Convert is UI-only routing to existing conversion request. */
export type RequestReviewModalAction = AssignmentReviewReason | 'Convert to Muttafiq'

const REVIEW_REASONS: AssignmentReviewReason[] = [
  'Needs attention',
  'Unable to continue',
  'Wrong assignment',
  'Shifted area',
  'Personal reason',
  'Other',
]

const REASON_DISPLAY_LABELS: Record<AssignmentReviewReason, string> = {
  'Needs attention': 'Needs Attention',
  'Unable to continue': 'Unable to Continue',
  'Wrong assignment': 'Wrong Connection',
  'Shifted area': 'Shifted Area',
  'Personal reason': 'Personal Reason',
  Other: 'Other',
}

const CONVERT_ACTION = 'Convert to Muttafiq' as const

type RequestReviewModalProps = {
  isOpen: boolean
  karkunName: string
  onClose: () => void
  onConfirm: (action: RequestReviewModalAction, notes: string) => void
  error?: string
  /** When true, Reason list includes Convert to Muttafiq (existing conversion workflow). */
  allowConvertToMuttafiq?: boolean
  confirmBusy?: boolean
}

export function RequestReviewModal({
  isOpen,
  karkunName,
  onClose,
  onConfirm,
  error,
  allowConvertToMuttafiq = false,
  confirmBusy = false,
}: RequestReviewModalProps) {
  const [action, setAction] = useState<RequestReviewModalAction>('Needs attention')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setAction('Needs attention')
    setNotes('')
  }, [isOpen])

  const isConvert = action === CONVERT_ACTION

  return (
    <Modal
      isOpen={isOpen}
      title="Request Review"
      onClose={onClose}
      size="md"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose} disabled={confirmBusy}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            loading={confirmBusy}
            disabled={confirmBusy}
            onClick={() => onConfirm(action, notes)}
          >
            {isConvert ? 'Submit Conversion Request' : 'Submit Request'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-secondary">
          {isConvert ? (
            <>
              Request converting{' '}
              <span className="font-semibold text-text-heading">{karkunName}</span> to Muttafiq.
              Admin Inbox and approval stay the same.
            </>
          ) : (
            <>
              Ask an Administrator to review the connection for{' '}
              <span className="font-semibold text-text-heading">{karkunName}</span>. Ownership does
              not change until Admin decides.
            </>
          )}
        </p>

        <label className="block">
          <span className={FORM_LABEL_CLASS}>Reason</span>
          <select
            className={FORM_SELECT_CLASS}
            value={action}
            onChange={(event) => setAction(event.target.value as RequestReviewModalAction)}
            disabled={confirmBusy}
          >
            {REVIEW_REASONS.map((option) => (
              <option key={option} value={option}>
                {REASON_DISPLAY_LABELS[option]}
              </option>
            ))}
            {allowConvertToMuttafiq ? (
              <option value={CONVERT_ACTION}>{CONVERT_ACTION}</option>
            ) : null}
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
            disabled={confirmBusy}
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </Modal>
  )
}
