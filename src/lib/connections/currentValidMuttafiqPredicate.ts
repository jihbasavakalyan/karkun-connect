/**
 * Current-valid Muttafiq relationship predicate.
 * Pure: already-loaded relationship + person fields only.
 * Safe for Vite client and Vercel Node (no @/, Firebase, stores, or Vite env).
 * Campaign connections and campaign assignment fields are never consulted.
 */

export type CurrentValidMuttafiqPersonFields = {
  category?: unknown
  isArchived?: unknown
  archiveKind?: unknown
}

export type CurrentValidMuttafiqRelationshipFields = {
  status?: unknown
  personId?: unknown
}

export function isSoftRemovedPerson(data: {
  isArchived?: unknown
  archiveKind?: unknown
}): boolean {
  if (data.isArchived !== true) return false
  const kind = String(data.archiveKind || '')
  return kind === 'duplicate_merge' || kind === 'admin_delete'
}

export function organisationalCategoryFromPerson(data: {
  category?: unknown
  isArchived?: unknown
  archiveKind?: unknown
}): 'karkun' | 'muttafiq' {
  if (data.category === 'Muttafiq') return 'muttafiq'
  if (data.category === 'Karkun') return 'karkun'
  if (data.isArchived === true && !isSoftRemovedPerson(data)) return 'muttafiq'
  return 'karkun'
}

export function isCurrentValidMuttafiqPerson(
  person: CurrentValidMuttafiqPersonFields | null | undefined,
): boolean {
  if (!person) return false
  if (isSoftRemovedPerson(person)) return false
  return organisationalCategoryFromPerson(person) === 'muttafiq'
}

/**
 * Current Connected Muttafiq relationship.
 * Missing person records are not current.
 */
export function isCurrentValidMuttafiqRelationship<T extends CurrentValidMuttafiqPersonFields>(
  relationship: CurrentValidMuttafiqRelationshipFields,
  person: T | null | undefined,
): person is T {
  if (String(relationship.status || '') !== 'Active') return false
  const personId = String(relationship.personId || '').trim()
  if (!personId) return false
  return isCurrentValidMuttafiqPerson(person)
}
