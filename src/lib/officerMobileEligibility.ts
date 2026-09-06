/**
 * Shared officer mobile matching for Rukn login eligibility and claims provision.
 * No `@/` imports — Vercel functions may load this file.
 *
 * Matches active, non-archived officers by mobile.
 * Officer kind is not filtered; JWT role stays `rukn`.
 */

import { isActiveOfficerForRuknClaims } from './officerIdentity.js'

export type OfficerLoginCandidate = {
  id: string
  mobile?: string
  name?: string
  status?: string
  isArchived?: boolean
}

export type OfficerMobileMatch =
  | { kind: 'invalid_format' }
  | { kind: 'none' }
  | { kind: 'duplicate'; count: number }
  | { kind: 'one'; officer: OfficerLoginCandidate }

/** Digits-only; strip +91 / leading 0 the same way as KC-0100.3 provisioner. */
export function normalizeOfficerLoginMobile(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

/** Existing Rukn login input rule: typed value must be exactly 10 digits. */
export function isExactTenDigitMobileInput(mobile: string): boolean {
  const digits = String(mobile ?? '')
    .trim()
    .replace(/\D/g, '')
  return digits.length === 10
}

export function matchActiveOfficersByNormalizedMobile(
  officers: readonly OfficerLoginCandidate[],
  lookupDigits: string,
): OfficerMobileMatch {
  if (lookupDigits.length !== 10) {
    return { kind: 'invalid_format' }
  }

  const matches = officers.filter(
    (officer) =>
      isActiveOfficerForRuknClaims(officer) &&
      Boolean(officer.mobile?.trim()) &&
      normalizeOfficerLoginMobile(officer.mobile) === lookupDigits,
  )

  if (matches.length === 0) {
    return { kind: 'none' }
  }
  if (matches.length > 1) {
    return { kind: 'duplicate', count: matches.length }
  }
  return { kind: 'one', officer: matches[0]! }
}

export function matchActiveOfficersByMobile(
  officers: readonly OfficerLoginCandidate[],
  rawMobile: string,
): OfficerMobileMatch {
  if (!isExactTenDigitMobileInput(rawMobile)) {
    return { kind: 'invalid_format' }
  }
  return matchActiveOfficersByNormalizedMobile(
    officers,
    normalizeOfficerLoginMobile(rawMobile),
  )
}

export function toMinimalLoginIdentity(officer: OfficerLoginCandidate): {
  id: string
  mobile: string
  name: string
} {
  return {
    id: officer.id,
    mobile: normalizeOfficerLoginMobile(officer.mobile),
    name: officer.name?.trim() || officer.id,
  }
}
