import type {
  JihAppRegistrationStatus,
  KarkunRegistryRecord,
} from '@/types/karkun-registry.types'
import { getActiveRuknNames, getRuknById } from '@/data/ruknMaster'

/** Production Karkun registry — populated by production data migration. */
export const MOCK_KARKUN_REGISTRY: KarkunRegistryRecord[] = []

export function getKarkunById(id: string): KarkunRegistryRecord | undefined {
  return MOCK_KARKUN_REGISTRY.find((karkun) => karkun.id === id)
}

export function updateKarkunMeetingOutcomes(
  karkunId: string,
  outcomes: {
    currentCommitment?: string
    jihAppRegistrationStatus: JihAppRegistrationStatus
    syncJihPortal?: boolean
  },
): void {
  const karkun = getKarkunById(karkunId)
  if (!karkun) {
    return
  }

  if (outcomes.currentCommitment !== undefined) {
    karkun.currentCommitment = outcomes.currentCommitment
    karkun.commitment = outcomes.currentCommitment || null
  }

  karkun.jihAppRegistrationStatus = outcomes.jihAppRegistrationStatus

  karkun.updatedAt = new Date().toISOString()
  karkun.updatedBy = 'Rukn'
}

export function updateKarkunVisitExecution(
  karkunId: string,
  execution: { visitDate: string; visitConducted: boolean },
): void {
  const karkun = getKarkunById(karkunId)
  if (!karkun) {
    return
  }

  karkun.lastVisit = execution.visitDate
  karkun.visitStatus = execution.visitConducted ? 'completed' : 'pending'
  karkun.updatedAt = new Date().toISOString()
  karkun.updatedBy = 'Rukn'
}

export function getRegistryFilterOptions() {
  const areas = [...new Set(MOCK_KARKUN_REGISTRY.map((k) => k.area))].sort()
  const rukns = getActiveRuknNames()

  return { areas, rukns }
}

export function resolveAssignedRuknName(ruknId: string): string {
  return getRuknById(ruknId)?.name ?? 'Unassigned'
}

export { adminKarkunProfilePath } from '@/constants/routes'
