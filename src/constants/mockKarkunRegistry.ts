import type {
  JihAppRegistrationStatus,
  KarkunRegistryRecord,
} from '@/types/karkun-registry.types'
import { getActiveRuknNames, getRuknById } from '@/data/ruknMaster'
import { notifyAndPersistKarkunRecords } from '@/lib/peopleStore'
import { upsertRegistration } from '@/stores/jihWebPortalStore'
import type { JihWebPortalRegistrationStatus } from '@/types/jihWebPortal'

/** Production Karkun registry — populated by production data migration. */
export const MOCK_KARKUN_REGISTRY: KarkunRegistryRecord[] = []

export function getKarkunById(id: string): KarkunRegistryRecord | undefined {
  return MOCK_KARKUN_REGISTRY.find((karkun) => karkun.id === id)
}

/**
 * Person field `jihAppRegistrationStatus` is the Matrix/report source of truth.
 * When `syncJihPortal` is true, mirror Registered → portal Registered (else Not Registered)
 * for compatibility readers — does not replace person SoT.
 */
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
  // KC-0086 — targeted karkun persist only (never full registry + rukn.saveAll).
  void notifyAndPersistKarkunRecords([karkun])

  if (outcomes.syncJihPortal) {
    const portalStatus: JihWebPortalRegistrationStatus =
      outcomes.jihAppRegistrationStatus === 'Registered' ? 'Registered' : 'Not Registered'
    upsertRegistration({
      karkunId,
      status: portalStatus,
      registrationDate:
        portalStatus === 'Registered' ? new Date().toISOString().slice(0, 10) : undefined,
      updatedAt: karkun.updatedAt,
      updatedBy: 'Rukn',
    })
  }
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
  // KC-0086 — targeted karkun persist only (never full registry + rukn.saveAll).
  void notifyAndPersistKarkunRecords([karkun])
}

export function getRegistryFilterOptions() {
  const areas = [...new Set(MOCK_KARKUN_REGISTRY.map((k) => k.area))].sort()
  const rukns = getActiveRuknNames()

  return { areas, rukns }
}

export function resolveAssignedRuknName(ruknId: string): string {
  return getRuknById(ruknId)?.name ?? 'Not Connected'
}

export { adminKarkunProfilePath } from '@/constants/routes'
