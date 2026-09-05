import { isPromotedToARukn } from '@/lib/promotedToARukn'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

/**
 * KC-0061 — same-id promotion-state overlay for hydrate.
 * Incoming Firestore karkuns/{id} wins when it actually carries a promotion id
 * or in-progress true. Missing/empty incoming must not erase a known transition
 * already held for that same id. Assignment fields are never taken from previous.
 */
export function mergeKarkunPromotionStateOnHydrate(
  previous: readonly KarkunRegistryRecord[],
  incoming: readonly KarkunRegistryRecord[],
): KarkunRegistryRecord[] {
  const previousById = new Map(previous.map((row) => [row.id, row]))
  return incoming.map((row) => mergeOne(previousById.get(row.id), row))
}

function mergeOne(
  previous: KarkunRegistryRecord | undefined,
  incoming: KarkunRegistryRecord,
): KarkunRegistryRecord {
  if (!previous) {
    return incoming
  }

  const promotedToARuknId = mergePromotedToARuknId(
    previous.promotedToARuknId,
    incoming.promotedToARuknId,
  )
  const aRuknPromotionInProgress = mergeARuknPromotionInProgress(
    previous.aRuknPromotionInProgress,
    incoming.aRuknPromotionInProgress,
    isPromotedToARukn(incoming),
  )

  if (
    promotedToARuknId === incoming.promotedToARuknId &&
    aRuknPromotionInProgress === incoming.aRuknPromotionInProgress
  ) {
    return incoming
  }

  const next: KarkunRegistryRecord = { ...incoming }
  if (promotedToARuknId === undefined) {
    delete next.promotedToARuknId
  } else {
    next.promotedToARuknId = promotedToARuknId
  }
  if (aRuknPromotionInProgress === undefined) {
    delete next.aRuknPromotionInProgress
  } else {
    next.aRuknPromotionInProgress = aRuknPromotionInProgress
  }
  return next
}

function mergePromotedToARuknId(
  previous: string | undefined,
  incoming: string | undefined,
): string | undefined {
  if (isPromotedToARukn({ promotedToARuknId: incoming })) {
    return incoming
  }
  if (isPromotedToARukn({ promotedToARuknId: previous })) {
    return previous
  }
  return incoming
}

function mergeARuknPromotionInProgress(
  previous: boolean | undefined,
  incoming: boolean | undefined,
  incomingHasPromotionId: boolean,
): boolean | undefined {
  if (incoming === true) {
    return true
  }
  // Completed promotion on the incoming document — do not keep a stale in-progress flag.
  if (incomingHasPromotionId) {
    return incoming
  }
  if (previous === true) {
    return true
  }
  return incoming
}
