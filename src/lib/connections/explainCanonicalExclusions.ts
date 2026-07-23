/**
 * KC-003 — Explain every repository row excluded from the Dashboard Connected KPI.
 *
 * Dashboard rule: unique Active campaign-eligible Karkuns
 * (see getCanonicalConnectedAssignments / isCampaignEligible). This is intentional —
 * not assignment row count. Muttafiqeen are excluded.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { preferNewestActive } from '@/lib/connections/activeConnectionIntegrity'
import { isCampaignEligible } from '@/lib/peopleClassification'
import type { AssignmentRecord, AssignmentStatus } from '@/types/assignment'

export type CanonicalExclusionReason =
  | 'status_not_active'
  | 'karkun_missing'
  | 'karkun_archived'
  | 'karkun_not_campaign_eligible'
  | 'duplicate_active_karkun'

export type CanonicalExclusion = {
  assignmentId: string
  assignmentNumber: string
  karkunId: string
  ruknId: string
  status: AssignmentStatus
  reason: CanonicalExclusionReason
  keptAssignmentId?: string
  keptAssignmentNumber?: string
}

export const DASHBOARD_CONNECTED_RULE =
  'Dashboard Connections counts unique Active campaign-eligible Karkuns (category=Karkun, non-archived) — not raw Firestore/assignment document count. Muttafiqeen are excluded.'

export function explainCanonicalExclusions(records: readonly AssignmentRecord[]): {
  included: AssignmentRecord[]
  exclusions: CanonicalExclusion[]
  rule: string
} {
  const exclusions: CanonicalExclusion[] = []
  const included: AssignmentRecord[] = []
  const keptByKarkun = new Map<string, AssignmentRecord>()

  // First pass: choose the survivor Active per karkun (newest), matching integrity policy.
  for (const record of records) {
    if (record.status !== 'Active') continue
    const existing = keptByKarkun.get(record.karkunId)
    if (!existing) {
      keptByKarkun.set(record.karkunId, record)
      continue
    }
    keptByKarkun.set(record.karkunId, preferNewestActive(existing, record))
  }

  for (const record of records) {
    if (record.status !== 'Active') {
      exclusions.push({
        assignmentId: record.assignmentId,
        assignmentNumber: record.assignmentNumber,
        karkunId: record.karkunId,
        ruknId: record.ruknId,
        status: record.status,
        reason: 'status_not_active',
      })
      continue
    }

    const karkun = getKarkunById(record.karkunId)
    if (!karkun) {
      exclusions.push({
        assignmentId: record.assignmentId,
        assignmentNumber: record.assignmentNumber,
        karkunId: record.karkunId,
        ruknId: record.ruknId,
        status: record.status,
        reason: 'karkun_missing',
      })
      continue
    }
    if (!isCampaignEligible(karkun)) {
      exclusions.push({
        assignmentId: record.assignmentId,
        assignmentNumber: record.assignmentNumber,
        karkunId: record.karkunId,
        ruknId: record.ruknId,
        status: record.status,
        reason: karkun.isArchived ? 'karkun_archived' : 'karkun_not_campaign_eligible',
      })
      continue
    }

    const kept = keptByKarkun.get(record.karkunId)
    if (kept && kept.assignmentId !== record.assignmentId) {
      exclusions.push({
        assignmentId: record.assignmentId,
        assignmentNumber: record.assignmentNumber,
        karkunId: record.karkunId,
        ruknId: record.ruknId,
        status: record.status,
        reason: 'duplicate_active_karkun',
        keptAssignmentId: kept.assignmentId,
        keptAssignmentNumber: kept.assignmentNumber,
      })
      continue
    }

    included.push(record)
  }

  return { included, exclusions, rule: DASHBOARD_CONNECTED_RULE }
}
