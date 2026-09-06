/**
 * One person = one active Rukn. Inspect duplicates; do not guess a current
 * connection when timestamps cannot distinguish a unique newest row.
 */

import { getAllAssignments } from '@/stores/assignmentStore'
import { getAllMuttafiqRelationships } from '@/stores/muttafiqRelationshipStore'
import type { AssignmentRecord } from '@/types/assignment'
import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'

export type UniqueNewestPick<T> =
  | { status: 'none' }
  | { status: 'one'; current: T }
  | { status: 'ambiguous'; candidates: T[] }

export type DuplicateActiveRuknReport = {
  personId: string
  kind: 'assignment' | 'muttafiq'
  activeCount: number
  ruknIds: string[]
  resolvable: boolean
}

function stamp(row: { createdAt: string; updatedAt?: string }): number {
  const updated = Date.parse(row.updatedAt || '') || 0
  const created = Date.parse(row.createdAt || '') || 0
  return updated > 0 ? updated : created
}

export function pickUniqueNewestActive<T extends { createdAt: string; updatedAt?: string }>(
  rows: readonly T[],
): UniqueNewestPick<T> {
  if (rows.length === 0) return { status: 'none' }
  if (rows.length === 1) return { status: 'one', current: rows[0]! }

  const ranked = [...rows].sort((a, b) => stamp(b) - stamp(a))
  const first = ranked[0]!
  const second = ranked[1]!
  if (stamp(first) === stamp(second)) {
    return { status: 'ambiguous', candidates: [...rows] }
  }
  return { status: 'one', current: first }
}

export function inspectDuplicateActiveAssignments(
  records: readonly AssignmentRecord[] = getAllAssignments(),
): DuplicateActiveRuknReport[] {
  const byPerson = new Map<string, AssignmentRecord[]>()
  for (const record of records) {
    if (record.status !== 'Active') continue
    const personId = record.karkunId.trim()
    if (!personId) continue
    const list = byPerson.get(personId) ?? []
    list.push(record)
    byPerson.set(personId, list)
  }
  const reports: DuplicateActiveRuknReport[] = []
  for (const [personId, group] of byPerson) {
    if (group.length < 2) continue
    const pick = pickUniqueNewestActive(group)
    reports.push({
      personId,
      kind: 'assignment',
      activeCount: group.length,
      ruknIds: [...new Set(group.map((row) => row.ruknId))],
      resolvable: pick.status === 'one',
    })
  }
  return reports
}

export function inspectDuplicateActiveMuttafiqLinks(
  rows: readonly MuttafiqRuknRelationship[] = getAllMuttafiqRelationships(),
): DuplicateActiveRuknReport[] {
  const byPerson = new Map<string, MuttafiqRuknRelationship[]>()
  for (const row of rows) {
    if (row.status !== 'Active') continue
    const personId = row.personId.trim()
    if (!personId) continue
    const list = byPerson.get(personId) ?? []
    list.push(row)
    byPerson.set(personId, list)
  }
  const reports: DuplicateActiveRuknReport[] = []
  for (const [personId, group] of byPerson) {
    if (group.length < 2) continue
    const pick = pickUniqueNewestActive(group)
    reports.push({
      personId,
      kind: 'muttafiq',
      activeCount: group.length,
      ruknIds: [...new Set(group.map((row) => row.ruknId))],
      resolvable: pick.status === 'one',
    })
  }
  return reports
}

export function currentMuttafiqRuknLabel(activeLinks: readonly MuttafiqRuknRelationship[]): {
  label: string | null
  needsReview: boolean
} {
  const pick = pickUniqueNewestActive(activeLinks)
  if (pick.status === 'none') return { label: null, needsReview: false }
  if (pick.status === 'ambiguous') return { label: null, needsReview: true }
  return { label: pick.current.ruknName || pick.current.ruknId, needsReview: false }
}
