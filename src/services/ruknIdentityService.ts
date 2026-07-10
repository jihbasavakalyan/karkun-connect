import { ruknMaster, type Rukn } from '@/data/ruknMaster'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'

export type RuknIdentityFailureReason = 'INVALID_FORMAT' | 'NOT_REGISTERED' | 'DUPLICATE_MOBILE'

export type RuknIdentityLookupResult =
  | { allowed: true; rukn: Rukn }
  | { allowed: false; reason: RuknIdentityFailureReason }

export const RUKN_NOT_REGISTERED_MESSAGE =
  'This mobile number is not registered with the campaign. Please contact the Administrator.'

export const RUKN_AUTH_VERIFICATION_FAILED_MESSAGE = 'Authentication could not be verified.'

export const RUKN_INVALID_MOBILE_MESSAGE = 'Mobile number must be exactly 10 digits.'

export const RUKN_DUPLICATE_MOBILE_MESSAGE =
  'This mobile number is associated with multiple records. Please contact the Administrator.'

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

export async function findByMobile(mobile: string): Promise<RuknIdentityLookupResult> {
  if (!validateRuknMobileFormat(mobile)) {
    return { allowed: false, reason: 'INVALID_FORMAT' }
  }

  const lookupDigits = normalizeRuknMobile(mobile)
  const matches = ruknMaster.filter(
    (rukn) =>
      rukn.status === 'active' &&
      rukn.mobile.trim().length > 0 &&
      normalizeRuknMobile(rukn.mobile) === lookupDigits,
  )

  if (matches.length === 0) {
    return { allowed: false, reason: 'NOT_REGISTERED' }
  }

  if (matches.length > 1) {
    return { allowed: false, reason: 'DUPLICATE_MOBILE' }
  }

  return { allowed: true, rukn: matches[0]! }
}

export function phonesMatchRukn(
  firebasePhone: string | null | undefined,
  rukn: Pick<Rukn, 'mobile'>,
): boolean {
  if (!firebasePhone?.trim() || !rukn.mobile?.trim()) {
    return false
  }

  return normalizeRuknMobile(firebasePhone) === normalizeRuknMobile(rukn.mobile)
}

/** Returns normalized mobiles that map to more than one active Rukn (AUTH-03 audit). */
export function findDuplicateMobilesInMaster(): string[] {
  const byMobile = new Map<string, number>()

  for (const rukn of ruknMaster) {
    if (rukn.status !== 'active' || !rukn.mobile.trim()) {
      continue
    }

    const key = normalizeRuknMobile(rukn.mobile)
    byMobile.set(key, (byMobile.get(key) ?? 0) + 1)
  }

  return [...byMobile.entries()].filter(([, count]) => count > 1).map(([mobile]) => mobile)
}
