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
  hasPersistedKarkunRegistry,
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

function countExistingProductionRegistry(): number {
  const persisted = unwrapRepository(getRepositories().karkun.loadState(), {
    karkuns: [],
    nextKarkunNum: 1,
  })
  return Math.max(persisted.karkuns.length, MOCK_KARKUN_REGISTRY.length)
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
      registryCount: countExistingProductionRegistry(),
      note: 'KC-004D — refused full seed; adopted existing production registry',
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

  const authoritativeVersion = unwrapRepository(
    await getRepositories().settings.resolveMigrationVersion(),
    null,
  )
  const existingCount = countExistingProductionRegistry()

  kc004cTraceRegistry({
    caller: 'runProductionDataMigration',
    phase: 'decision',
    before: existingCount,
    migrationVersion: authoritativeVersion,
    extra: {
      expectedVersion: MIGRATION_VERSION,
      hasPersistedKarkunRegistry: hasPersistedKarkunRegistry(),
      forceFullSeed: options.forceFullSeed === true,
      note: 'KC-004D — uses resolveMigrationVersion() (authoritative), not cache-only',
    },
  })

  if (authoritativeVersion === MIGRATION_VERSION && hasPersistedKarkunRegistry()) {
    return adoptExistingProductionRegistry('early-return-version-match', authoritativeVersion)
  }

  // Permanent production safeguard: never full-seed when registry data already exists.
  if (
    shouldRefuseFullProductionSeed({
      existingRegistryCount: existingCount,
      forceFullSeed: options.forceFullSeed,
    })
  ) {
    console.warn(
      '[KC-004D] Refusing full production seed — registry already exists',
      { existingCount, authoritativeVersion },
    )
    return adoptExistingProductionRegistry('safeguard-existing-registry', authoritativeVersion)
  }

  if (options.forceFullSeed && existingCount > 0) {
    console.warn(
      '[KC-004D] forceFullSeed override — full production seed will run despite existing registry',
      { existingCount },
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
