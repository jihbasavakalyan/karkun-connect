import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { RepositoryResult } from '@/repositories/errors'

export type KarkunRegistryState = {
  karkuns: KarkunRegistryRecord[]
  nextKarkunNum: number
}

/** Targeted Karkun field patch (A Rukn promotion transition). Never a full document. */
export type KarkunRecordPatch = {
  aRuknPromotionInProgress?: boolean
  updatedAt?: string
  updatedBy?: string
}

export interface KarkunRepository {
  loadState(): RepositoryResult<KarkunRegistryState>
  saveState(state: KarkunRegistryState): RepositoryResult<void>
  /**
   * KC-0058.2 — Awaited single-document upsert (profile enrichment / Connect sync).
   * Prefer this over saveState when success must mean durable persistence.
   */
  upsertRecord(karkun: KarkunRegistryRecord): Promise<RepositoryResult<void>>
  /**
   * Awaited field patch via Firestore updateDoc (promotion transition).
   * Does not send a reconstructed Karkun document.
   */
  updateRecord(id: string, patch: KarkunRecordPatch): Promise<RepositoryResult<void>>
  /**
   * KC-0064 — Awaited upsert of specific karkun documents (no karkunCounter / full registry).
   */
  commitKarkunDocuments?(
    karkuns: readonly KarkunRegistryRecord[],
  ): Promise<RepositoryResult<void>>
  clear(): RepositoryResult<void>
  /** Cache/local-storage synchronous existence (may be empty before hydrate). */
  exists(): RepositoryResult<boolean>
  /**
   * KC-004H — Authoritative registry document count for production migration decisions.
   * Reads durable storage (Firestore aggregation / localStorage); not transient memory alone.
   */
  resolveRegistryCount(): Promise<RepositoryResult<number>>
}
