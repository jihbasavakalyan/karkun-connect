import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import {
  getAssignedKarkunanForRukn,
  getRuknAssignmentEngineStats,
} from '@/lib/assignmentEngine'
import type { KarkunRegistryRecord, KarkunVisitStatus } from '@/types/karkun-registry.types'

export type RuknAssignmentStats = {
  assignedCount: number
  completedCount: number
  availableCapacity: number
}

const PENDING_VISIT_STATUSES: KarkunVisitStatus[] = ['pending', 'scheduled', 'overdue']

/** @deprecated Use pending visit count from karkun records directly if needed */
export function getRuknPendingVisitCount(ruknId: string): number {
  return getAssignedKarkunan(ruknId).filter((karkun) =>
    PENDING_VISIT_STATUSES.includes(karkun.visitStatus),
  ).length
}

export function getAssignedKarkunan(ruknId: string): KarkunRegistryRecord[] {
  return getAssignedKarkunanForRukn(ruknId)
}

export function getRuknAssignmentStats(ruknId: string): RuknAssignmentStats {
  return getRuknAssignmentEngineStats(ruknId)
}

export function getAllRuknAssignmentStats(): Record<string, RuknAssignmentStats> {
  const stats: Record<string, RuknAssignmentStats> = {}

  for (const karkun of MOCK_KARKUN_REGISTRY) {
    if (karkun.assignedRuknId && karkun.assignmentStatus === 'Assigned') {
      stats[karkun.assignedRuknId] = getRuknAssignmentEngineStats(karkun.assignedRuknId)
    }
  }

  return stats
}
