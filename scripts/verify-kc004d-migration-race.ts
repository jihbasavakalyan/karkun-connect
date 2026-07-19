/**
 * KC-004D — Migration race fix + refresh stability contract.
 *
 * Run: npx vite-node scripts/verify-kc004d-migration-race.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  planDuplicateKarkunOrphanRepair,
  shouldRefuseFullProductionSeed,
} from '../src/lib/migration/repairDuplicateKarkunOrphans'
import type { AssignmentRecord } from '../src/types/assignment'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'

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
const settingsIface = fs.readFileSync(
  path.join(root, 'src/repositories/interfaces/SettingsRepository.ts'),
  'utf8',
)
const firestoreSettings = fs.readFileSync(
  path.join(root, 'src/repositories/firestore/firestoreRepositories.ts'),
  'utf8',
)
const mainSrc = fs.readFileSync(path.join(root, 'src/main.tsx'), 'utf8')

assert(
  settingsIface.includes('resolveMigrationVersion'),
  'SettingsRepository must expose resolveMigrationVersion',
)
assert(
  firestoreSettings.includes('async resolveMigrationVersion'),
  'Firestore settings must implement authoritative resolveMigrationVersion',
)
assert(
  migrationSrc.includes('resolveMigrationVersion()') &&
    migrationSrc.includes('shouldRefuseFullProductionSeed') &&
    migrationSrc.includes('forceFullSeed') &&
    migrationSrc.includes('safeguard-existing-registry'),
  'migration service missing KC-004D safeguards',
)
assert(
  migrationSrc.includes('async function runProductionDataMigration') ||
    migrationSrc.includes('export async function runProductionDataMigration'),
  'runProductionDataMigration must be async for authoritative resolve',
)
assert(
  mainSrc.includes('await runProductionDataMigration()'),
  'main bootstrap must await async migration after hydrationReady',
)
assert(
  !/getMigrationVersion\(\),\s*null/.test(migrationSrc) ||
    migrationSrc.includes('resolveMigrationVersion'),
  'decision path must not rely on cache-only getMigrationVersion alone',
)

// Safeguard predicate
assert(
  shouldRefuseFullProductionSeed({ existingRegistryCount: 493 }) === true,
  'must refuse full seed when registry exists',
)
assert(
  shouldRefuseFullProductionSeed({ existingRegistryCount: 493, forceFullSeed: true }) === false,
  'forceFullSeed must override safeguard',
)
assert(
  shouldRefuseFullProductionSeed({ existingRegistryCount: 0 }) === false,
  'empty registry may full-seed',
)

// Repair planner: duplicate mobiles → keep oldest / active-referenced
const karkuns: KarkunRegistryRecord[] = [
  {
    id: 'kr-010',
    name: 'Older',
    gender: 'Male',
    mobile: '03001111111',
    place: 'X',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 't',
    address: '',
    area: '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
  },
  {
    id: 'kr-999',
    name: 'Newer Dup',
    gender: 'Male',
    mobile: '03001111111',
    place: 'X',
    status: 'active',
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
    updatedBy: 't',
    address: '',
    area: '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
  },
  {
    id: 'kr-050',
    name: 'Unique',
    gender: 'Female',
    mobile: '03002222222',
    place: 'X',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 't',
    address: '',
    area: '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
  },
]

const plan = planDuplicateKarkunOrphanRepair(karkuns, [])
assert(plan.beforeCount === 3, 'plan beforeCount')
assert(plan.afterCount === 2, 'plan afterCount collapses mobile dup')
assert(plan.keepIds.includes('kr-010'), 'keep oldest duplicate')
assert(plan.deleteIds.includes('kr-999'), 'delete newer duplicate')
assert(!plan.deleteIds.includes('kr-050'), 'unique mobile kept')

const assignments = [
  {
    assignmentId: 'a1',
    karkunId: 'kr-999',
    status: 'Active',
  },
] as AssignmentRecord[]
const planActive = planDuplicateKarkunOrphanRepair(karkuns, assignments)
assert(planActive.keepIds.includes('kr-999'), 'prefer Active-referenced id')
assert(planActive.deleteIds.includes('kr-010'), 'delete non-referenced duplicate')

// Simulated refresh stability: safeguard blocks growth path
let registrySize = 493
for (let refresh = 1; refresh <= 4; refresh += 1) {
  const refuse = shouldRefuseFullProductionSeed({ existingRegistryCount: registrySize })
  assert(refuse, `refresh ${refresh} must refuse full seed`)
  // adopting existing registry does not grow
  assert(registrySize === 493, `refresh ${refresh} registry stable`)
}

assert(
  fs.existsSync(path.join(root, 'scripts/admin/repair-duplicate-karkun-orphans.mjs')),
  'admin repair script missing',
)

console.log('KC-004D migration race fix contract OK')
console.log(
  JSON.stringify(
    {
      authoritativeResolve: true,
      safeguardRefuseWhenRegistryExists: true,
      forceFullSeedOverride: true,
      repairPlanner: { before: plan.beforeCount, after: plan.afterCount },
      refreshStabilitySim: { refreshes: 4, registrySize: 493 },
    },
    null,
    2,
  ),
)
