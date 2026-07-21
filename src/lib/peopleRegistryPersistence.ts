import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import { getRepositories } from '@/repositories/provider'
import { repositoryOk, unwrapRepository, type RepositoryResult } from '@/repositories/errors'
import { notifyPeopleRegistryChange, syncNextKarkunNumFromRegistry } from '@/lib/peopleStore'
import { kc004cTraceRegistry } from '@/lib/debug/kc004cRegistryTrace'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export function hasPersistedKarkunRegistry(): boolean {
  const result = getRepositories().karkun.exists()
  return unwrapRepository(result, false)
}

/** Bulk path — full registry + all rukns (import, migration, profile edits). */
export function persistPeopleRegistry(nextKarkunNum: number): void {
  getRepositories().karkun.saveState({
    karkuns: MOCK_KARKUN_REGISTRY,
    nextKarkunNum,
  })
  getRepositories().rukn.saveAll(ruknMaster)
}

/** KC-0064 — targeted karkun upsert only (assign / disconnect sync). No rukn rewrite. */
export async function persistKarkunRecords(
  karkuns: readonly KarkunRegistryRecord[],
): Promise<RepositoryResult<void>> {
  if (karkuns.length === 0) {
    return repositoryOk(undefined)
  }
  const commit = getRepositories().karkun.commitKarkunDocuments
  if (commit) {
    const { connectStepEnter, connectStepExit, connectStepException } = await import(
      '@/lib/debug/kc0061ConnectTrace'
    )
    const span = connectStepEnter('repo.karkun.commitDocuments', {
      karkunIds: karkuns.map((karkun) => karkun.id),
      count: karkuns.length,
    })
    const result = await commit(karkuns)
    if (!result.ok) {
      connectStepException('repo.karkun.commitDocuments', result.error.cause ?? result.error, {
        errorCode: result.error.code,
        errorMessage: result.error.message,
      })
      connectStepExit(span, 'repo.karkun.commitDocuments', { ok: false })
      console.error('[peopleRegistryPersistence.persistKarkunRecords]', result.error)
      return result
    }
    connectStepExit(span, 'repo.karkun.commitDocuments', { ok: true })
    return result
  }
  for (const karkun of karkuns) {
    const upsert = await getRepositories().karkun.upsertRecord(karkun)
    if (!upsert.ok) {
      return upsert
    }
  }
  return repositoryOk(undefined)
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

  // KC-0056 — heal counter so lagging karkunCounter never drives ID reuse.
  // Only persist the heal when Firestore actually provided karkuns (never flush seed).
  const healedNext = syncNextKarkunNumFromRegistry(karkunState.nextKarkunNum)
  if (
    karkunState.karkuns.length > 0 &&
    healedNext !== karkunState.nextKarkunNum
  ) {
    mutated = true
  }

  if (mutated) {
    notifyPeopleRegistryChange()
  }

  return {
    loadedKarkuns: karkunState.karkuns.length > 0,
    nextKarkunNum: healedNext,
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
