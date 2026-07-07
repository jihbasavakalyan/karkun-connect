import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { updateIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import type { IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'

type IjtemaAttendanceEditModalProps = {
  isOpen: boolean
  karkunId: string
  karkunName: string
  status: IjtemaAttendanceStatus | 'Not recorded'
  remarks: string
  onClose: () => void
  onSaved: () => void
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function IjtemaAttendanceEditModal({
  isOpen,
  karkunId,
  karkunName,
  status,
  remarks,
  onClose,
  onSaved,
}: IjtemaAttendanceEditModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <IjtemaAttendanceEditModalContent
      key={`${karkunId}-${status}`}
      karkunId={karkunId}
      karkunName={karkunName}
      status={status}
      remarks={remarks}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}

function IjtemaAttendanceEditModalContent({
  karkunId,
  karkunName,
  status,
  remarks,
  onClose,
  onSaved,
}: Omit<IjtemaAttendanceEditModalProps, 'isOpen'>) {
  const [recordStatus, setRecordStatus] = useState<IjtemaAttendanceStatus>(
    status === 'Not recorded' ? 'Present' : status,
  )
  const [recordRemarks, setRecordRemarks] = useState(remarks)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const result = updateIjtemaAttendance({
      karkunId,
      status: recordStatus,
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
    <Modal isOpen title="Update Weekly Ijtema Attendance" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-secondary">
          Update attendance for{' '}
          <strong className="text-text-heading">{karkunName}</strong>
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="ijtema-status" className="text-sm font-medium text-secondary">
            Attendance Status
          </label>
          <select
            id="ijtema-status"
            value={recordStatus}
            onChange={(event) =>
              setRecordStatus(event.target.value as IjtemaAttendanceStatus)
            }
            className={selectClassName}
          >
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Informed">Informed</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="ijtema-remarks" className="text-sm font-medium text-secondary">
            Remarks (optional)
          </label>
          <textarea
            id="ijtema-remarks"
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
