import { useState, type FormEvent } from 'react'
import { InputField } from '@/components/forms/InputField'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type MobileUpdateModalProps = {
  isOpen: boolean
  personName: string
  currentMobile: string
  error?: string
  onClose: () => void
  onSubmit: (mobile: string) => void
}

export function MobileUpdateModal({
  isOpen,
  personName,
  currentMobile,
  error,
  onClose,
  onSubmit,
}: MobileUpdateModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <MobileUpdateModalContent
      key={`${personName}-${currentMobile}`}
      personName={personName}
      currentMobile={currentMobile}
      error={error}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}

function MobileUpdateModalContent({
  personName,
  currentMobile,
  error,
  onClose,
  onSubmit,
}: Omit<MobileUpdateModalProps, 'isOpen'>) {
  const [mobile, setMobile] = useState(currentMobile)
  const [localError, setLocalError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!mobile.trim()) {
      setLocalError('Cannot save empty mobile number.')
      return
    }
    setLocalError('')
    onSubmit(mobile)
  }

  const displayError = localError || error

  return (
    <Modal isOpen title="Update Mobile Number" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-secondary">
          Update mobile number for <strong className="text-text-heading">{personName}</strong>
        </p>
        <InputField
          id="update-mobile"
          label="Mobile Number"
          type="tel"
          value={mobile}
          onValueChange={setMobile}
          placeholder="+92 300 0000000"
          required
        />
        {displayError && <p className="text-sm text-red-600">{displayError}</p>}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Update Mobile</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
