import { useState, type FormEvent } from 'react'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { Modal, ModalFormFooter, ModalFormGrid, ModalFormSection } from '@/components/common'
import { MOBILE_INPUT_PLACEHOLDER } from '@/utils/personContactLinks'

type AddKarkunModalProps = {
  isOpen: boolean
  onClose: () => void
}

const ADD_KARKUN_FORM_ID = 'add-karkun-form'

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
    <Modal
      isOpen={isOpen}
      title="Add Karkun"
      onClose={handleClose}
      footer={
        <ModalFormFooter
          onCancel={handleClose}
          primaryLabel="Add Karkun"
          primaryType="submit"
          formId={ADD_KARKUN_FORM_ID}
        />
      }
    >
      <form id={ADD_KARKUN_FORM_ID} className="space-y-6" onSubmit={handleSubmit}>
        <ModalFormSection title="Basic Information">
          <ModalFormGrid>
            <InputField
              id="add-karkun-name"
              label="Name"
              value={name}
              onValueChange={setName}
              placeholder="Full name"
              required
            />
          </ModalFormGrid>
        </ModalFormSection>

        <ModalFormSection title="Contact Information">
          <ModalFormGrid>
            <InputField
              id="add-karkun-mobile"
              label="Mobile"
              type="tel"
              value={mobile}
              onValueChange={setMobile}
              placeholder={MOBILE_INPUT_PLACEHOLDER}
              required
            />
          </ModalFormGrid>
        </ModalFormSection>

        <ModalFormSection title="Additional Information">
          <ModalFormGrid>
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
            <div className="md:col-span-2">
              <TextAreaField
                id="add-karkun-remarks"
                label="Remarks"
                value={remarks}
                onValueChange={setRemarks}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>
          </ModalFormGrid>
        </ModalFormSection>
      </form>
    </Modal>
  )
}
