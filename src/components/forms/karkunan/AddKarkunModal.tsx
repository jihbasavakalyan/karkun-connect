import { useState, type FormEvent } from 'react'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { MOBILE_INPUT_PLACEHOLDER } from '@/utils/personContactLinks'

type AddKarkunModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function AddKarkunModal({ isOpen, onClose }: AddKarkunModalProps) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [area, setArea] = useState('')
  const [address, setAddress] = useState('')
  const [remarks, setRemarks] = useState('')

  const resetForm = () => {
    setName('')
    setMobile('')
    setArea('')
    setAddress('')
    setRemarks('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    handleClose()
  }

  return (
    <Modal isOpen={isOpen} title="Add Karkun" onClose={handleClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <InputField
          id="add-karkun-name"
          label="Name"
          value={name}
          onValueChange={setName}
          placeholder="Full name"
          required
        />
        <InputField
          id="add-karkun-mobile"
          label="Mobile"
          type="tel"
          value={mobile}
          onValueChange={setMobile}
          placeholder={MOBILE_INPUT_PLACEHOLDER}
          required
        />
        <InputField
          id="add-karkun-area"
          label="Area"
          value={area}
          onValueChange={setArea}
          placeholder="Area or zone"
          required
        />
        <InputField
          id="add-karkun-address"
          label="Address"
          value={address}
          onValueChange={setAddress}
          placeholder="Full address"
        />
        <TextAreaField
          id="add-karkun-remarks"
          label="Remarks"
          value={remarks}
          onValueChange={setRemarks}
          placeholder="Optional notes..."
          rows={3}
        />

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={handleClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Add Karkun</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
