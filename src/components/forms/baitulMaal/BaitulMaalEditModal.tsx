import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/common/Modal'
import { InputField } from '@/components/forms/InputField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { updateBaitulMaal } from '@/services/baitulMaalService'
import type { BaitulMaalStatus } from '@/types/baitulMaal'

type BaitulMaalEditModalProps = {
  isOpen: boolean
  karkunId: string
  karkunName: string
  status: BaitulMaalStatus
  paymentDate: string
  amount: string
  remarks: string
  onClose: () => void
  onSaved: () => void
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function BaitulMaalEditModal({
  isOpen,
  karkunId,
  karkunName,
  status,
  paymentDate,
  amount,
  remarks,
  onClose,
  onSaved,
}: BaitulMaalEditModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <BaitulMaalEditModalContent
      key={`${karkunId}-${status}`}
      karkunId={karkunId}
      karkunName={karkunName}
      status={status}
      paymentDate={paymentDate}
      amount={amount}
      remarks={remarks}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}

function BaitulMaalEditModalContent({
  karkunId,
  karkunName,
  status,
  paymentDate,
  amount,
  remarks,
  onClose,
  onSaved,
}: Omit<BaitulMaalEditModalProps, 'isOpen'>) {
  const [recordStatus, setRecordStatus] = useState<BaitulMaalStatus>(status)
  const [recordPaymentDate, setRecordPaymentDate] = useState(paymentDate)
  const [recordAmount, setRecordAmount] = useState(amount)
  const [recordRemarks, setRecordRemarks] = useState(remarks)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const parsedAmount = recordAmount.trim() ? Number(recordAmount) : undefined
    const result = updateBaitulMaal({
      karkunId,
      status: recordStatus,
      paymentDate: recordPaymentDate,
      amount: parsedAmount,
      remarks: recordRemarks,
    })

    if (!result.success) {
      setError(result.error)
      return
    }

    onSaved()
    onClose()
  }

  return (
    <Modal isOpen title="Update Monthly Bait-ul-Maal" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-secondary">
          Update compliance for{' '}
          <strong className="text-text-heading">{karkunName}</strong>
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="baitul-maal-status" className="text-sm font-medium text-secondary">
            Status
          </label>
          <select
            id="baitul-maal-status"
            value={recordStatus}
            onChange={(event) => setRecordStatus(event.target.value as BaitulMaalStatus)}
            className={selectClassName}
          >
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <InputField
          id="baitul-maal-payment-date"
          label="Payment Date"
          type="date"
          value={recordPaymentDate}
          onValueChange={setRecordPaymentDate}
          required={recordStatus === 'Paid'}
        />

        <InputField
          id="baitul-maal-amount"
          label="Amount (optional)"
          type="number"
          min="0"
          step="0.01"
          value={recordAmount}
          onValueChange={setRecordAmount}
          placeholder="Enter amount if known"
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="baitul-maal-remarks" className="text-sm font-medium text-secondary">
            Remarks (optional)
          </label>
          <textarea
            id="baitul-maal-remarks"
            value={recordRemarks}
            onChange={(event) => setRecordRemarks(event.target.value)}
            rows={2}
            className={selectClassName}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Save</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
