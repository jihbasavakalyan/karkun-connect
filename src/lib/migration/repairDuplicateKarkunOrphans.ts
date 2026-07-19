/**
 * KC-004D — Plan one-time repair of duplicate/orphan Karkun docs from the KC-004C race.
 *
 * Deterministic keep rule per normalized mobile:
 * 1. Prefer any id referenced by an Active assignment
 * 2. Else oldest createdAt
 * 3. Else lowest kr-* numeric id / lexicographic id
 *
 * Does not write. Callers apply deletes explicitly.
 */

import type { AssignmentRecord } from '@/types/assignment'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type DuplicateKarkunOrphanPlan = {
  groups: Array<{
    mobileKey: string
    keepId: string
    deleteIds: string[]
    reason: string
  }>
  keepIds: string[]
  deleteIds: string[]
  beforeCount: number
  afterCount: number
  nextKarkunNum: number
}

function normalizeMobileKey(mobile: string | undefined): string {
  return (mobile ?? '').replace(/\D/g, '')
}

function karkunSortKey(record: KarkunRegistryRecord): string {
  const match = /^kr-(\d+)$/i.exec(record.id)
  if (match) {
    return `0:${match[1].padStart(8, '0')}`
  }
  return `1:${record.id}`
}

function pickKeeper(
  group: KarkunRegistryRecord[],
  referencedIds: Set<string>,
): { keep: KarkunRegistryRecord; reason: string } {
  const referenced = group.filter((record) => referencedIds.has(record.id))
  if (referenced.length === 1) {
    return { keep: referenced[0], reason: 'referenced-by-active-assignment' }
  }
  if (referenced.length > 1) {
    const ordered = [...referenced].sort((a, b) => {
      const byCreated = (a.createdAt || '').localeCompare(b.createdAt || '')
      if (byCreated !== 0) return byCreated
      return karkunSortKey(a).localeCompare(karkunSortKey(b))
    })
    return { keep: ordered[0], reason: 'oldest-among-active-referenced' }
  }

  const ordered = [...group].sort((a, b) => {
    const byCreated = (a.createdAt || '').localeCompare(b.createdAt || '')
    if (byCreated !== 0) return byCreated
    return karkunSortKey(a).localeCompare(karkunSortKey(b))
  })
  return { keep: ordered[0], reason: 'oldest-created-then-lowest-id' }
}

export function planDuplicateKarkunOrphanRepair(
  karkuns: readonly KarkunRegistryRecord[],
  assignments: readonly AssignmentRecord[],
): DuplicateKarkunOrphanPlan {
  const referencedIds = new Set(
    assignments
      .filter((assignment) => assignment.status === 'Active')
      .map((assignment) => assignment.karkunId),
  )

  const byMobile = new Map<string, KarkunRegistryRecord[]>()
  const noMobile: KarkunRegistryRecord[] = []

  for (const record of karkuns) {
    const key = normalizeMobileKey(record.mobile)
    if (!key) {
      noMobile.push(record)
      continue
    }
    const list = byMobile.get(key) ?? []
    list.push(record)
    byMobile.set(key, list)
  }

  const groups: DuplicateKarkunOrphanPlan['groups'] = []
  const keepIds = new Set<string>()
  const deleteIds = new Set<string>()

  for (const [mobileKey, group] of byMobile) {
    if (group.length === 1) {
      keepIds.add(group[0].id)
      continue
    }
    const { keep, reason } = pickKeeper(group, referencedIds)
    keepIds.add(keep.id)
    const losers = group.filter((record) => record.id !== keep.id).map((record) => record.id)
    for (const id of losers) {
      deleteIds.add(id)
    }
    groups.push({
      mobileKey,
      keepId: keep.id,
      deleteIds: losers,
      reason,
    })
  }

  // Records without mobile are kept unless id collides (should not); never bulk-delete.
  for (const record of noMobile) {
    keepIds.add(record.id)
  }

  const afterRecords = karkuns.filter((record) => keepIds.has(record.id))
  const maxNum = afterRecords.reduce((max, record) => {
    const num = Number.parseInt(record.id.replace(/^kr-/i, ''), 10)
    return Number.isNaN(num) ? max : Math.max(max, num)
  }, 0)

  return {
    groups,
    keepIds: [...keepIds].sort(),
    deleteIds: [...deleteIds].sort(),
    beforeCount: karkuns.length,
    afterCount: afterRecords.length,
    nextKarkunNum: maxNum + 1,
  }
}

/** KC-004D — permanent safeguard predicate (unit-tested). */
export function shouldRefuseFullProductionSeed(options: {
  existingRegistryCount: number
  forceFullSeed?: boolean
}): boolean {
  return options.existingRegistryCount > 0 && options.forceFullSeed !== true
}
