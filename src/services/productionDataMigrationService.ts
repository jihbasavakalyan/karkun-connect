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

const MIGRATION_VERSION = 3

let migrationCompleted = false
let lastMigrationSummary: ProductionMigrationSummary | null = null

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

export function runProductionDataMigration(): ProductionMigrationSummary {
  // Same-session short-circuit only when in-memory registry is already populated.
  // If MOCK was cleared (HMR / reset) while this flag stayed true, fall through and reload.
  if (migrationCompleted && lastMigrationSummary && MOCK_KARKUN_REGISTRY.length > 0) {
    return lastMigrationSummary
  }

  const storedVersion = unwrapRepository(getRepositories().settings.getMigrationVersion(), null)

  if (storedVersion === MIGRATION_VERSION && hasPersistedKarkunRegistry()) {
    const loaded = loadPeopleRegistryFromPersistence()
    if (loaded.loadedKarkuns) {
      setNextKarkunNum(loaded.nextKarkunNum)
      initializeComplianceDefaults()
      const stats = getPeopleStatistics()
      const summary: ProductionMigrationSummary = {
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
      migrationCompleted = true
      lastMigrationSummary = summary
      return summary
    }
  }

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
