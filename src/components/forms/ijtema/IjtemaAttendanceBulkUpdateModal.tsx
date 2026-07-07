import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { bulkUpdateIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import type { IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'

type IjtemaAttendanceBulkUpdateModalProps = {
  isOpen: boolean
  selectedCount: number
  status: IjtemaAttendanceStatus
  onClose: () => void
  onComplete: () => void
  karkunIds: string[]
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function IjtemaAttendanceBulkUpdateModal({
  isOpen,
  selectedCount,
  status,
  onClose,
  onComplete,
  karkunIds,
}: IjtemaAttendanceBulkUpdateModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <IjtemaAttendanceBulkUpdateModalContent
      key={`${status}-${selectedCount}`}
      selectedCount={selectedCount}
      status={status}
      onClose={onClose}
      onComplete={onComplete}
      karkunIds={karkunIds}
    />
  )
}

function IjtemaAttendanceBulkUpdateModalContent({
  selectedCount,
  status,
  onClose,
  onComplete,
  karkunIds,
}: Omit<IjtemaAttendanceBulkUpdateModalProps, 'isOpen'>) {
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const result = bulkUpdateIjtemaAttendance({
      karkunIds,
      status,
      remarks: remarks.trim() || undefined,
    })

    if (!result.success) {
      setError(result.error)
      return
    }

    onComplete()
    onClose()
  }

  const title = `Mark Ijtema ${status}`

  return (
    <Modal isOpen title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-secondary">
          Update current week attendance for{' '}
          <strong className="text-text-heading">{selectedCount}</strong> selected Karkuns as{' '}
          <strong className="text-text-heading">{status}</strong>.
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="bulk-ijtema-remarks" className="text-sm font-medium text-secondary">
            Remarks (optional)
          </label>
          <textarea
            id="bulk-ijtema-remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={2}
            className={selectClassName}
            placeholder="Same remarks for all selected"
          />
        </div>

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
