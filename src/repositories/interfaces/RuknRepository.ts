import type { Rukn } from '@/data/ruknMaster'
import type { RepositoryResult } from '@/repositories/errors'

export interface RuknRepository {
  loadAll(): RepositoryResult<Rukn[]>
  saveAll(rukns: Rukn[]): RepositoryResult<void>
  /**
   * KC-0064 — Awaited upsert of specific rukn documents (no full-collection rewrite).
   */
  commitRuknDocuments?(rukns: readonly Rukn[]): Promise<RepositoryResult<void>>
  clear(): RepositoryResult<void>
  exists(): RepositoryResult<boolean>
}
