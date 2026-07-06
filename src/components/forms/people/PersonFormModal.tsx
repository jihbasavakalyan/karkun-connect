import { useState, type FormEvent } from 'react'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { PersonContactInput, PersonKind } from '@/types/people.types'
import type { PersonGender, PersonStatus } from '@/types/karkun-registry.types'
import { DEFAULT_PLACE } from '@/types/people.types'

export type PersonFormValues = PersonContactInput & {
  area?: string
  address?: string
}

type PersonFormModalProps = {
  isOpen: boolean
  kind: PersonKind
  mode: 'add' | 'edit'
  initialValues?: Partial<PersonFormValues>
  onClose: () => void
  onSubmit: (values: PersonFormValues) => void
  error?: string
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function PersonFormModal({
  isOpen,
  kind,
  mode,
  initialValues,
  onClose,
  onSubmit,
  error,
}: PersonFormModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <PersonFormModalContent
      key={`${mode}-${initialValues?.name ?? 'new'}-${initialValues?.mobile ?? ''}`}
      kind={kind}
      mode={mode}
      initialValues={initialValues}
      onClose={onClose}
      onSubmit={onSubmit}
      error={error}
    />
  )
}

function PersonFormModalContent({
  kind,
  mode,
  initialValues,
  onClose,
  onSubmit,
  error,
}: Omit<PersonFormModalProps, 'isOpen'>) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [gender, setGender] = useState<PersonGender>(initialValues?.gender ?? 'Male')
  const [mobile, setMobile] = useState(initialValues?.mobile ?? '')
  const [whatsapp, setWhatsapp] = useState(initialValues?.whatsapp ?? '')
  const [place, setPlace] = useState(initialValues?.place ?? DEFAULT_PLACE)
  const [status, setStatus] = useState<PersonStatus>(initialValues?.status ?? 'active')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [area, setArea] = useState(initialValues?.area ?? '')
  const [address, setAddress] = useState(initialValues?.address ?? '')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({
      name,
      gender,
      mobile,
      whatsapp: whatsapp || undefined,
      place,
      status,
      notes: notes || undefined,
      area: kind === 'karkun' ? area : undefined,
      address: kind === 'karkun' ? address : undefined,
    })
  }

  const title =
    mode === 'add'
      ? kind === 'rukn'
        ? 'Add Rukn'
        : 'Add Karkun'
      : kind === 'rukn'
        ? 'Edit Rukn'
        : 'Edit Karkun'

  return (
    <Modal isOpen title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <InputField
          id="person-name"
          label="Full Name"
          value={name}
          onValueChange={setName}
          placeholder="Full name"
          required
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="person-gender" className="text-sm font-medium text-text-heading">
            Gender
          </label>
          <select
            id="person-gender"
            value={gender}
            onChange={(event) => setGender(event.target.value as PersonGender)}
            className={selectClassName}
            required
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <InputField
          id="person-mobile"
          label="Mobile Number"
          type="tel"
          value={mobile}
          onValueChange={setMobile}
          placeholder="+92 300 0000000"
          required
        />

        <InputField
          id="person-whatsapp"
          label="WhatsApp Number (optional)"
          type="tel"
          value={whatsapp}
          onValueChange={setWhatsapp}
          placeholder="+92 300 0000000"
        />

        <InputField
          id="person-place"
          label="Place"
          value={place}
          onValueChange={setPlace}
          placeholder={DEFAULT_PLACE}
          required
        />

        {kind === 'karkun' && (
          <>
            <InputField
              id="person-area"
              label="Area"
              value={area}
              onValueChange={setArea}
              placeholder="Area or zone"
            />
            <InputField
              id="person-address"
              label="Address"
              value={address}
              onValueChange={setAddress}
              placeholder="Full address"
            />
          </>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="person-status" className="text-sm font-medium text-text-heading">
            Status
          </label>
          <select
            id="person-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as PersonStatus)}
            className={selectClassName}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <TextAreaField
          id="person-notes"
          label="Notes (optional)"
          value={notes}
          onValueChange={setNotes}
          placeholder="Optional notes..."
          rows={3}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">{mode === 'add' ? 'Save' : 'Update'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
