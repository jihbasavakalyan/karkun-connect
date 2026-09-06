import { useMemo } from 'react'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { getAllRukns } from '@/lib/peopleStore'
import type { NewKarkunRequest } from '@/types/karkunRequest.types'
import { getFatherHusbandLabel } from '@/types/people.types'

type PublicTrainingApproveFieldsProps = {
  request: NewKarkunRequest
  referredByRuknId: string
  onReferredByRuknIdChange: (value: string) => void
  fatherHusbandName: string
  onFatherHusbandNameChange: (value: string) => void
  address: string
  onAddressChange: (value: string) => void
  disabled?: boolean
}

export function isPublicTrainingRequest(request: NewKarkunRequest): boolean {
  return request.source === 'public_training_registration'
}

/** Selected picker value, else existing request referral. Never invents a Rukn. */
export function publicTrainingReferralValue(
  request: NewKarkunRequest,
  selectedByRequestId: Record<string, string>,
): string {
  return (selectedByRequestId[request.id] ?? request.requestingRuknId ?? '').trim()
}

/** Admin must select a referring Rukn, plus any missing family/address, before approving public training. */
export function PublicTrainingApproveFields({
  request,
  referredByRuknId,
  onReferredByRuknIdChange,
  fatherHusbandName,
  onFatherHusbandNameChange,
  address,
  onAddressChange,
  disabled,
}: PublicTrainingApproveFieldsProps) {
  const referringRuknOptions = useMemo(() => {
    return getAllRukns()
      .filter((rukn) => rukn.status === 'active' && !rukn.isArchived && rukn.gender === request.gender)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [request.gender])

  const familyMissing = !request.fatherHusbandName?.trim()
  const addressMissing = !request.address?.trim()
  const familyLabel = getFatherHusbandLabel(request.gender)

  return (
    <div className="mt-3 space-y-2">
      <label className={FORM_LABEL_CLASS} htmlFor={`pt-referred-${request.id}`}>
        Referred By Rukn *
      </label>
      <select
        id={`pt-referred-${request.id}`}
        className={FORM_INPUT_CLASS}
        value={referredByRuknId}
        disabled={disabled}
        required
        onChange={(event) => onReferredByRuknIdChange(event.target.value)}
      >
        <option value="">Select referring Rukn</option>
        {referringRuknOptions.map((rukn) => (
          <option key={rukn.id} value={rukn.id}>
            {rukn.name}
          </option>
        ))}
      </select>
      {familyMissing ? (
        <>
          <label className={FORM_LABEL_CLASS} htmlFor={`pt-family-${request.id}`}>
            {familyLabel} *
          </label>
          <input
            id={`pt-family-${request.id}`}
            className={FORM_INPUT_CLASS}
            value={fatherHusbandName}
            disabled={disabled}
            required
            onChange={(event) => onFatherHusbandNameChange(event.target.value)}
          />
        </>
      ) : null}
      {addressMissing ? (
        <>
          <label className={FORM_LABEL_CLASS} htmlFor={`pt-address-${request.id}`}>
            Address *
          </label>
          <input
            id={`pt-address-${request.id}`}
            className={FORM_INPUT_CLASS}
            value={address}
            disabled={disabled}
            required
            onChange={(event) => onAddressChange(event.target.value)}
          />
        </>
      ) : null}
    </div>
  )
}
