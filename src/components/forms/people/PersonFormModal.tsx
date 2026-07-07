import { useState, type FormEvent } from 'react'
import { InputField } from '@/components/forms/InputField'
import { PersonContactActions } from '@/components/forms/people/PersonContactActions'
import { RuknAssignmentSelect } from '@/components/forms/people/RuknAssignmentSelect'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { PersonContactInput, PersonKind } from '@/types/people.types'
import type { PersonGender, PersonStatus } from '@/types/karkun-registry.types'
import { DEFAULT_PLACE, getFatherHusbandLabel } from '@/types/people.types'
import { MOBILE_INPUT_PLACEHOLDER } from '@/utils/personContactLinks'

export type PersonFormValues = PersonContactInput & {
  assignedRuknId?: string
}

type PersonFormModalProps = {
  isOpen: boolean
  kind: PersonKind
  mode: 'add' | 'edit'
  initialValues?: Partial<PersonFormValues>
  onClose: () => void
  onSubmit: (values: PersonFormValues) => void
  error?: string
  karkunId?: string
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
  karkunId,
}: PersonFormModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <PersonFormModalContent
      key={`${mode}-${initialValues?.name ?? 'new'}-${initialValues?.mobile ?? ''}-${initialValues?.assignedRuknId ?? ''}-${initialValues?.fatherHusbandName ?? ''}`}
      kind={kind}
      mode={mode}
      initialValues={initialValues}
      onClose={onClose}
      onSubmit={onSubmit}
      error={error}
      karkunId={karkunId}
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
  karkunId,
}: Omit<PersonFormModalProps, 'isOpen'>) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [gender, setGender] = useState<PersonGender>(initialValues?.gender ?? 'Male')
  const [mobile, setMobile] = useState(initialValues?.mobile ?? '')
  const [whatsapp, setWhatsapp] = useState(initialValues?.whatsapp ?? '')
  const [status, setStatus] = useState<PersonStatus>(initialValues?.status ?? 'active')
  const [assignedRuknId, setAssignedRuknId] = useState(initialValues?.assignedRuknId ?? '')
  const [fatherHusbandName, setFatherHusbandName] = useState(
    initialValues?.fatherHusbandName ?? '',
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({
      name,
      gender,
      mobile,
      whatsapp: whatsapp || undefined,
      place: DEFAULT_PLACE,
      status,
      fatherHusbandName: kind === 'karkun' ? fatherHusbandName || undefined : undefined,
      assignedRuknId: kind === 'karkun' && mode === 'edit' ? assignedRuknId : undefined,
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
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="person-name"
            label="Full Name"
            value={name}
            onValueChange={setName}
            placeholder="Full name"
            required
          />

          {kind === 'karkun' && mode === 'edit' && karkunId && (
            <div className="flex flex-col gap-2">
              <label htmlFor="person-assigned-rukn" className="text-sm font-medium text-text-heading">
                Connected Rukn
              </label>
              <RuknAssignmentSelect
                karkunId={karkunId}
                value={assignedRuknId}
                onChange={setAssignedRuknId}
              />
            </div>
          )}

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

          <InputField
            id="person-mobile"
            label="Mobile Number"
            type="tel"
            value={mobile}
            onValueChange={setMobile}
            placeholder={MOBILE_INPUT_PLACEHOLDER}
            required
          />

          <InputField
            id="person-whatsapp"
            label="WhatsApp Number"
            type="tel"
            value={whatsapp}
            onValueChange={setWhatsapp}
            placeholder={MOBILE_INPUT_PLACEHOLDER}
          />

          {kind === 'karkun' && (
            <InputField
              id="person-father-husband"
              label={`${getFatherHusbandLabel(gender)} (optional)`}
              value={fatherHusbandName}
              onValueChange={setFatherHusbandName}
              placeholder={getFatherHusbandLabel(gender)}
            />
          )}
        </div>

        {mode === 'edit' && (
          <PersonContactActions mobile={mobile} whatsapp={whatsapp} />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">{mode === 'add' ? 'Save' : 'Save Changes'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
