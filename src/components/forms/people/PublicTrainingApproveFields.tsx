import { useMemo } from 'react'
import { ReferringRuknSearchField } from '@/components/forms/people/ReferringRuknSearchField'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { getRuknById } from '@/data/ruknMaster'
import { getAllRukns } from '@/lib/peopleStore'
import {
  formatReferringRuknSummary,
  listEligibleReferringRukns,
} from '@/lib/referringRukn'
import type { NewKarkunRequest } from '@/types/karkunRequest.types'
import { getPeopleRequestKind } from '@/types/karkunRequest.types'
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

export function isNewKarkunIntakeRequest(request: NewKarkunRequest): boolean {
  return getPeopleRequestKind(request) === 'new_karkun'
}

/** Selected picker value, else existing request referral. Never invents a Rukn. */
export function publicTrainingReferralValue(
  request: NewKarkunRequest,
  selectedByRequestId: Record<string, string>,
): string {
  return (selectedByRequestId[request.id] ?? request.requestingRuknId ?? '').trim()
}

export function SubmittedReferringRuknDisplay({
  request,
  referredByRuknId,
}: {
  request: NewKarkunRequest
  referredByRuknId: string
}) {
  const resolvedId = (referredByRuknId || request.requestingRuknId || '').trim()
  const rukn = resolvedId ? getRuknById(resolvedId) : undefined
  const summary = rukn
    ? formatReferringRuknSummary(rukn)
    : resolvedId
      ? `${request.requestingRuknName || resolvedId} · ${resolvedId}`
      : ''

  return (
    <p className="mt-2 text-sm text-text-heading">
      <span className="font-medium">Referred By:</span>{' '}
      {summary || 'Not submitted'}
    </p>
  )
}

/** Admin verifies / corrects referring Rukn; family/address only when public-training omitted them. */
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
    return listEligibleReferringRukns(getAllRukns(), { gender: request.gender })
  }, [request.gender])

  const selectedFallback = useMemo(() => {
    const current = getRuknById(referredByRuknId)
    return current
      ? {
          id: current.id,
          name: current.name,
          mobile: current.mobile,
          gender: current.gender,
          officerKind: current.officerKind,
          status: current.status,
          isArchived: current.isArchived,
        }
      : undefined
  }, [referredByRuknId])

  const familyMissing = !request.fatherHusbandName?.trim()
  const addressMissing = !request.address?.trim()
  const familyLabel = getFatherHusbandLabel(request.gender)
  const submitted = Boolean((request.requestingRuknId ?? '').trim())

  return (
    <div className="mt-3 space-y-2">
      <SubmittedReferringRuknDisplay request={request} referredByRuknId={referredByRuknId} />
      <ReferringRuknSearchField
        id={`pt-referred-${request.id}`}
        label={submitted ? 'Verify / correct referring Rukn' : 'Referred By Rukn *'}
        value={referredByRuknId}
        onChange={onReferredByRuknIdChange}
        options={referringRuknOptions}
        selectedFallback={selectedFallback}
        required
        disabled={disabled}
      />
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
