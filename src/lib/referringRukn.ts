import { resolveOfficerKind, type OfficerKind } from '@/lib/officerIdentity'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'

export type ReferringRuknCategory = 'Rukn' | 'A Rukn'

export type ReferringRuknOption = {
  id: string
  name: string
  mobile?: string
  gender?: string
  officerKind?: OfficerKind
  status?: string
  isArchived?: boolean
}

export function isEligibleReferringRukn(rukn: {
  status?: string
  isArchived?: boolean
}): boolean {
  return rukn.status === 'active' && !rukn.isArchived
}

export function referringRuknCategoryLabel(rukn: {
  id: string
  officerKind?: OfficerKind
}): ReferringRuknCategory {
  return resolveOfficerKind(rukn) === 'a_rukn' ? 'A Rukn' : 'Rukn'
}

export function formatReferringRuknSummary(rukn: {
  id: string
  name: string
  officerKind?: OfficerKind
}): string {
  const name = formatPersonNameForDisplay(rukn.name) || rukn.id
  return `${name} · ${rukn.id} · ${referringRuknCategoryLabel(rukn)}`
}

export function matchReferringRuknQuery(
  rukn: ReferringRuknOption,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  if (rukn.id.toLowerCase().includes(normalized)) return true
  if (rukn.name.toLowerCase().includes(normalized)) return true
  const digits = normalized.replace(/\D/g, '')
  const mobileDigits = (rukn.mobile ?? '').replace(/\D/g, '')
  if (digits.length >= 3 && mobileDigits.includes(digits)) return true
  return false
}

export function listEligibleReferringRukns(
  rukns: ReferringRuknOption[],
  options?: { gender?: string },
): ReferringRuknOption[] {
  const gender = options?.gender?.trim()
  return rukns
    .filter((rukn) => isEligibleReferringRukn(rukn))
    .filter((rukn) => !gender || !rukn.gender || rukn.gender === gender)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}
