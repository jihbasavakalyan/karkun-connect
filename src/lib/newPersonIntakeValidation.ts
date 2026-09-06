import { getRuknById } from '@/data/ruknMaster'
import { getFatherHusbandLabel, type PersonGender } from '@/types/people.types'

export type NewPersonIntakeInput = {
  referredByRuknId?: string
  fatherHusbandName?: string
  address?: string
  gender?: PersonGender
}

export type NewPersonIntakeOptions = {
  /**
   * Rukn-submitted NEW Karkun / NEW Muttafiq: true (authenticated Rukn is the referral).
   * Pending / public-training NEW Karkun approval: true (Admin must select referring Rukn).
   * Admin-created person records: false (referral optional; do not invent).
   */
  requireReferral?: boolean
}

export type NewPersonIntakeSuccess = {
  ok: true
  referredByRuknId?: string
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
 * Canonical NEW Karkun / NEW Muttafiq intake: father/husband name + address,
 * plus referring Rukn when the authority path requires it.
 * Uses existing fields only (`referredByRuknId`, `fatherHusbandName`, `address`).
 */
export function validateNewPersonIntake(
  input: NewPersonIntakeInput,
  options?: NewPersonIntakeOptions,
): NewPersonIntakeSuccess | NewPersonIntakeFailure {
  const requireReferral = options?.requireReferral === true
  const referredByRuknId = input.referredByRuknId?.trim() ?? ''

  if (requireReferral && !referredByRuknId) {
    return { ok: false, error: 'Referred By Rukn is required.' }
  }

  let resolvedReferral: string | undefined
  if (referredByRuknId) {
    const referringRukn = getRuknById(referredByRuknId)
    if (!referringRukn || referringRukn.status !== 'active') {
      return { ok: false, error: 'Referring Rukn not found or inactive.' }
    }
    resolvedReferral = referringRukn.id
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
    referredByRuknId: resolvedReferral,
    fatherHusbandName,
    address,
  }
}
