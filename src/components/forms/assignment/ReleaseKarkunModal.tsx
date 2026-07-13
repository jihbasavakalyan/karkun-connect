import { useState } from 'react'
import { RELEASE_REASON_OPTIONS, getReleaseReasonLabel, type ReleaseReason } from '@/types/assignment.types'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type ReleaseKarkunModalProps = {
  isOpen: boolean
  karkunName: string
  onClose: () => void
  onConfirm: (reason: ReleaseReason) => void
}

export function ReleaseKarkunModal({
  isOpen,
  karkunName,
  onClose,
  onConfirm,
}: ReleaseKarkunModalProps) {
  const [reason, setReason] = useState<ReleaseReason>('Wrong Assignment')

  return (
    <Modal
      isOpen={isOpen}
      title="Release this Karkun?"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3">
          <PrimaryButton type="button" fullWidth onClick={() => onConfirm(reason)}>
            Confirm
          </PrimaryButton>
          <SecondaryButton type="button" fullWidth onClick={onClose}>
            Cancel
          </SecondaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-secondary">
          Release <span className="font-semibold text-text-heading">{karkunName}</span>? They will
          return to the available pool.
        </p>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-text-heading">Reason</legend>
          {RELEASE_REASON_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-2"
            >
              <input
                type="radio"
                name="release-reason"
                value={option}
                checked={reason === option}
                onChange={() => setReason(option)}
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm text-text-heading">{getReleaseReasonLabel(option)}</span>
            </label>
          ))}
        </fieldset>
      </div>
    </Modal>
  )
}
