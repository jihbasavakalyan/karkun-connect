import { isKarkun } from '@/lib/peopleClassification'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

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
