import { ruknMaster } from '@/data/ruknMaster'
import { normalizeMobile } from '@/lib/mobileValidation'
import type { AuthUser, UserRole } from '@/types/auth.types'

export type FirebaseIdentity = {
  uid: string
  email: string | null
  phoneNumber: string | null
  displayName: string | null
  customClaims: Record<string, unknown>
}

export function parseAdminEmailsFromEnv(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return []
  }

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdministratorEmail(email: string, allowlist: string[]): boolean {
  const normalized = email.trim().toLowerCase()
  return allowlist.includes(normalized)
}

export function normalizePhoneForLookup(phone: string): string {
  const digits = normalizeMobile(phone)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2)
  }
  return digits
}

export function findRuknIdByPhone(phone: string): string | null {
  const lookupDigits = normalizePhoneForLookup(phone)
  const match = ruknMaster.find(
    (rukn) =>
      rukn.status === 'active' &&
      rukn.mobile &&
      normalizePhoneForLookup(rukn.mobile) === lookupDigits,
  )
  return match?.id ?? null
}

export function toE164IndianPhone(mobile: string): string {
  const digits = normalizeMobile(mobile)
  return `+91${digits}`
}

export function formatPhoneForDisplay(phone: string | null | undefined): string | undefined {
  if (!phone) {
    return undefined
  }

  const digits = normalizeMobile(phone)
  if (digits.length !== 10) {
    return phone
  }

  return `${digits.slice(0, 5)} ${digits.slice(5)}`
}

function readClaimRole(claims: Record<string, unknown>): UserRole | null {
  const role = claims.role
  if (role === 'administrator' || role === 'rukn') {
    return role
  }
  return null
}

function readClaimRuknId(claims: Record<string, unknown>): string | undefined {
  const ruknId = claims.ruknId
  return typeof ruknId === 'string' && ruknId.trim() ? ruknId : undefined
}

/**
 * Resolves application role and Rukn scope from a Firebase identity.
 * Custom claims take precedence; local master data is used for phone lookup until M8.
 */
export function resolveAuthUser(
  identity: FirebaseIdentity,
  adminEmails: string[] = parseAdminEmailsFromEnv(import.meta.env.VITE_ADMIN_EMAILS),
): AuthUser | null {
  const claimRole = readClaimRole(identity.customClaims)
  const claimRuknId = readClaimRuknId(identity.customClaims)

  if (claimRole === 'administrator') {
    const email = identity.email?.trim().toLowerCase()
    if (!email) {
      return null
    }

    return {
      uid: identity.uid,
      email,
      role: 'administrator',
      displayName: identity.displayName ?? undefined,
    }
  }

  if (claimRole === 'rukn') {
    const ruknId = claimRuknId ?? (identity.phoneNumber ? findRuknIdByPhone(identity.phoneNumber) : null)
    if (!ruknId) {
      return null
    }

    const phone = identity.phoneNumber ? normalizePhoneForLookup(identity.phoneNumber) : undefined
    return {
      uid: identity.uid,
      email: identity.email?.trim().toLowerCase() ?? '',
      phone,
      role: 'rukn',
      ruknId,
      displayName: identity.displayName ?? undefined,
    }
  }

  const email = identity.email?.trim().toLowerCase()
  if (email && isAdministratorEmail(email, adminEmails)) {
    return {
      uid: identity.uid,
      email,
      role: 'administrator',
      displayName: identity.displayName ?? undefined,
    }
  }

  if (identity.phoneNumber) {
    const ruknId = findRuknIdByPhone(identity.phoneNumber)
    if (!ruknId) {
      return null
    }

    const phone = normalizePhoneForLookup(identity.phoneNumber)
    const rukn = ruknMaster.find((record) => record.id === ruknId)
    return {
      uid: identity.uid,
      email: email ?? '',
      phone,
      role: 'rukn',
      ruknId,
      displayName: rukn?.name ?? identity.displayName ?? undefined,
    }
  }

  return null
}

export function getAuthDisplayLabel(user: AuthUser): string {
  if (user.displayName?.trim()) {
    return user.displayName
  }
  if (user.email.trim()) {
    return user.email
  }
  if (user.phone) {
    return formatPhoneForDisplay(user.phone) ?? user.phone
  }
  return 'Signed in'
}
