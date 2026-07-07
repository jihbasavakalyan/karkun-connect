import {
  FEMALE_KARKUN_PRODUCTION_RECORDS,
  MALE_KARKUN_PRODUCTION_RECORDS,
  toProductionImportRow,
} from '@/data/production'
import {
  getAllKarkuns,
  getPeopleStatistics,
  importKarkunsFromRows,
  removeMaleKarkunsFromRegistry,
} from '@/lib/peopleStore'
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

const MIGRATION_VERSION = 2

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

function dedupeMaleProductionRows(
  maleRows: ReturnType<typeof toProductionImportRow>[],
): {
  maleRows: ReturnType<typeof toProductionImportRow>[]
  crossDuplicates: ImportSummary['duplicateMobiles']
} {
  const seenMobiles = new Set<string>()
  const crossDuplicates: ImportSummary['duplicateMobiles'] = []

  const kept: ReturnType<typeof toProductionImportRow>[] = []

  maleRows.forEach((row, index) => {
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
        existingPerson: 'Duplicate in Male Karkun Master',
      })
      return
    }

    seenMobiles.add(mobileKey)
    kept.push(row)
  })

  return { maleRows: kept, crossDuplicates }
}

function migrateMaleKarkunMaster(): ImportSummary {
  const maleSource = MALE_KARKUN_PRODUCTION_RECORDS.map(toProductionImportRow)
  const { maleRows, crossDuplicates } = dedupeMaleProductionRows(maleSource)
  const summary = importKarkunsFromRows(maleRows, 'Production Migration')

  if (crossDuplicates.length > 0) {
    summary.duplicateMobiles.push(...crossDuplicates)
    summary.skipped += crossDuplicates.length
  }

  return summary
}

function initializeComplianceDefaults(): void {
  for (const karkun of getAllKarkuns()) {
    ensureRegistration(karkun.id)
    ensureBaitulMaalRecord(karkun.id)
    ensureIjtemaAttendanceRecord(karkun.id)
  }
}

export function runProductionDataMigration(): ProductionMigrationSummary {
  if (migrationCompleted && lastMigrationSummary) {
    return lastMigrationSummary
  }

  removeMaleKarkunsFromRegistry()
  const maleKarkuns = migrateMaleKarkunMaster()
  initializeComplianceDefaults()

  const stats = getPeopleStatistics()
  const summary: ProductionMigrationSummary = {
    rukns: createEmptyImportSummary(0),
    maleKarkuns,
    femaleKarkuns: createEmptyImportSummary(FEMALE_KARKUN_PRODUCTION_RECORDS.length),
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

  if (import.meta.env.DEV) {
    console.info('[Production Migration — Male Karkun Master]', summary)
  }

  return summary
}

export function getProductionMigrationSummary(): ProductionMigrationSummary | null {
  return lastMigrationSummary
}

export function formatProductionMigrationReport(summary: ProductionMigrationSummary): string {
  const duplicateCount =
    summary.rukns.duplicateMobiles.length +
    summary.maleKarkuns.duplicateMobiles.length +
    summary.femaleKarkuns.duplicateMobiles.length

  const skippedCount =
    summary.rukns.skipped + summary.maleKarkuns.skipped + summary.femaleKarkuns.skipped

  const blankNameCount = summary.maleKarkuns.otherErrors.filter((entry) =>
    entry.reason.includes('Name is required'),
  ).length

  return [
    `Male Karkuns imported: ${summary.maleKarkuns.imported}`,
    `Male Karkuns skipped: ${summary.maleKarkuns.skipped}`,
    `Duplicate mobile conflicts: ${summary.maleKarkuns.duplicateMobiles.length}`,
    `Invalid mobile records: ${summary.maleKarkuns.invalidMobiles.length}`,
    `Blank-name records: ${blankNameCount}`,
    `Total skipped (all sources): ${skippedCount}`,
    `Duplicate records detected: ${duplicateCount}`,
    `Final Male Karkun count: ${summary.dashboardVerified.maleKarkuns}`,
    `Female Karkuns preserved: ${summary.dashboardVerified.femaleKarkuns}`,
    `Rukns preserved: ${summary.dashboardVerified.totalRukns}`,
  ].join('\n')
}
