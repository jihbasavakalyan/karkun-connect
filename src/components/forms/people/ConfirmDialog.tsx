import type { ReactNode } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type ConfirmDialogProps = {
  isOpen: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="text-sm text-secondary">{message}</div>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={onConfirm}>
            {confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
