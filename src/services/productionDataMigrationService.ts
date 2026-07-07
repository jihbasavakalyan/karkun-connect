import {
  FEMALE_KARKUN_PRODUCTION_RECORDS,
  MALE_KARKUN_PRODUCTION_RECORDS,
  RUKN_PRODUCTION_RECORDS,
  toProductionImportRow,
} from '@/data/production'
import { ruknMaster } from '@/data/ruknMaster'
import { clearPeopleAuditLog } from '@/lib/peopleAuditLog'
import {
  clearKarkunRegistry,
  clearRuknMaster,
  getAllKarkuns,
  getPeopleStatistics,
  importKarkunsFromRows,
  importRuknsFromRows,
  replaceRuknMaster,
  resetNextKarkunId,
} from '@/lib/peopleStore'
import { isValidMobileFormat } from '@/lib/mobileValidation'
import { clearActivityLogStore } from '@/stores/activityLogStore'
import { clearAnnexure1Store } from '@/stores/annexure1Store'
import { clearAssignmentStore } from '@/stores/assignmentStore'
import { clearBaitulMaalStore } from '@/stores/baitulMaalStore'
import { clearFollowUpStore } from '@/stores/followUpStore'
import { clearIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { clearJihWebPortalStore } from '@/stores/jihWebPortalStore'
import {
  ensureBaitulMaalRecord,
  resetBaitulMaalComplianceInitialization,
} from '@/services/baitulMaalService'
import {
  ensureIjtemaAttendanceRecord,
  resetIjtemaAttendanceComplianceInitialization,
} from '@/services/ijtemaAttendanceService'
import {
  ensureRegistration,
  resetJihWebPortalComplianceInitialization,
} from '@/services/jihWebPortalService'
import type { ImportSummary } from '@/types/people.types'
import type { ProductionMigrationSummary } from '@/types/productionMigration'

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

function countValidProductionRukns(): number {
  return RUKN_PRODUCTION_RECORDS.filter((record) => isValidMobileFormat(record.mobile)).length
}

function clearRuntimeDemoStores(): void {
  clearAssignmentStore()
  clearAnnexure1Store()
  clearFollowUpStore()
  clearJihWebPortalStore()
  clearBaitulMaalStore()
  clearIjtemaAttendanceStore()
  clearActivityLogStore()
  clearPeopleAuditLog()
  resetJihWebPortalComplianceInitialization()
  resetBaitulMaalComplianceInitialization()
  resetIjtemaAttendanceComplianceInitialization()
}

function removeDemoKarkuns(): void {
  clearKarkunRegistry()
  resetNextKarkunId(1)
}

function migrateProductionRukns(): { summary: ImportSummary; replaced: boolean } {
  const rows = RUKN_PRODUCTION_RECORDS.map(toProductionImportRow)
  const validCount = countValidProductionRukns()

  if (validCount === 0) {
    return {
      summary: {
        ...createEmptyImportSummary(rows.length),
        skipped: rows.length,
        invalidMobiles: rows.map((row, index) => ({
          row: index + 2,
          name: row.name,
          mobile: row.mobile,
          reason: 'Verified mobile number required for production import.',
        })),
      },
      replaced: false,
    }
  }

  const existingRukns = [...ruknMaster]
  clearRuknMaster()
  const summary = importRuknsFromRows(rows, 'Production Migration')

  if (summary.imported === 0) {
    replaceRuknMaster(existingRukns)
    return { summary, replaced: false }
  }

  return { summary, replaced: true }
}

function dedupeKarkunProductionRows(
  maleRows: ReturnType<typeof toProductionImportRow>[],
  femaleRows: ReturnType<typeof toProductionImportRow>[],
): {
  maleRows: ReturnType<typeof toProductionImportRow>[]
  femaleRows: ReturnType<typeof toProductionImportRow>[]
  crossDuplicates: ImportSummary['duplicateMobiles']
} {
  const seenMobiles = new Set<string>()
  const crossDuplicates: ImportSummary['duplicateMobiles'] = []

  const filterRows = (
    rows: ReturnType<typeof toProductionImportRow>[],
    source: 'Male Karkun Master' | 'Female Karkun Master',
  ) => {
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

    return kept
  }

  return {
    maleRows: filterRows(maleRows, 'Male Karkun Master'),
    femaleRows: filterRows(femaleRows, 'Female Karkun Master'),
    crossDuplicates,
  }
}

function migrateProductionKarkuns(): {
  male: ImportSummary
  female: ImportSummary
} {
  const maleSource = MALE_KARKUN_PRODUCTION_RECORDS.map(toProductionImportRow)
  const femaleSource = FEMALE_KARKUN_PRODUCTION_RECORDS.map(toProductionImportRow)
  const { maleRows, femaleRows, crossDuplicates } = dedupeKarkunProductionRows(
    maleSource,
    femaleSource,
  )

  const male = importKarkunsFromRows(maleRows, 'Production Migration')
  const female = importKarkunsFromRows(femaleRows, 'Production Migration')

  if (crossDuplicates.length > 0) {
    male.duplicateMobiles.push(...crossDuplicates)
    male.skipped += crossDuplicates.length
  }

  return { male, female }
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

  clearRuntimeDemoStores()
  removeDemoKarkuns()

  const { summary: rukns, replaced: ruknsReplaced } = migrateProductionRukns()
  const { male: maleKarkuns, female: femaleKarkuns } = migrateProductionKarkuns()

  initializeComplianceDefaults()

  const stats = getPeopleStatistics()
  const summary: ProductionMigrationSummary = {
    rukns,
    maleKarkuns,
    femaleKarkuns,
    demoDataRemoved: true,
    runtimeStoresCleared: true,
    ruknsReplaced: ruknsReplaced,
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
    console.info('[Production Migration]', summary)
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

  return [
    `Rukns imported: ${summary.rukns.imported}`,
    `Male Karkuns imported: ${summary.maleKarkuns.imported}`,
    `Female Karkuns imported: ${summary.femaleKarkuns.imported}`,
    `Skipped records: ${skippedCount}`,
    `Duplicate records detected: ${duplicateCount}`,
    `Demo data removed: ${summary.demoDataRemoved ? 'Yes' : 'No'}`,
    `Rukn master replaced: ${summary.ruknsReplaced ? 'Yes' : 'No (awaiting verified mobiles)'}`,
    `Dashboard — Rukns: ${summary.dashboardVerified.totalRukns}, Male Karkuns: ${summary.dashboardVerified.maleKarkuns}, Female Karkuns: ${summary.dashboardVerified.femaleKarkuns}, Assigned: ${summary.dashboardVerified.assignedKarkuns}, Unassigned: ${summary.dashboardVerified.unassignedKarkuns}`,
  ].join('\n')
}
