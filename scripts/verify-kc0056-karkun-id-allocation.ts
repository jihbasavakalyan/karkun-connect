/**
 * KC-0056 — Karkun ID allocation never reuses occupied IDs; counter cannot lag.
 * Run: npm run verify:kc0056
 */

import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { resetRepositoryProviderForTests } from '../src/repositories/provider'
import {
  allocateNextKarkunId,
  createKarkun,
  getAllKarkuns,
  getMaxKarkunNumFromRegistry,
  getNextKarkunNum,
  resetNextKarkunId,
  setNextKarkunNum,
  syncNextKarkunNumFromRegistry,
} from '../src/lib/peopleStore'
import { DEFAULT_PLACE } from '../src/types/people.types'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function seedKarkun(id: string, name: string, mobile: string): KarkunRegistryRecord {
  const now = new Date().toISOString()
  return {
    id,
    name,
    gender: 'Male',
    mobile,
    place: DEFAULT_PLACE,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Verification',
    address: '',
    area: '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    isArchived: false,
  }
}

resetRepositoryProviderForTests()
MOCK_KARKUN_REGISTRY.length = 0

// --- Lagging counter must not reuse occupied IDs (Shamsheer / kr-021 class bug) ---
MOCK_KARKUN_REGISTRY.push(
  seedKarkun('kr-013', 'Seed Thirteen', '9000000013'),
  seedKarkun('kr-021', 'MOHAMMED KAIF', '9000000021'),
  seedKarkun('kr-493', 'Highest Existing', '9000000493'),
)
setNextKarkunNum(13) // production lag

const first = createKarkun(
  {
    name: 'Shamsheer Khan',
    gender: 'Male',
    mobile: '9000001494',
    place: DEFAULT_PLACE,
    status: 'active',
  },
  'Administrator',
)
assert(first.success, `first create failed: ${first.error}`)
assert(first.karkunId === 'kr-494', `expected kr-494, got ${first.karkunId}`)
assert(getKarkunByName('MOHAMMED KAIF')?.id === 'kr-021', 'existing kr-021 must be untouched')
assert(getKarkunByName('Shamsheer Khan')?.id === 'kr-494', 'new person must own kr-494')
assert(getNextKarkunNum() === 495, `counter after first create expected 495, got ${getNextKarkunNum()}`)

const second = createKarkun(
  {
    name: 'Mehboob Pasha',
    gender: 'Male',
    mobile: '9000001495',
    place: DEFAULT_PLACE,
    status: 'active',
  },
  'Administrator',
)
assert(second.success, `second create failed: ${second.error}`)
assert(second.karkunId === 'kr-495', `expected kr-495, got ${second.karkunId}`)
assert(getNextKarkunNum() === 496, `counter after second create expected 496, got ${getNextKarkunNum()}`)

// --- Occupied id at counter tip is skipped via max(existing)+1 ---
MOCK_KARKUN_REGISTRY.push(seedKarkun('kr-496', 'Occupied Tip', '9000000496'))
setNextKarkunNum(496)
const alloc = allocateNextKarkunId()
assert(alloc.ok, 'allocate after occupied tip should succeed')
assert(alloc.id === 'kr-497', `expected kr-497, got ${alloc.id}`)
assert(getNextKarkunNum() === 498, 'counter advances past allocated id')

// --- Lagging counter must never mint below max+1 even with gaps below ---
MOCK_KARKUN_REGISTRY.push(seedKarkun('kr-010', 'Low Seed', '9000000010'))
setNextKarkunNum(10)
const afterLag = allocateNextKarkunId()
assert(afterLag.ok, 'allocate with lagging counter should succeed')
assert(afterLag.id === 'kr-497', `expected kr-497, got ${afterLag.id}`)

// --- sync heals lagging counter (and never decreases a higher in-memory counter) ---
resetNextKarkunId(13)
const healed = syncNextKarkunNumFromRegistry(13)
assert(healed === getMaxKarkunNumFromRegistry() + 1, 'sync must use max existing + 1')
assert(healed >= 497, `healed counter too low: ${healed}`)

// --- Duplicate mobile still rejected ---
const dup = createKarkun(
  {
    name: 'Duplicate Mobile',
    gender: 'Male',
    mobile: '9000001494',
    place: DEFAULT_PLACE,
    status: 'active',
  },
  'Administrator',
)
assert(!dup.success, 'duplicate mobile must fail')
assert(dup.existingOwner?.kind === 'karkun', 'duplicate must report existing karkun owner')

// --- Search / registry visibility ---
const all = getAllKarkuns()
assert(all.some((k) => k.id === 'kr-494' && k.name === 'Shamsheer Khan'), 'registry must list new karkun')
assert(all.some((k) => k.id === 'kr-021' && k.name === 'MOHAMMED KAIF'), 'seed karkun preserved')

function getKarkunByName(name: string) {
  return MOCK_KARKUN_REGISTRY.find((k) => k.name === name && !k.isArchived)
}

console.log('KC-0056 verify: OK')
console.log(
  JSON.stringify(
    {
      firstId: first.karkunId,
      secondId: second.karkunId,
      nextKarkunNum: getNextKarkunNum(),
      maxExisting: getMaxKarkunNumFromRegistry(),
    },
    null,
    2,
  ),
)
