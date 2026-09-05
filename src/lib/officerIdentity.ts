/**
 * Shared officer identity helpers for Rukn (`R###`) and A Rukn (`AR##`).
 * JWT role remains `rukn` for both; category is document id + `officerKind`.
 * No `@/` imports — Vercel claims provisioner may load this file.
 */

export type OfficerKind = 'rukn' | 'a_rukn'
export type ARuknOrigin = 'promoted_karkun'

export type OfficerRuknClaims = {
  role: 'rukn'
  ruknId: string
}

const RUKN_ID_RE = /^R(\d+)$/
const ARUKN_ID_RE = /^AR(\d+)$/
const KARKUN_PERSON_ID_RE = /^kr-\d+$/i

export function parseRuknOfficerNum(id: string): number | null {
  const match = RUKN_ID_RE.exec(id.trim())
  if (!match) return null
  const num = Number.parseInt(match[1]!, 10)
  return Number.isFinite(num) && num > 0 ? num : null
}

export function parseARuknOfficerNum(id: string): number | null {
  const match = ARUKN_ID_RE.exec(id.trim())
  if (!match) return null
  const num = Number.parseInt(match[1]!, 10)
  return Number.isFinite(num) && num > 0 ? num : null
}

export function formatRuknOfficerId(num: number): string {
  return `R${String(num).padStart(3, '0')}`
}

/** AR01–AR99 pad to two digits; AR100+ uses the full decimal width. */
export function formatARuknId(num: number): string {
  if (num < 100) {
    return `AR${String(num).padStart(2, '0')}`
  }
  return `AR${num}`
}

export function isARuknId(id: string): boolean {
  return parseARuknOfficerNum(id) != null
}

export function resolveOfficerKind(officer: {
  id: string
  officerKind?: OfficerKind
}): OfficerKind {
  if (officer.officerKind === 'a_rukn' || officer.officerKind === 'rukn') {
    return officer.officerKind
  }
  return isARuknId(officer.id) ? 'a_rukn' : 'rukn'
}

export function isActiveOfficerForRuknClaims(officer: {
  status?: string
  isArchived?: boolean
}): boolean {
  return officer.status === 'active' && !officer.isArchived
}

/** Existing Rukn OTP provisioner contract — never a second JWT role. */
export function buildOfficerRuknClaims(ruknId: string): OfficerRuknClaims {
  return { role: 'rukn', ruknId }
}

export function isKrPersonId(id: string): boolean {
  return KARKUN_PERSON_ID_RE.test(id.trim())
}

export function isCompleteARuknOfficer(officer: {
  id: string
  officerKind?: OfficerKind
  origin?: ARuknOrigin
  sourcePersonId?: string
}): boolean {
  return (
    resolveOfficerKind(officer) === 'a_rukn' &&
    isARuknId(officer.id) &&
    officer.officerKind === 'a_rukn' &&
    officer.origin === 'promoted_karkun' &&
    typeof officer.sourcePersonId === 'string' &&
    isKrPersonId(officer.sourcePersonId)
  )
}
