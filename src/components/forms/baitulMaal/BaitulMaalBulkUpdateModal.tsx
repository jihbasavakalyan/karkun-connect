import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/common/Modal'
import { InputField } from '@/components/forms/InputField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  bulkUpdateBaitulMaal,
  isBaitulMaalAmountEnabled,
} from '@/services/baitulMaalService'
import type { BaitulMaalStatus } from '@/types/baitulMaal'

type BaitulMaalBulkUpdateModalProps = {
  isOpen: boolean
  selectedCount: number
  status: BaitulMaalStatus
  onClose: () => void
  onComplete: (karkunIds: string[]) => void
  karkunIds: string[]
}

export function BaitulMaalBulkUpdateModal({
  isOpen,
  selectedCount,
  status,
  onClose,
  onComplete,
  karkunIds,
}: BaitulMaalBulkUpdateModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <BaitulMaalBulkUpdateModalContent
      key={`${status}-${selectedCount}`}
      selectedCount={selectedCount}
      status={status}
      onClose={onClose}
      onComplete={onComplete}
      karkunIds={karkunIds}
    />
  )
}

function BaitulMaalBulkUpdateModalContent({
  selectedCount,
  status,
  onClose,
  onComplete,
  karkunIds,
}: Omit<BaitulMaalBulkUpdateModalProps, 'isOpen'>) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const amountEnabled = isBaitulMaalAmountEnabled()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const result = bulkUpdateBaitulMaal({
      karkunIds,
      status,
      paymentDate: status === 'Paid' ? paymentDate : undefined,
      amount:
        amountEnabled && amount.trim() ? Number(amount) : undefined,
    })

    if (!result.success) {
      setError(result.error)
      return
    }

    onComplete(karkunIds)
    onClose()
  }

  const title =
    status === 'Paid'
      ? 'Mark Bait-ul-Maal as Paid'
      : status === 'Exempt'
        ? 'Mark Bait-ul-Maal as Exempt'
        : 'Mark Bait-ul-Maal as Pending'

  return (
    <Modal isOpen title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-secondary">
          Update current month compliance for{' '}
          <strong className="text-text-heading">{selectedCount}</strong> selected Karkuns.
        </p>

        {status === 'Paid' ? (
          <>
            <InputField
              id="bulk-baitul-maal-payment-date"
              label="Date of Contribution"
              type="date"
              value={paymentDate}
              onValueChange={setPaymentDate}
              required
            />
            {amountEnabled ? (
              <InputField
                id="bulk-baitul-maal-amount"
                label="Amount (optional)"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onValueChange={setAmount}
                placeholder="Same amount for all selected"
              />
            ) : null}
          </>
        ) : status === 'Exempt' ? (
          <p className="text-sm text-secondary">
            Selected Karkuns will be marked Exempt for the current month. No contribution date is
            required.
          </p>
        ) : (
          <p className="text-sm text-secondary">
            Selected Karkuns will be marked as Pending for the current month. Contribution date and
            amount will be cleared.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Apply to Selected</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
