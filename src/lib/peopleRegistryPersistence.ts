import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type { Rukn } from '@/data/ruknMaster'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import {
  getBrowserStorage,
  loadJsonFromStorage,
  removeFromStorage,
  saveJsonToStorage,
} from '@/lib/browserStorage'

export const PEOPLE_MIGRATION_VERSION_KEY = 'karkun-connect.migration.version'
export const KARKUN_REGISTRY_STORAGE_KEY = 'karkun-connect.karkun-registry'
export const RUKN_MASTER_STORAGE_KEY = 'karkun-connect.rukn-master'
export const NEXT_KARKUN_ID_STORAGE_KEY = 'karkun-connect.karkun.next-id'

export function hasPersistedKarkunRegistry(): boolean {
  return getBrowserStorage().getItem(KARKUN_REGISTRY_STORAGE_KEY) !== null
}

export function persistPeopleRegistry(nextKarkunNum: number): void {
  saveJsonToStorage(KARKUN_REGISTRY_STORAGE_KEY, MOCK_KARKUN_REGISTRY)
  saveJsonToStorage(RUKN_MASTER_STORAGE_KEY, ruknMaster)
  saveJsonToStorage(NEXT_KARKUN_ID_STORAGE_KEY, nextKarkunNum)
}

export function loadPeopleRegistryFromPersistence(): {
  loadedKarkuns: boolean
  nextKarkunNum: number
} {
  const karkuns = loadJsonFromStorage<KarkunRegistryRecord[]>(KARKUN_REGISTRY_STORAGE_KEY, [])
  const rukns = loadJsonFromStorage<Rukn[]>(RUKN_MASTER_STORAGE_KEY, [])
  const nextKarkunNum = loadJsonFromStorage<number>(NEXT_KARKUN_ID_STORAGE_KEY, 1)

  if (karkuns.length > 0) {
    MOCK_KARKUN_REGISTRY.length = 0
    MOCK_KARKUN_REGISTRY.push(...karkuns)
  }

  if (rukns.length > 0) {
    ruknMaster.length = 0
    ruknMaster.push(...rukns)
  }

  return {
    loadedKarkuns: karkuns.length > 0,
    nextKarkunNum,
  }
}

export function clearPeopleRegistryPersistence(): void {
  removeFromStorage(KARKUN_REGISTRY_STORAGE_KEY)
  removeFromStorage(RUKN_MASTER_STORAGE_KEY)
  removeFromStorage(NEXT_KARKUN_ID_STORAGE_KEY)
  removeFromStorage(PEOPLE_MIGRATION_VERSION_KEY)
}
