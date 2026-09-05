/** Leaf helper — keep this module free of store/repository imports (Firestore cycle). */
export function isPromotedToARukn(person: { promotedToARuknId?: string }): boolean {
  return Boolean(person.promotedToARuknId?.trim())
}

/** Durable Admin-only promotion transition — not an active normal Karkun. */
export function isARuknPromotionInProgress(person: {
  aRuknPromotionInProgress?: boolean
}): boolean {
  return person.aRuknPromotionInProgress === true
}

export function isUnavailableAsNormalKarkun(person: {
  promotedToARuknId?: string
  aRuknPromotionInProgress?: boolean
}): boolean {
  return isPromotedToARukn(person) || isARuknPromotionInProgress(person)
}
