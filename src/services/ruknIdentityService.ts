import { ruknMaster, type Rukn } from '@/data/ruknMaster'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import {
  normalizeOfficerLoginMobile,
  type OfficerLoginCandidate,
} from '@/lib/officerMobileEligibility'

export type RuknIdentityFailureReason =
  | 'INVALID_FORMAT'
  | 'NOT_REGISTERED'
  | 'DUPLICATE_MOBILE'
  | 'LOOKUP_UNAVAILABLE'

export type EligibleRuknIdentity = Pick<Rukn, 'id' | 'mobile' | 'name'>

export type RuknIdentityLookupResult =
  | { allowed: true; rukn: EligibleRuknIdentity }
  | { allowed: false; reason: RuknIdentityFailureReason }

export const RUKN_NOT_REGISTERED_MESSAGE =
  'This mobile number is not registered as an active Rukn. Please contact the Administrator.'

export const RUKN_AUTH_VERIFICATION_FAILED_MESSAGE = 'Authentication could not be verified.'

export const RUKN_INVALID_MOBILE_MESSAGE = 'Mobile number must be exactly 10 digits.'

export const RUKN_DUPLICATE_MOBILE_MESSAGE =
  'This mobile number is associated with multiple records. Please contact the Administrator.'

export const RUKN_LOOKUP_UNAVAILABLE_MESSAGE =
  'Rukn identity lookup is temporarily unavailable. Please try again.'

export const RUKN_LOGIN_ELIGIBILITY_PATH = '/api/rukn-login-eligibility'

/** Normalize to 10-digit Indian mobile for Rukn Master lookup. */
export function normalizeRuknMobile(phone: string): string {
  const digits = normalizeMobile(phone)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2)
  }
  return digits
}

export function validateRuknMobileFormat(mobile: string): boolean {
  return isValidMobileFormat(mobile)
}

export type RuknEligibilityLookup = (mobile: string) => Promise<RuknIdentityLookupResult>

let eligibilityLookupOverride: RuknEligibilityLookup | null = null

/** Test-only — production login always uses the server eligibility API. */
export function setRuknEligibilityLookupForTests(lookup: RuknEligibilityLookup | null): void {
  eligibilityLookupOverride = lookup
}

async function requestRuknLoginEligibility(mobile: string): Promise<RuknIdentityLookupResult> {
  let response: Response
  try {
    response = await fetch(RUKN_LOGIN_ELIGIBILITY_PATH, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobile }),
    })
  } catch {
    return { allowed: false, reason: 'LOOKUP_UNAVAILABLE' }
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await response.json()) as Record<string, unknown>
  } catch {
    /* keep empty body */
  }

  if (response.status === 400 || body.reason === 'INVALID_FORMAT') {
    return { allowed: false, reason: 'INVALID_FORMAT' }
  }

  if (response.status === 503 || body.reason === 'LOOKUP_UNAVAILABLE') {
    return { allowed: false, reason: 'LOOKUP_UNAVAILABLE' }
  }

  if (!response.ok) {
    return { allowed: false, reason: 'LOOKUP_UNAVAILABLE' }
  }

  if (body.allowed === true && body.rukn && typeof body.rukn === 'object') {
    const rukn = body.rukn as Record<string, unknown>
    const id = typeof rukn.id === 'string' ? rukn.id.trim() : ''
    const storedMobile = typeof rukn.mobile === 'string' ? rukn.mobile : mobile
    const name = typeof rukn.name === 'string' && rukn.name.trim() ? rukn.name : id
    if (!id) {
      return { allowed: false, reason: 'LOOKUP_UNAVAILABLE' }
    }
    return {
      allowed: true,
      rukn: { id, mobile: storedMobile, name },
    }
  }

  if (body.reason === 'DUPLICATE_MOBILE') {
    return { allowed: false, reason: 'DUPLICATE_MOBILE' }
  }

  return { allowed: false, reason: 'NOT_REGISTERED' }
}

export async function findByMobile(mobile: string): Promise<RuknIdentityLookupResult> {
  if (!validateRuknMobileFormat(mobile)) {
    return { allowed: false, reason: 'INVALID_FORMAT' }
  }

  if (eligibilityLookupOverride) {
    return eligibilityLookupOverride(mobile)
  }

  return requestRuknLoginEligibility(mobile)
}

export function phonesMatchRukn(
  firebasePhone: string | null | undefined,
  rukn: Pick<EligibleRuknIdentity, 'mobile'>,
): boolean {
  if (!firebasePhone?.trim() || !rukn.mobile?.trim()) {
    return false
  }

  return normalizeOfficerLoginMobile(firebasePhone) === normalizeOfficerLoginMobile(rukn.mobile)
}

/** Returns normalized mobiles that map to more than one active Rukn (AUTH-03 audit). */
export function findDuplicateMobilesInMaster(
  records: readonly OfficerLoginCandidate[] = ruknMaster,
): string[] {
  const byMobile = new Map<string, number>()

  for (const rukn of records) {
    if (rukn.status !== 'active' || rukn.isArchived || !rukn.mobile?.trim()) {
      continue
    }

    const key = normalizeRuknMobile(rukn.mobile)
    byMobile.set(key, (byMobile.get(key) ?? 0) + 1)
  }

  return [...byMobile.entries()].filter(([, count]) => count > 1).map(([mobile]) => mobile)
}
