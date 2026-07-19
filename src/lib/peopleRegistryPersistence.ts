import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import { notifyPeopleRegistryChange } from '@/lib/peopleStore'
import { kc004cTraceRegistry } from '@/lib/debug/kc004cRegistryTrace'

export function hasPersistedKarkunRegistry(): boolean {
  const result = getRepositories().karkun.exists()
  return unwrapRepository(result, false)
}

export function persistPeopleRegistry(nextKarkunNum: number): void {
  getRepositories().karkun.saveState({
    karkuns: MOCK_KARKUN_REGISTRY,
    nextKarkunNum,
  })
  getRepositories().rukn.saveAll(ruknMaster)
}

export function loadPeopleRegistryFromPersistence(): {
  loadedKarkuns: boolean
  nextKarkunNum: number
} {
  const karkunState = unwrapRepository(
    getRepositories().karkun.loadState(),
    { karkuns: [], nextKarkunNum: 1 },
  )
  const rukns = unwrapRepository(getRepositories().rukn.loadAll(), [])

  let mutated = false
  const before = MOCK_KARKUN_REGISTRY.length
  kc004cTraceRegistry({
    caller: 'loadPeopleRegistryFromPersistence',
    phase: 'before-apply',
    before,
    firestoreCount: karkunState.karkuns.length,
  })

  if (karkunState.karkuns.length > 0) {
    MOCK_KARKUN_REGISTRY.length = 0
    kc004cTraceRegistry({
      caller: 'loadPeopleRegistryFromPersistence',
      phase: 'after-clear',
      before,
      afterClear: MOCK_KARKUN_REGISTRY.length,
      firestoreCount: karkunState.karkuns.length,
    })
    MOCK_KARKUN_REGISTRY.push(...karkunState.karkuns)
    mutated = true
  }

  kc004cTraceRegistry({
    caller: 'loadPeopleRegistryFromPersistence',
    phase: 'after-rebuild',
    before,
    firestoreCount: karkunState.karkuns.length,
    after: MOCK_KARKUN_REGISTRY.length,
    extra: { mutated, nextKarkunNum: karkunState.nextKarkunNum },
  })

  if (rukns.length > 0) {
    ruknMaster.length = 0
    ruknMaster.push(...rukns)
    mutated = true
  }

  if (mutated) {
    notifyPeopleRegistryChange()
  }

  return {
    loadedKarkuns: karkunState.karkuns.length > 0,
    nextKarkunNum: karkunState.nextKarkunNum,
  }
}

export function clearPeopleRegistryPersistence(): void {
  getRepositories().karkun.clear()
  getRepositories().rukn.clear()
  getRepositories().settings.clearMigrationVersion()
}

/** @deprecated Use STORAGE_KEYS via repositories */
export const PEOPLE_MIGRATION_VERSION_KEY = 'karkun-connect.migration.version'
export const KARKUN_REGISTRY_STORAGE_KEY = 'karkun-connect.karkun-registry'
export const RUKN_MASTER_STORAGE_KEY = 'karkun-connect.rukn-master'
export const NEXT_KARKUN_ID_STORAGE_KEY = 'karkun-connect.karkun.next-id'
