import {
  FEMALE_KARKUN_PRODUCTION_RECORDS,
  MALE_KARKUN_PRODUCTION_RECORDS,
  toProductionImportRow,
} from '@/data/production'
import {
  getAllKarkuns,
  getPeopleStatistics,
  importKarkunsFromRows,
  removeFemaleKarkunsFromRegistry,
  removeMaleKarkunsFromRegistry,
} from '@/lib/peopleStore'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import {
  ensureBaitulMaalRecord,
} from '@/services/baitulMaalService'
import {
  ensureIjtemaAttendanceRecord,
} from '@/services/ijtemaAttendanceService'
import {
  ensureRegistration,
} from '@/services/jihWebPortalService'
import type { ImportSummary } from '@/types/people.types'
import type { ProductionMigrationSummary } from '@/types/productionMigration'
import {
  loadPeopleRegistryFromPersistence,
  persistPeopleRegistry,
} from '@/lib/peopleRegistryPersistence'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'
import { getNextKarkunNum, setNextKarkunNum } from '@/lib/peopleStore'
import { kc004cTraceRegistry } from '@/lib/debug/kc004cRegistryTrace'
import { shouldRefuseFullProductionSeed } from '@/lib/migration/repairDuplicateKarkunOrphans'

export const PRODUCTION_MIGRATION_VERSION = 3

const MIGRATION_VERSION = PRODUCTION_MIGRATION_VERSION

let migrationCompleted = false
let lastMigrationSummary: ProductionMigrationSummary | null = null

export type ProductionMigrationOptions = {
  /**
   * Explicit override to allow full seed even when a registry already exists.
   * Required for intentional reseed; never set by normal startup.
   */
  forceFullSeed?: boolean
}

function createEmptyImportSummary(rowCount: number): ImportSummary {
  return {
    totalRows: rowCount,
    imported: 0,
    skipped: 0,
    duplicateMobiles: [],
    invalidMobiles: [],
    existingRecords: [],
    possibleNameDuplicates: [],
    otherErrors: [],
  }
}

function dedupeProductionRows(
  rows: ReturnType<typeof toProductionImportRow>[],
  source: 'Male Karkun Master' | 'Female Karkun Master',
): {
  rows: ReturnType<typeof toProductionImportRow>[]
  crossDuplicates: ImportSummary['duplicateMobiles']
} {
  const seenMobiles = new Set<string>()
  const crossDuplicates: ImportSummary['duplicateMobiles'] = []
  const kept: ReturnType<typeof toProductionImportRow>[] = []

  rows.forEach((row, index) => {
    const mobileKey = row.mobile.replace(/\D/g, '')
    if (!mobileKey) {
      kept.push(row)
      return
    }
    if (seenMobiles.has(mobileKey)) {
      crossDuplicates.push({
        row: index + 2,
        name: row.name,
        mobile: row.mobile,
        existingPerson: `Duplicate in ${source}`,
      })
      return
    }
    seenMobiles.add(mobileKey)
    kept.push(row)
  })

  return { rows: kept, crossDuplicates }
}

function mergeImportSummary(
  summary: ImportSummary,
  crossDuplicates: ImportSummary['duplicateMobiles'],
): ImportSummary {
  if (crossDuplicates.length === 0) {
    return summary
  }

  return {
    ...summary,
    duplicateMobiles: [...summary.duplicateMobiles, ...crossDuplicates],
    skipped: summary.skipped + crossDuplicates.length,
  }
}

function migrateMaleKarkunMaster(): ImportSummary {
  const maleSource = MALE_KARKUN_PRODUCTION_RECORDS.map(toProductionImportRow)
  const { rows, crossDuplicates } = dedupeProductionRows(maleSource, 'Male Karkun Master')
  return mergeImportSummary(
    importKarkunsFromRows(rows, 'Production Migration'),
    crossDuplicates,
  )
}

function migrateFemaleKarkunMaster(): ImportSummary {
  const femaleSource = FEMALE_KARKUN_PRODUCTION_RECORDS.map(toProductionImportRow)
  const { rows, crossDuplicates } = dedupeProductionRows(femaleSource, 'Female Karkun Master')
  return mergeImportSummary(
    importKarkunsFromRows(rows, 'Production Migration'),
    crossDuplicates,
  )
}

function initializeComplianceDefaults(): void {
  for (const karkun of getAllKarkuns()) {
    ensureRegistration(karkun.id)
    ensureBaitulMaalRecord(karkun.id)
    ensureIjtemaAttendanceRecord(karkun.id)
  }
}

/** Transient in-memory count — never the sole production existence signal. */
function countInMemoryProductionRegistry(): number {
  const persisted = unwrapRepository(getRepositories().karkun.loadState(), {
    karkuns: [],
    nextKarkunNum: 1,
  })
  return Math.max(persisted.karkuns.length, MOCK_KARKUN_REGISTRY.length)
}

/**
 * KC-004H — Authoritative registry existence count for migration decisions.
 * Durable resolveRegistryCount() is primary; in-memory is a floor only.
 * If durable read fails and memory is empty, fail closed (treat as exists).
 */
