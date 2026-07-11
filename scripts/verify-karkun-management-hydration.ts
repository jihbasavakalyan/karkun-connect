/**
 * RC1 — People registry hydration / notification regression.
 * Run: npm run verify:karkun-hydration
 */
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getAllKarkuns, subscribeToPeopleStore } from '@/lib/peopleStore'
import { runProductionDataMigration } from '@/services/productionDataMigrationService'
import {
  hasPersistedKarkunRegistry,
  loadPeopleRegistryFromPersistence,
} from '@/lib/peopleRegistryPersistence'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

// Seed persistence
runProductionDataMigration()
assert(getAllKarkuns().length > 0, 'seed must populate')
assert(hasPersistedKarkunRegistry(), 'registry must persist')

// Cold paint: empty memory, page subscribed, then skip-path reload
MOCK_KARKUN_REGISTRY.length = 0
let uiMale = 0
let notifies = 0
const unsub = subscribeToPeopleStore(() => {
  notifies += 1
  uiMale = getAllKarkuns().filter((k) => k.gender === 'Male').length
})
assert(
  getAllKarkuns().filter((k) => k.gender === 'Male').length === 0,
  'pre-load UI must be empty',
)

const summary = runProductionDataMigration()
assert(summary.dashboardVerified.maleKarkuns > 0, 'migration must report male karkuns')
assert(getAllKarkuns().filter((k) => k.gender === 'Male').length > 0, 'registry must reload')
assert(notifies >= 1, 'skip-path must notify people subscribers')
assert(uiMale > 0, 'Karkun Management UI must refresh after migration load')

// Same-session empty registry must not stay short-circuited
MOCK_KARKUN_REGISTRY.length = 0
runProductionDataMigration()
assert(MOCK_KARKUN_REGISTRY.length > 0, 'empty MOCK must force reload despite migrationCompleted')
assert(getAllKarkuns().length > 0, 'getAllKarkuns must reflect reloaded MOCK')

// Direct persistence load must emit even without migration wrapper
MOCK_KARKUN_REGISTRY.length = 0
const beforeDirect = notifies
const loaded = loadPeopleRegistryFromPersistence()
assert(loaded.loadedKarkuns, 'direct load must find persisted karkuns')
assert(MOCK_KARKUN_REGISTRY.length > 0, 'direct load must fill MOCK')
assert(notifies > beforeDirect, 'loadPeopleRegistryFromPersistence must emit change')

unsub()
console.log('Karkun Management hydration notify regression passed.', {
  male: uiMale,
  notifies,
  version: unwrapRepository(getRepositories().settings.getMigrationVersion(), null),
})
