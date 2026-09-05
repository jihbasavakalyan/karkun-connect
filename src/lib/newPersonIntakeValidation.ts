import { getRuknById } from '@/data/ruknMaster'
import { getFatherHusbandLabel, type PersonGender } from '@/types/people.types'

export type NewPersonIntakeInput = {
  referredByRuknId?: string
  fatherHusbandName?: string
  address?: string
  gender?: PersonGender
}

export type NewPersonIntakeSuccess = {
  ok: true
  referredByRuknId: string
  fatherHusbandName: string
  address: string
}

export type NewPersonIntakeFailure = {
  ok: false
  error: string
}

function isBlank(value: string | undefined): boolean {
  return !value || value.trim() === ''
}

/**
 * Canonical NEW Karkun / NEW Muttafiq intake: referring Rukn + father/husband name + address.
 * Uses existing fields only (`referredByRuknId`, `fatherHusbandName`, `address`).
 */
export function validateNewPersonIntake(
  input: NewPersonIntakeInput,
): NewPersonIntakeSuccess | NewPersonIntakeFailure {
  const referredByRuknId = input.referredByRuknId?.trim() ?? ''
  if (!referredByRuknId) {
    return { ok: false, error: 'Referred By Rukn is required.' }
  }
  const referringRukn = getRuknById(referredByRuknId)
  if (!referringRukn || referringRukn.status !== 'active') {
    return { ok: false, error: 'Referring Rukn not found or inactive.' }
  }

  const fatherHusbandName = input.fatherHusbandName?.trim() ?? ''
  if (isBlank(fatherHusbandName)) {
    const label = input.gender ? getFatherHusbandLabel(input.gender) : 'Father or Husband name'
    return { ok: false, error: `${label} is required.` }
  }

  const address = input.address?.trim() ?? ''
  if (isBlank(address)) {
    return { ok: false, error: 'Address is required.' }
  }

  return {
    ok: true,
    referredByRuknId: referringRukn.id,
    fatherHusbandName,
    address,
  }
}
