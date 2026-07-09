import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { RepositoryResult } from '@/repositories/errors'

export type KarkunRegistryState = {
  karkuns: KarkunRegistryRecord[]
  nextKarkunNum: number
}

export interface KarkunRepository {
  loadState(): RepositoryResult<KarkunRegistryState>
  saveState(state: KarkunRegistryState): RepositoryResult<void>
  clear(): RepositoryResult<void>
  exists(): RepositoryResult<boolean>
}
