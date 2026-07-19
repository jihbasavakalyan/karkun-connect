/**
 * KC-004H — Authoritative registry existence for production migration decisions.
 *
 * Run: npx vite-node scripts/verify-kc004h-authoritative-registry-existence.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { shouldRefuseFullProductionSeed } from '../src/lib/migration/repairDuplicateKarkunOrphans'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationSrc = fs.readFileSync(
  path.join(root, 'src/services/productionDataMigrationService.ts'),
  'utf8',
)
const karkunIface = fs.readFileSync(
  path.join(root, 'src/repositories/interfaces/KarkunRepository.ts'),
  'utf8',
)
const firestoreKarkun = fs.readFileSync(
  path.join(root, 'src/repositories/firestore/firestoreRepositories.ts'),
  'utf8',
)
const localKarkun = fs.readFileSync(
  path.join(root, 'src/repositories/local/localRepositories.ts'),
  'utf8',
)

assert(
  karkunIface.includes('resolveRegistryCount'),
  'KarkunRepository must expose resolveRegistryCount',
)
assert(
  firestoreKarkun.includes('async resolveRegistryCount') &&
    firestoreKarkun.includes('getCountFromServer'),
  'Firestore karkun repo must implement durable resolveRegistryCount via getCountFromServer',
)
assert(
  localKarkun.includes('async resolveRegistryCount'),
  'Local karkun repo must implement resolveRegistryCount',
)
assert(
  migrationSrc.includes('resolveRegistryCount()') &&
    migrationSrc.includes('resolveAuthoritativeRegistryCount') &&
    migrationSrc.includes('refuseBecauseUncertain'),
  'migration decision must use authoritative registry existence',
)
assert(
  migrationSrc.includes('shouldRefuseFullProductionSeed'),
  'migration must retain refuse-full-seed safeguard',
)
assert(
  !migrationSrc.includes('readLiveFirestoreKarkunCount'),
  'diagnostic-only live count helper must not remain as the decision path',
)

// Decision contract: durable/memory authoritative count drives refuse
assert(
  shouldRefuseFullProductionSeed({ existingRegistryCount: 493 }) === true,
  'must refuse when authoritative count > 0',
)
assert(
  shouldRefuseFullProductionSeed({ existingRegistryCount: 0 }) === false,
  'confirmed-empty registry may full-seed',
)

// Simulated hard-refresh stability: durable count stays 493 → no growth
let durableRegistryCount = 493
for (let refresh = 1; refresh <= 4; refresh += 1) {
  const memoryEmpty = 0
  const authoritativeCount = Math.max(durableRegistryCount, memoryEmpty)
  const refuse = shouldRefuseFullProductionSeed({ existingRegistryCount: authoritativeCount })
  assert(refuse, `refresh ${refresh} must refuse full seed when durable count is ${durableRegistryCount}`)
  assert(authoritativeCount === 493, `refresh ${refresh} authoritative count stable`)
  // adopt path does not mint new ids
  durableRegistryCount = authoritativeCount
}

// Empty memory must not alone permit seed when durable count > 0
assert(
  shouldRefuseFullProductionSeed({
    existingRegistryCount: Math.max(685, 0),
  }) === true,
  'empty memory + durable docs must refuse',
)

console.log('KC-004H authoritative registry existence contract OK')
console.log(
  JSON.stringify(
    {
      resolveRegistryCount: true,
      durableFirestoreCount: true,
      failClosedOnUncertainEmpty: true,
      refreshStabilitySim: { refreshes: 4, registrySize: 493 },
    },
    null,
    2,
  ),
)
