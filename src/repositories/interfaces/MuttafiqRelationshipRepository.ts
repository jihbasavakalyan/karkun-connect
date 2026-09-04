import type { MuttafiqRuknRelationship } from '@/types/muttafiqRelationship.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * Durable Rukn ↔ Muttafiq relationships (one document per pair).
 * Upsert must be idempotent for the same ruknId + personId.
 */
export interface MuttafiqRelationshipRepository {
  loadAll(): RepositoryResult<MuttafiqRuknRelationship[]>
  /** Local full replace / Firestore cache-only. */
  saveAll(rows: MuttafiqRuknRelationship[]): RepositoryResult<void>
  /**
   * Durable Admin upsert of an Active relationship.
   * Same id → no duplicate; returns existing Active on re-approve.
   */
  upsertActiveDurable(
    relationship: MuttafiqRuknRelationship,
  ): Promise<RepositoryResult<MuttafiqRuknRelationship>>
}