async function resolveAuthoritativeRegistryCount(forceFullSeed: boolean): Promise<{
  authoritativeCount: number
  memoryCount: number
  durableCount: number | null
  durableResolveFailed: boolean
  refuseBecauseUncertain: boolean
}> {
  const memoryCount = countInMemoryProductionRegistry()
  const resolveResult = await getRepositories().karkun.resolveRegistryCount()

  if (resolveResult.ok) {
    return {
      authoritativeCount: Math.max(resolveResult.data, memoryCount),
      memoryCount,
      durableCount: resolveResult.data,
      durableResolveFailed: false,
      refuseBecauseUncertain: false,
    }
  }

  const durableError =
    resolveResult.error.message ||
    resolveResult.error.code ||
    'resolveRegistryCount failed'
  const refuseBecauseUncertain = memoryCount === 0 && !forceFullSeed
  if (refuseBecauseUncertain) {
    console.warn(
      '[KC-004H] resolveRegistryCount failed with empty in-memory registry — refusing full seed',
      { durableError },
    )
  }

  return {
    // Fail closed: uncertain empty → count 1 so safeguard refuses unless forceFullSeed.
    authoritativeCount: refuseBecauseUncertain ? 1 : memoryCount,
    memoryCount,
    durableCount: null,
    durableResolveFailed: true,
    refuseBecauseUncertain,
  }
}

function buildAdoptSummary(): ProductionMigrationSummary {
  const stats = getPeopleStatistics()
  return {
    rukns: createEmptyImportSummary(0),
    maleKarkuns: createEmptyImportSummary(0),
    femaleKarkuns: createEmptyImportSummary(0),
    demoDataRemoved: false,
    runtimeStoresCleared: false,
    ruknsReplaced: false,
    migrationVersion: MIGRATION_VERSION,
    dashboardVerified: {
      totalRukns: stats.totalRukns,
      maleKarkuns: stats.totalMaleKarkuns,
      femaleKarkuns: stats.totalFemaleKarkuns,
      assignedKarkuns: stats.assignedKarkuns,
      unassignedKarkuns: stats.unassignedKarkuns,
    },
  }
}

/**
 * Adopt the already-hydrated production registry without reseeding.
 * Heals migrationVersion when durable version was missing but data exists.
 */
function adoptExistingProductionRegistry(
  path: string,
  authoritativeVersion: number | null,
): ProductionMigrationSummary {
  const loaded = loadPeopleRegistryFromPersistence()
  if (loaded.loadedKarkuns) {
    setNextKarkunNum(loaded.nextKarkunNum)
  }
  initializeComplianceDefaults()

  if (authoritativeVersion !== MIGRATION_VERSION) {
    getRepositories().settings.setMigrationVersion(MIGRATION_VERSION)
  }

  const summary = buildAdoptSummary()
  migrationCompleted = true
  lastMigrationSummary = summary
  kc004cTraceRegistry({
    caller: 'runProductionDataMigration',
    path,
    after: MOCK_KARKUN_REGISTRY.length,
    migrationVersion: MIGRATION_VERSION,
    extra: {
      authoritativeVersion,
      registryCount: countInMemoryProductionRegistry(),
      note: 'KC-004H — refused full seed; adopted existing production registry',
    },
  })
  return summary
}

