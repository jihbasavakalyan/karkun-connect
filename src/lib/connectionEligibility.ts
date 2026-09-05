/**
 * KC-0113.3 — Shared eligibility for connection selectors (create / approve / assign).
 * Excludes connected, pending-approval, assigned, inactive, and campaign-ineligible Karkuns.
 */

import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import { isCampaignEligible, isUnavailableAsNormalKarkun } from '@/lib/peopleClassification'
import { getPendingKarkunRequests } from '@/stores/karkunRequestStore'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export const KARKUN_ALREADY_CONNECTED_MESSAGE = 'This Karkun is already connected.'

/** Mobiles currently waiting on Admin approval — must not appear as connectable. */
export function getPendingApprovalMobileSet(): Set<string> {
  const mobiles = new Set<string>()
  for (const request of getPendingKarkunRequests()) {
    const mobile = normalizeMobile(request.mobile)
    if (mobile) mobiles.add(mobile)
  }
  return mobiles
}

export function isKarkunSelectableForConnection(
  karkun: KarkunRegistryRecord,
  pendingMobiles: Set<string> = getPendingApprovalMobileSet(),
): boolean {
  if (!isCampaignEligible(karkun)) return false
  if (isUnavailableAsNormalKarkun(karkun)) return false
  if (karkun.status !== 'active') return false
  if (karkun.isArchived) return false
  if (karkun.assignmentStatus !== 'Available') return false
  if (getActiveAssignmentsForKarkun(karkun.id).length > 0) return false

  const mobile = normalizeMobile(karkun.mobile)
  if (!mobile || !isValidMobileFormat(mobile)) return false
  if (pendingMobiles.has(mobile)) return false

  return true
}

export function filterKarkunsSelectableForConnection(
  karkuns: KarkunRegistryRecord[],
): KarkunRegistryRecord[] {
  const pendingMobiles = getPendingApprovalMobileSet()
  return karkuns.filter((karkun) => isKarkunSelectableForConnection(karkun, pendingMobiles))
}
