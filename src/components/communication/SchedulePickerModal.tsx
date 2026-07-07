import { useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type SchedulePickerModalProps = {
  isOpen: boolean
  title?: string
  description?: string
  confirmLabel?: string
  onClose: () => void
  /** Receives the chosen schedule as an ISO 8601 timestamp. */
  onConfirm: (scheduledForIso: string) => void
}

const inputClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function currentTime(): string {
  return new Date().toTimeString().slice(0, 5)
}

export function SchedulePickerModal({
  isOpen,
  title = 'Schedule',
  description,
  confirmLabel = 'Schedule',
  onClose,
  onConfirm,
}: SchedulePickerModalProps) {
  const [date, setDate] = useState(todayIsoDate())
  const [time, setTime] = useState('')
  const [error, setError] = useState('')

  const minTime = useMemo(() => (date === todayIsoDate() ? currentTime() : undefined), [date])

  const handleConfirm = () => {
    setError('')
    if (!date) {
      setError('Please choose a date.')
      return
    }
    if (!time) {
      setError('Please choose a time.')
      return
    }

    const scheduled = new Date(`${date}T${time}`)
    if (Number.isNaN(scheduled.getTime())) {
      setError('Invalid date or time.')
      return
    }
    if (scheduled.getTime() < Date.now()) {
      setError('Scheduled time cannot be in the past.')
      return
    }

    onConfirm(scheduled.toISOString())
  }

  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <div className="space-y-4">
        {description && <p className="text-sm text-secondary">{description}</p>}

        <div className="flex flex-col gap-2">
          <label htmlFor="schedule-date" className="text-sm font-medium text-text-heading">
            📅 Date
          </label>
          <input
            id="schedule-date"
            type="date"
            className={inputClassName}
            min={todayIsoDate()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="schedule-time" className="text-sm font-medium text-text-heading">
            🕒 Time
          </label>
          <input
            id="schedule-time"
            type="time"
            className={inputClassName}
            min={minTime}
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleConfirm}>
            {confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