export async function runProductionDataMigration(
  options: ProductionMigrationOptions = {},
): Promise<ProductionMigrationSummary> {
  // Same-session short-circuit only when in-memory registry is already populated.
  // If MOCK was cleared (HMR / reset) while this flag stayed true, fall through and reload.
  if (migrationCompleted && lastMigrationSummary && MOCK_KARKUN_REGISTRY.length > 0) {
    kc004cTraceRegistry({
      caller: 'runProductionDataMigration',
      path: 'same-session-short-circuit',
      after: MOCK_KARKUN_REGISTRY.length,
      migrationVersion: lastMigrationSummary.migrationVersion,
    })
    return lastMigrationSummary
  }

  // KC-004D — authoritative migration version (not cache-only).
  const authoritativeVersion = unwrapRepository(
    await getRepositories().settings.resolveMigrationVersion(),
    null,
  )
  const forceFullSeed = options.forceFullSeed === true

  // KC-004H — durable registry existence (not transient memory alone).
  const {
    authoritativeCount,
    memoryCount,
    durableCount,
    durableResolveFailed,
    refuseBecauseUncertain,
  } = await resolveAuthoritativeRegistryCount(forceFullSeed)
  const registryExists = authoritativeCount > 0

  kc004cTraceRegistry({
    caller: 'runProductionDataMigration',
    phase: 'decision',
    before: authoritativeCount,
    migrationVersion: authoritativeVersion,
    extra: {
      expectedVersion: MIGRATION_VERSION,
      memoryCount,
      durableCount,
      durableResolveFailed,
      refuseBecauseUncertain,
      registryExists,
      forceFullSeed,
      note: 'KC-004H — registry existence from resolveRegistryCount() (durable), not memory alone',
    },
  })

  if (authoritativeVersion === MIGRATION_VERSION && registryExists) {
    return adoptExistingProductionRegistry('early-return-version-match', authoritativeVersion)
  }

  // Permanent production safeguard: never full-seed when durable registry exists
  // (or when durable existence cannot be confirmed and memory is empty).
  if (
    refuseBecauseUncertain ||
    shouldRefuseFullProductionSeed({
      existingRegistryCount: authoritativeCount,
      forceFullSeed: options.forceFullSeed,
    })
  ) {
    console.warn(
      '[KC-004H] Refusing full production seed — authoritative registry exists or uncertain',
      {
        authoritativeCount,
        memoryCount,
        durableCount,
        durableResolveFailed,
        refuseBecauseUncertain,
        authoritativeVersion,
      },
    )
    return adoptExistingProductionRegistry(
      refuseBecauseUncertain
        ? 'safeguard-uncertain-durable-read'
        : 'safeguard-existing-registry',
      authoritativeVersion,
    )
  }

  if (forceFullSeed && authoritativeCount > 0) {
    console.warn(
      '[KC-004H] forceFullSeed override — full production seed will run despite existing registry',
      { authoritativeCount, memoryCount, durableCount },
    )
  }

  const beforeFull = MOCK_KARKUN_REGISTRY.length
  kc004cTraceRegistry({
    caller: 'runProductionDataMigration',
    path: 'full-seed-reimport',
    phase: 'before-remove-import',
    before: beforeFull,
    migrationVersion: authoritativeVersion,
  })

  removeMaleKarkunsFromRegistry()
  const maleKarkuns = migrateMaleKarkunMaster()

  removeFemaleKarkunsFromRegistry()
  const femaleKarkuns = migrateFemaleKarkunMaster()

  initializeComplianceDefaults()

  const stats = getPeopleStatistics()
  const summary: ProductionMigrationSummary = {
    rukns: createEmptyImportSummary(0),
    maleKarkuns,
    femaleKarkuns,
    demoDataRemoved: true,
    runtimeStoresCleared: false,
    ruknsReplaced: false,
    migrationVersion: MIGRATION_VERSION,
    dashboardVerified: {
      totalRukns: stats.totalRukns,
      maleKarkuns: stats.totalMaleKarkuns,
      femaleKarkuns: stats.totalFemaleKarkuns,
      assignedKarkuns: stats.assignedKarkuns,
      unassignedKarkuns: stats.unassignedKarkuns,
    },
  }

  migrationCompleted = true
  lastMigrationSummary = summary

  getRepositories().settings.setMigrationVersion(MIGRATION_VERSION)
  persistPeopleRegistry(getNextKarkunNum())
  kc004cTraceRegistry({
    caller: 'runProductionDataMigration',
    path: 'full-seed-reimport',
    phase: 'after-persist',
    before: beforeFull,
    after: MOCK_KARKUN_REGISTRY.length,
    migrationVersion: MIGRATION_VERSION,
    extra: {
      maleImported: maleKarkuns.imported,
      femaleImported: femaleKarkuns.imported,
    },
  })

  if (import.meta.env.DEV) {
    console.info('[Production Migration — People Masters]', summary)
  }

  return summary
}

export function getProductionMigrationSummary(): ProductionMigrationSummary | null {
  return lastMigrationSummary
}

/** Diagnostics: whether production migration finished in this JS session. */
export function getProductionMigrationCompletedFlag(): boolean {
  return migrationCompleted
}

/** Test-only reset. */
export function resetProductionMigrationForTests(): void {
  migrationCompleted = false
  lastMigrationSummary = null
}

export function formatProductionMigrationReport(summary: ProductionMigrationSummary): string {
  const femaleBlankNames = summary.femaleKarkuns.otherErrors.filter((entry) =>
    entry.reason.includes('Name is required'),
  ).length

  const femaleBlankMobiles =
    summary.femaleKarkuns.invalidMobiles.filter((entry) =>
      entry.reason.includes('empty mobile'),
    ).length +
    summary.femaleKarkuns.otherErrors.filter((entry) =>
      entry.reason.toLowerCase().includes('empty mobile'),
    ).length

  return [
    `Female Karkuns imported: ${summary.femaleKarkuns.imported}`,
    `Female Karkuns skipped: ${summary.femaleKarkuns.skipped}`,
    `Duplicate mobile conflicts: ${summary.femaleKarkuns.duplicateMobiles.length}`,
    `Invalid mobile records: ${summary.femaleKarkuns.invalidMobiles.length}`,
    `Blank-name records: ${femaleBlankNames}`,
    `Blank-mobile records: ${femaleBlankMobiles}`,
    `Final Female Karkun count: ${summary.dashboardVerified.femaleKarkuns}`,
    `Male Karkuns preserved: ${summary.dashboardVerified.maleKarkuns}`,
    `Rukns preserved: ${summary.dashboardVerified.totalRukns}`,
    `Import exceptions: data/production/female-karkun-import-exceptions.csv`,
  ].join('\n')
}
