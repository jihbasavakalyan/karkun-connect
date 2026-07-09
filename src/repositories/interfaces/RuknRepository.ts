import type { Rukn } from '@/data/ruknMaster'
import type { RepositoryResult } from '@/repositories/errors'

export interface RuknRepository {
  loadAll(): RepositoryResult<Rukn[]>
  saveAll(rukns: Rukn[]): RepositoryResult<void>
  clear(): RepositoryResult<void>
  exists(): RepositoryResult<boolean>
}
