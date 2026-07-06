import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import type { KarkunRegistryRecord, KarkunVisitStatus } from '@/types/karkun-registry.types'

export type RuknAssignmentStats = {
  assignedCount: number
  pendingCount: number
  completedCount: number
}

const PENDING_VISIT_STATUSES: KarkunVisitStatus[] = ['pending', 'scheduled', 'overdue']

export function getAssignedKarkunan(ruknId: string): KarkunRegistryRecord[] {
  return MOCK_KARKUN_REGISTRY.filter(
    (karkun) => !karkun.isArchived && karkun.assignedRuknId === ruknId,
  )
}

export function getRuknAssignmentStats(ruknId: string): RuknAssignmentStats {
  const assigned = getAssignedKarkunan(ruknId)

  return {
    assignedCount: assigned.length,
    pendingCount: assigned.filter((karkun) =>
      PENDING_VISIT_STATUSES.includes(karkun.visitStatus),
    ).length,
    completedCount: assigned.filter((karkun) => karkun.visitStatus === 'completed').length,
  }
}

export function getAllRuknAssignmentStats(): Record<string, RuknAssignmentStats> {
  const stats: Record<string, RuknAssignmentStats> = {}

  for (const karkun of MOCK_KARKUN_REGISTRY) {
    if (!karkun.assignedRuknId || karkun.isArchived) {
      continue
    }

    if (!stats[karkun.assignedRuknId]) {
      stats[karkun.assignedRuknId] = {
        assignedCount: 0,
        pendingCount: 0,
        completedCount: 0,
      }
    }

    stats[karkun.assignedRuknId].assignedCount += 1

    if (PENDING_VISIT_STATUSES.includes(karkun.visitStatus)) {
      stats[karkun.assignedRuknId].pendingCount += 1
    }

    if (karkun.visitStatus === 'completed') {
      stats[karkun.assignedRuknId].completedCount += 1
    }
  }

  return stats
}
