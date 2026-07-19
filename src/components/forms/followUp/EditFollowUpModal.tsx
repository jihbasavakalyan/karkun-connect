import { useState, type FormEvent } from 'react'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  updateFollowUpDetails,
  type FollowUpEditor,
} from '@/services/followUpService'

export type EditFollowUpTarget = {
  followUpId: string
  workerName: string
  purpose: string
  remarks?: string
  followUpDate: string
}

type EditFollowUpModalProps = {
  isOpen: boolean
  followUp: EditFollowUpTarget | null
  editor: FollowUpEditor | null
  onClose: () => void
  onSaved?: () => void
}

export function EditFollowUpModal({
  isOpen,
  followUp,
  editor,
  onClose,
  onSaved,
}: EditFollowUpModalProps) {
  if (!isOpen || !followUp || !editor) {
    return null
  }

  return (
    <EditFollowUpModalContent
      key={followUp.followUpId}
      followUp={followUp}
      editor={editor}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}

function EditFollowUpModalContent({
  followUp,
  editor,
  onClose,
  onSaved,
}: {
  followUp: EditFollowUpTarget
  editor: FollowUpEditor
  onClose: () => void
  onSaved?: () => void
}) {
  const [purpose, setPurpose] = useState(followUp.purpose)
  const [remarks, setRemarks] = useState(followUp.remarks ?? '')
  const [followUpDate, setFollowUpDate] = useState(followUp.followUpDate)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const result = updateFollowUpDetails(
      followUp.followUpId,
      { purpose, remarks, followUpDate },
      editor,
    )

    if ('error' in result) {
      setError(result.error)
      return
    }

    onSaved?.()
    onClose()
  }

  return (
    <Modal isOpen title="Correct follow-up" onClose={onClose} size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-secondary">
          Edit scheduled follow-up for{' '}
          <strong className="text-text-heading">{followUp.workerName}</strong>. Changes are
          saved with audit history.
        </p>

        <InputField
          id="edit-follow-up-date"
          label="Follow-up date"
          type="date"
          value={followUpDate}
          onValueChange={setFollowUpDate}
          required
        />

        <InputField
          id="edit-follow-up-purpose"
          label="Purpose"
          value={purpose}
          onValueChange={setPurpose}
          required
        />

        <TextAreaField
          id="edit-follow-up-remarks"
          label="Remarks"
          value={remarks}
          onValueChange={setRemarks}
          rows={3}
        />

        {error ? <p className="text-sm text-error">{error}</p> : null}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Save correction</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
