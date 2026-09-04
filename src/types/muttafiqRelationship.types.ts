/**
 * KC Increment A — durable Rukn ↔ Muttafiq relationship (not campaign connections).
 */

export type MuttafiqRuknRelationshipStatus = 'Active' | 'Ended'

export type MuttafiqRuknRelationship = {
  /** Deterministic: `mr_{ruknId}_{personId}` */
  id: string
  ruknId: string
  ruknName: string
  personId: string
  personName: string
  status: MuttafiqRuknRelationshipStatus
  createdAt: string
  updatedAt: string
  /** Admin who established / last re-approved the Active link. */
  establishedBy: string
  /** People-intake request id that produced this link (optional). */
  requestId?: string
}

/** Build the canonical relationship document id (idempotent upsert key). */
export function muttafiqRuknRelationshipId(ruknId: string, personId: string): string {
  return `mr_${ruknId.trim()}_${personId.trim()}`
}
