import { isKarkun } from '@/lib/peopleClassification'
import type { ARuknPromotionResult } from '@/services/aRuknPromotionService'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export const A_RUKN_PROMOTION_SAFE_ERROR =
  'Promotion could not be completed. The person remains a Karkun until a successful save.'

export function isDurableARuknPromotionSuccess(
  result: ARuknPromotionResult,
): result is Extract<ARuknPromotionResult, { success: true }> {
  return result.success === true
}

/** Convert throws into a failed result so the UI can always clear pending. */
export async function settleARuknPromotionAttempt(
  attempt: () => Promise<ARuknPromotionResult>,
): Promise<ARuknPromotionResult> {
  try {
    return await attempt()
  } catch (error) {
    console.error('[PromoteToARukn]', error)
    return { success: false, error: A_RUKN_PROMOTION_SAFE_ERROR }
  }
}

/**
 * Presentation-only offer for Promote to عازمِ رکن.
 * Backend `promoteKarkunToARukn` remains the security and eligibility authority.
 */
export function canOfferARuknPromotion(
  person: Pick<
    KarkunRegistryRecord,
    'category' | 'isArchived' | 'archiveKind' | 'promotedToARuknId' | 'aRuknPromotionInProgress' | 'status'
  >,
): boolean {
  return isKarkun(person) && person.status === 'active'
}
