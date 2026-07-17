import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ensureRegistration } from '@/services/jihWebPortalService'
import { ensureBaitulMaalRecord } from '@/services/baitulMaalService'
import { ensureIjtemaAttendanceRecord } from '@/services/ijtemaAttendanceService'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import {
  getNextRuknId,
  getRuknById,
  ruknMaster,
  type Rukn,
} from '@/data/ruknMaster'
import { findPossibleNameDuplicates } from '@/lib/nameMatching'
import { logPeopleAudit } from '@/lib/peopleAuditLog'
import {
  formatMobileValidationError,
  isValidMobileFormat,
  mobilesMatch,
  normalizeMobile,
} from '@/lib/mobileValidation'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import type {
  ImportSummary,
  PersonContactInput,
  PersonGender,
  PersonKind,
  PersonStatus,
  PeopleStatistics,
} from '@/types/people.types'
import type { ConflictResolution } from '@/types/dataMigration'
import { DEFAULT_PLACE } from '@/types/people.types'
import { persistPeopleRegistry } from '@/lib/peopleRegistryPersistence'
import {
  emitPeopleRegistryChange,
  subscribeToPeopleStore,
} from '@/lib/peopleRegistryEvents'
import { traceRegistryStage } from '@/lib/registryHydrationTrace'
import {
  createIncidentOperationId,
  traceMetricSnapshot,
  traceMutation,
  traceStoreSnapshot,
} from '@/lib/incidentTraceCollector'

export { subscribeToPeopleStore }

export type MobileLookupResult = {
  kind: PersonKind
  id: string
  name: string
}

export type PeopleMutationResult = {
  success: boolean
  error?: string
  needsMobileConfirm?: boolean
  existingOwner?: MobileLookupResult
}

function notifyPeopleChange(): void {
  emitPeopleRegistryChange()
  savePeopleRegistry()
}

/** Notify subscribers after assignment-driven registry field updates. */
export function notifyPeopleRegistryChange(): void {
  const before = getPeopleStatistics()
  notifyPeopleChange()
  const after = getPeopleStatistics()

  const operationId = createIncidentOperationId('people-registry-notify')
  traceMutation({
    operationId,
    entity: 'people_registry',
    field: 'assignedKarkuns',
    before: before.assignedKarkuns,
    after: after.assignedKarkuns,
    caller: 'notifyPeopleRegistryChange',
    reason: 'registry notify and persist',
    sourceOfTruth: 'Derived Calculation',
  })
  traceMutation({
    operationId,
    entity: 'people_registry',
    field: 'unassignedKarkuns',
    before: before.unassignedKarkuns,
    after: after.unassignedKarkuns,
    caller: 'notifyPeopleRegistryChange',
    reason: 'registry notify and persist',
    sourceOfTruth: 'Derived Calculation',
  })
  traceStoreSnapshot('people_registry', {
    caller: 'notifyPeopleRegistryChange',
    sourceOfTruth: 'Derived Calculation',
    connectedCount: after.assignedKarkuns,
    availableCount: after.unassignedKarkuns,
  })

  traceRegistryStage('6_after_notifyPeopleRegistryChange')
}

function nowIso(): string {
  return new Date().toISOString()
}

function syncKarkunCampaignStatus(karkun: KarkunRegistryRecord): void {
  if (karkun.status === 'inactive') {
    karkun.campaignStatus = 'inactive'
    return
  }

  if (karkun.assignmentStatus === 'Assigned') {
    karkun.campaignStatus = 'active'
    return
  }

  karkun.campaignStatus = 'not_assigned'
}

export function findMobileOwner(
  mobile: string,
  exclude?: { kind: PersonKind; id: string },
): MobileLookupResult | undefined {
  const normalized = normalizeMobile(mobile)
  if (!normalized) {
    return undefined
  }

  for (const rukn of ruknMaster) {
    if (exclude?.kind === 'rukn' && exclude.id === rukn.id) {
      continue
    }
    if (rukn.mobile && mobilesMatch(rukn.mobile, mobile)) {
      return { kind: 'rukn', id: rukn.id, name: rukn.name }
    }
  }

  for (const karkun of MOCK_KARKUN_REGISTRY) {
    if (karkun.isArchived) {
      continue
    }
    if (exclude?.kind === 'karkun' && exclude.id === karkun.id) {
      continue
    }
    if (mobilesMatch(karkun.mobile, mobile)) {
      return { kind: 'karkun', id: karkun.id, name: karkun.name }
    }
  }

  return undefined
}

export function validateMobileForPerson(
  mobile: string,
  exclude?: { kind: PersonKind; id: string },
): PeopleMutationResult {
  if (!mobile.trim()) {
    return { success: false, error: 'Cannot save empty mobile number.' }
  }

  if (!isValidMobileFormat(mobile)) {
    return { success: false, error: formatMobileValidationError() }
  }

  const owner = findMobileOwner(mobile, exclude)
  if (owner) {
    return {
      success: false,
      needsMobileConfirm: true,
      existingOwner: owner,
      error: `Mobile number is already used by ${owner.name} (${owner.kind}).`,
    }
  }

  return { success: true }
}

export function getAllRukns(): Rukn[] {
  return [...ruknMaster]
}

export function getAllKarkuns(includeArchived = false): KarkunRegistryRecord[] {
  return MOCK_KARKUN_REGISTRY.filter((k) => includeArchived || !k.isArchived)
}

export function getPeopleStatistics(): PeopleStatistics {
  const rukns = ruknMaster
  const karkuns = getAllKarkuns()

  const maleRukns = rukns.filter((r) => r.gender === 'Male').length
  const femaleRukns = rukns.filter((r) => r.gender === 'Female').length
  const maleKarkuns = karkuns.filter((k) => k.gender === 'Male').length
  const femaleKarkuns = karkuns.filter((k) => k.gender === 'Female').length
  const assignedKarkuns = karkuns.filter((k) => k.assignmentStatus === 'Assigned').length
  const unassignedKarkuns = karkuns.filter((k) => k.assignmentStatus === 'Available').length

  const activeRukns = rukns.filter((r) => r.status === 'active').length
  const inactiveRukns = rukns.filter((r) => r.status === 'inactive').length
  const activeKarkuns = karkuns.filter((k) => k.status === 'active').length
  const inactiveKarkuns = karkuns.filter((k) => k.status === 'inactive').length

  const stats = {
    totalRukns: rukns.length,
    maleRukns,
    femaleRukns,
    totalMaleKarkuns: maleKarkuns,
    totalFemaleKarkuns: femaleKarkuns,
    assignedKarkuns,
    unassignedKarkuns,
    activeUsers: activeRukns + activeKarkuns,
    inactiveUsers: inactiveRukns + inactiveKarkuns,
  }

  traceMetricSnapshot('people_registry_metrics', {
    caller: 'getPeopleStatistics',
    sourceOfTruth: 'Derived Calculation',
    connected: stats.assignedKarkuns,
    unconnected: stats.unassignedKarkuns,
    assignedKarkuns: stats.assignedKarkuns,
    unassignedKarkuns: stats.unassignedKarkuns,
    totalRukns: stats.totalRukns,
  })

  return stats
}

export function createRukn(
  input: PersonContactInput,
  updatedBy = 'Administrator',
): PeopleMutationResult {
  const mobileCheck = validateMobileForPerson(input.mobile)
  if (!mobileCheck.success && !mobileCheck.needsMobileConfirm) {
    return mobileCheck
  }
  if (mobileCheck.needsMobileConfirm) {
    return mobileCheck
  }

  const timestamp = nowIso()
  const rukn: Rukn = {
    id: getNextRuknId(),
    name: input.name.trim(),
    gender: input.gender,
    mobile: normalizeMobile(input.mobile),
    whatsapp: input.whatsapp?.trim() || undefined,
    place: input.place.trim() || DEFAULT_PLACE,
    status: input.status,
    notes: input.notes?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    updatedBy,
  }

  ruknMaster.push(rukn)
  logPeopleAudit({
    personKind: 'rukn',
    personId: rukn.id,
    personName: rukn.name,
    action: 'create',
    updatedBy,
  })
  notifyPeopleChange()
  return { success: true }
}

export function updateRukn(
  id: string,
  input: Partial<PersonContactInput>,
  updatedBy = 'Administrator',
  options?: { confirmMobileOverwrite?: boolean },
): PeopleMutationResult {
  const rukn = getRuknById(id)
  if (!rukn) {
    return { success: false, error: 'Rukn not found.' }
  }

  if (input.mobile !== undefined) {
    if (!input.mobile.trim()) {
      return { success: false, error: 'Cannot save empty mobile number.' }
    }
  }

  if (input.mobile !== undefined && input.mobile !== rukn.mobile) {
    const mobileCheck = validateMobileForPerson(input.mobile, { kind: 'rukn', id })
    if (!mobileCheck.success) {
      if (mobileCheck.needsMobileConfirm && options?.confirmMobileOverwrite) {
        logPeopleAudit({
          personKind: 'rukn',
          personId: id,
          personName: rukn.name,
          action: 'mobile_update',
          field: 'mobile',
          previousValue: rukn.mobile,
          newValue: input.mobile,
          updatedBy,
        })
      } else if (mobileCheck.needsMobileConfirm) {
        return mobileCheck
      } else {
        return mobileCheck
      }
    }
  }

  const previousStatus = rukn.status

  if (input.name !== undefined) rukn.name = input.name.trim()
  if (input.gender !== undefined) rukn.gender = input.gender
  if (input.mobile !== undefined) rukn.mobile = normalizeMobile(input.mobile)
  if (input.whatsapp !== undefined) rukn.whatsapp = input.whatsapp.trim() || undefined
  if (input.place !== undefined) rukn.place = input.place.trim() || DEFAULT_PLACE
  if (input.status !== undefined) rukn.status = input.status
  if (input.notes !== undefined) rukn.notes = input.notes.trim() || undefined

  rukn.updatedAt = nowIso()
  rukn.updatedBy = updatedBy

  logPeopleAudit({
    personKind: 'rukn',
    personId: id,
    personName: rukn.name,
    action: input.status !== undefined && input.status !== previousStatus ? 'status_change' : 'update',
    updatedBy,
  })

  notifyPeopleChange()
  return { success: true }
}

export function setRuknStatus(
  id: string,
  status: PersonStatus,
  updatedBy = 'Administrator',
): PeopleMutationResult {
  return updateRukn(id, { status }, updatedBy)
}

export function bulkSetRuknStatus(
  ids: string[],
  status: PersonStatus,
  updatedBy = 'Administrator',
): void {
  for (const id of ids) {
    setRuknStatus(id, status, updatedBy)
  }
}

let nextKarkunNum = 13

export function getNextKarkunNum(): number {
  return nextKarkunNum
}

export function setNextKarkunNum(value: number): void {
  nextKarkunNum = value
}

function savePeopleRegistry(): void {
  persistPeopleRegistry(nextKarkunNum)
}

export function clearKarkunRegistry(): void {
  MOCK_KARKUN_REGISTRY.length = 0
  nextKarkunNum = 1
  notifyPeopleChange()
}

export function removeMaleKarkunsFromRegistry(): void {
  const remaining = MOCK_KARKUN_REGISTRY.filter((karkun) => karkun.gender === 'Female')
  MOCK_KARKUN_REGISTRY.length = 0
  MOCK_KARKUN_REGISTRY.push(...remaining)

  const maxNum = remaining.reduce((max, karkun) => {
    const num = Number.parseInt(karkun.id.replace('kr-', ''), 10)
    return Number.isNaN(num) ? max : Math.max(max, num)
  }, 0)
  nextKarkunNum = maxNum + 1
  notifyPeopleChange()
}

export function removeFemaleKarkunsFromRegistry(): void {
  const remaining = MOCK_KARKUN_REGISTRY.filter((karkun) => karkun.gender === 'Male')
  MOCK_KARKUN_REGISTRY.length = 0
  MOCK_KARKUN_REGISTRY.push(...remaining)

  const maxNum = remaining.reduce((max, karkun) => {
    const num = Number.parseInt(karkun.id.replace('kr-', ''), 10)
    return Number.isNaN(num) ? max : Math.max(max, num)
  }, 0)
  nextKarkunNum = maxNum + 1
  notifyPeopleChange()
}

export function resetNextKarkunId(start = 1): void {
  nextKarkunNum = start
}

export function replaceRuknMaster(records: Rukn[]): void {
  ruknMaster.length = 0
  ruknMaster.push(...records)
  notifyPeopleChange()
}

export function clearRuknMaster(): void {
  ruknMaster.length = 0
  notifyPeopleChange()
}

export function createKarkun(
  input: PersonContactInput & { area?: string; address?: string },
  updatedBy = 'Administrator',
): PeopleMutationResult {
  const mobileCheck = validateMobileForPerson(input.mobile)
  if (!mobileCheck.success && !mobileCheck.needsMobileConfirm) {
    return mobileCheck
  }
  if (mobileCheck.needsMobileConfirm) {
    return mobileCheck
  }

  const timestamp = nowIso()
  const id = `kr-${String(nextKarkunNum++).padStart(3, '0')}`

  const karkun: KarkunRegistryRecord = {
    id,
    name: input.name.trim(),
    gender: input.gender,
    mobile: normalizeMobile(input.mobile),
    whatsapp: input.whatsapp?.trim() || undefined,
    place: input.place.trim() || DEFAULT_PLACE,
    status: input.status,
    fatherHusbandName: input.fatherHusbandName?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    updatedBy,
    address: input.address?.trim() ?? '',
    area: input.area?.trim() ?? '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: input.notes?.trim() ?? '',
    isArchived: false,
  }

  syncKarkunCampaignStatus(karkun)
  MOCK_KARKUN_REGISTRY.push(karkun)
  ensureRegistration(id)
  ensureBaitulMaalRecord(id)
  ensureIjtemaAttendanceRecord(id)

  logPeopleAudit({
    personKind: 'karkun',
    personId: id,
    personName: karkun.name,
    action: 'create',
    updatedBy,
  })

  notifyPeopleChange()
  return { success: true }
}

export function updateKarkun(
  id: string,
  input: Partial<PersonContactInput & { area?: string; address?: string }>,
  updatedBy = 'Administrator',
  options?: { confirmMobileOverwrite?: boolean },
): PeopleMutationResult {
  const karkun = MOCK_KARKUN_REGISTRY.find((k) => k.id === id && !k.isArchived)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  if (input.mobile !== undefined) {
    if (!input.mobile.trim()) {
      return { success: false, error: 'Cannot save empty mobile number.' }
    }
  }

  if (input.mobile !== undefined && input.mobile !== karkun.mobile) {
    const mobileCheck = validateMobileForPerson(input.mobile, { kind: 'karkun', id })
    if (!mobileCheck.success) {
      if (mobileCheck.needsMobileConfirm && options?.confirmMobileOverwrite) {
        logPeopleAudit({
          personKind: 'karkun',
          personId: id,
          personName: karkun.name,
          action: 'mobile_update',
          field: 'mobile',
          previousValue: karkun.mobile,
          newValue: input.mobile,
          updatedBy,
        })
      } else if (mobileCheck.needsMobileConfirm) {
        return mobileCheck
      } else {
        return mobileCheck
      }
    }
  }

  const previousStatus = karkun.status

  if (input.name !== undefined) karkun.name = input.name.trim()
  if (input.gender !== undefined) karkun.gender = input.gender
  if (input.mobile !== undefined) karkun.mobile = normalizeMobile(input.mobile)
  if (input.whatsapp !== undefined) karkun.whatsapp = input.whatsapp.trim() || undefined
  if (input.place !== undefined) karkun.place = input.place.trim() || DEFAULT_PLACE
  if (input.status !== undefined) karkun.status = input.status
  if (input.fatherHusbandName !== undefined)
    karkun.fatherHusbandName = input.fatherHusbandName.trim() || undefined
  if (input.notes !== undefined) karkun.notes = input.notes.trim()
  if (input.area !== undefined) karkun.area = input.area.trim()
  if (input.address !== undefined) karkun.address = input.address.trim()

  karkun.updatedAt = nowIso()
  karkun.updatedBy = updatedBy
  syncKarkunCampaignStatus(karkun)

  logPeopleAudit({
    personKind: 'karkun',
    personId: id,
    personName: karkun.name,
    action:
      input.status !== undefined && input.status !== previousStatus ? 'status_change' : 'update',
    updatedBy,
  })

  notifyPeopleChange()
  return { success: true }
}

export function setKarkunStatus(
  id: string,
  status: PersonStatus,
  updatedBy = 'Administrator',
): PeopleMutationResult {
  return updateKarkun(id, { status }, updatedBy)
}

export function bulkSetKarkunStatus(
  ids: string[],
  status: PersonStatus,
  updatedBy = 'Administrator',
): void {
  for (const id of ids) {
    setKarkunStatus(id, status, updatedBy)
  }
}

export function canAssignByGender(ruknId: string, karkunId: string): boolean {
  const rukn = getRuknById(ruknId)
  const karkun = MOCK_KARKUN_REGISTRY.find((k) => k.id === karkunId)
  if (!rukn || !karkun) {
    return false
  }
  return rukn.gender === karkun.gender
}

export function getCompatibleRuknsForKarkun(karkunId: string): Rukn[] {
  const karkun = MOCK_KARKUN_REGISTRY.find((k) => k.id === karkunId)
  if (!karkun) {
    return []
  }

  // Business rule: one Rukn may support many active Karkuns, so a Rukn stays
  // selectable even after it already has assignments. Only gender/active are filtered.
  return ruknMaster.filter(
    (rukn) => rukn.status === 'active' && rukn.gender === karkun.gender,
  )
}

export function getCompatibleKarkunsForRukn(ruknId: string): KarkunRegistryRecord[] {
  const rukn = getRuknById(ruknId)
  if (!rukn) {
    return []
  }
  return getAllKarkuns().filter(
    (k) =>
      k.status === 'active' &&
      k.gender === rukn.gender &&
      k.assignmentStatus === 'Available' &&
      getActiveAssignmentsForKarkun(k.id).length === 0,
  )
}

type ImportRow = {
  id?: string
  name: string
  gender: PersonGender
  mobile: string
  whatsapp?: string
  place?: string
  status?: PersonStatus
  notes?: string
  area?: string
  address?: string
}

function parseGender(value: string): PersonGender | null {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'male' || normalized === 'm') return 'Male'
  if (normalized === 'female' || normalized === 'f') return 'Female'
  return null
}

function parseStatus(value: string | undefined): PersonStatus {
  const normalized = (value ?? 'active').trim().toLowerCase()
  return normalized === 'inactive' ? 'inactive' : 'active'
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

function importPeopleFromRows(
  rows: ImportRow[],
  kind: PersonKind,
  updatedBy: string,
  createFn: (input: PersonContactInput & { area?: string; address?: string }, by: string) => PeopleMutationResult,
): ImportSummary {
  const summary = createEmptyImportSummary(rows.length)
  const seenMobiles = new Map<string, number>()

  rows.forEach((row, index) => {
    const rowNum = index + 2

    if (!row.name.trim()) {
      summary.otherErrors.push({
        row: rowNum,
        name: row.name,
        mobile: row.mobile,
        reason: 'Name is required.',
      })
      summary.skipped++
      return
    }

    const gender = typeof row.gender === 'string' ? parseGender(row.gender) : row.gender
    if (!gender) {
      summary.otherErrors.push({
        row: rowNum,
        name: row.name,
        mobile: row.mobile,
        reason: 'Invalid gender. Use Male or Female.',
      })
      summary.skipped++
      return
    }

    const mobileKey = normalizeMobile(row.mobile)
    if (!row.mobile.trim()) {
      summary.invalidMobiles.push({
        row: rowNum,
        name: row.name,
        mobile: row.mobile,
        reason: 'Cannot save empty mobile number.',
      })
      summary.skipped++
      return
    }

    if (!isValidMobileFormat(row.mobile)) {
      summary.invalidMobiles.push({
        row: rowNum,
        name: row.name,
        mobile: row.mobile,
        reason: formatMobileValidationError(),
      })
      summary.skipped++
      return
    }

    if (seenMobiles.has(mobileKey)) {
      summary.duplicateMobiles.push({
        row: rowNum,
        name: row.name,
        mobile: row.mobile,
        existingPerson: `Row ${seenMobiles.get(mobileKey)} in import file`,
      })
      summary.skipped++
      return
    }
    seenMobiles.set(mobileKey, rowNum)

    const owner = findMobileOwner(row.mobile)
    if (owner) {
      summary.existingRecords.push({
        row: rowNum,
        name: row.name,
        mobile: row.mobile,
        existingPerson: `${owner.name} (${owner.kind})`,
      })
      summary.skipped++
      return
    }

    const similarNames = findPossibleNameDuplicates(row.name, kind)
    for (const match of similarNames) {
      summary.possibleNameDuplicates.push({
        row: rowNum,
        name: row.name,
        similarTo: match.name,
        existingPerson: match.name,
      })
    }

    const place = row.place?.trim() || DEFAULT_PLACE
    const result = createFn(
      {
        name: row.name,
        gender,
        mobile: row.mobile,
        whatsapp: row.whatsapp,
        place,
        status: parseStatus(row.status),
        notes: row.notes,
        area: row.area,
        address: row.address,
      },
      updatedBy,
    )

    if (result.success) {
      summary.imported++
      if (kind === 'rukn') {
        logPeopleAudit({
          personKind: 'rukn',
          personId: 'import',
          personName: row.name,
          action: 'import',
          updatedBy,
        })
      }
    } else {
      summary.otherErrors.push({
        row: rowNum,
        name: row.name,
        mobile: row.mobile,
        reason: result.error ?? 'Import failed.',
      })
      summary.skipped++
    }
  })

  return summary
}

export function importRuknsFromRows(
  rows: ImportRow[],
  updatedBy = 'Administrator',
): ImportSummary {
  return importPeopleFromRows(rows, 'rukn', updatedBy, (input, by) => createRukn(input, by))
}

export function importKarkunsFromRows(
  rows: ImportRow[],
  updatedBy = 'Administrator',
): ImportSummary {
  return importPeopleFromRows(rows, 'karkun', updatedBy, (input, by) => createKarkun(input, by))
}

export type PeopleRegistrySnapshot = {
  rukns: Rukn[]
  karkuns: KarkunRegistryRecord[]
  nextKarkunNum: number
}

export function snapshotPeopleRegistry(): PeopleRegistrySnapshot {
  return {
    rukns: getAllRukns(),
    karkuns: getAllKarkuns(true),
    nextKarkunNum,
  }
}

export function restorePeopleRegistrySnapshot(snapshot: PeopleRegistrySnapshot): void {
  ruknMaster.length = 0
  ruknMaster.push(...snapshot.rukns)
  MOCK_KARKUN_REGISTRY.length = 0
  MOCK_KARKUN_REGISTRY.push(...snapshot.karkuns)
  nextKarkunNum = snapshot.nextKarkunNum
  notifyPeopleChange()
}

function findExistingByMigrationRow(
  row: ImportRow & { id?: string },
  kind: PersonKind,
): MobileLookupResult | undefined {
  if (row.id) {
    if (kind === 'rukn') {
      const rukn = getRuknById(row.id)
      if (rukn) {
        return { kind: 'rukn', id: rukn.id, name: rukn.name }
      }
    } else {
      const karkun = MOCK_KARKUN_REGISTRY.find((k) => k.id === row.id && !k.isArchived)
      if (karkun) {
        return { kind: 'karkun', id: karkun.id, name: karkun.name }
      }
    }
  }

  if (row.mobile.trim()) {
    return findMobileOwner(row.mobile)
  }

  return undefined
}

function mergeContactInput(
  existing: PersonContactInput & { area?: string; address?: string },
  incoming: ImportRow,
): PersonContactInput & { area?: string; address?: string } {
  return {
    name: existing.name?.trim() || incoming.name.trim(),
    gender: existing.gender || incoming.gender,
    mobile: existing.mobile?.trim() || incoming.mobile.trim(),
    whatsapp: existing.whatsapp?.trim() || incoming.whatsapp?.trim() || undefined,
    place: existing.place?.trim() || incoming.place?.trim() || DEFAULT_PLACE,
    status: existing.status || parseStatus(incoming.status),
    notes: existing.notes?.trim() || incoming.notes?.trim() || undefined,
    area: existing.area?.trim() || incoming.area?.trim() || undefined,
    address: existing.address?.trim() || incoming.address?.trim() || undefined,
  }
}

function createRuknForMigration(
  input: PersonContactInput,
  updatedBy: string,
): PeopleMutationResult {
  if (input.mobile.trim()) {
    return createRukn(input, updatedBy)
  }

  const timestamp = nowIso()
  const rukn: Rukn = {
    id: getNextRuknId(),
    name: input.name.trim(),
    gender: input.gender,
    mobile: '',
    whatsapp: input.whatsapp?.trim() || undefined,
    place: input.place.trim() || DEFAULT_PLACE,
    status: input.status,
    notes: input.notes?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    updatedBy,
  }

  ruknMaster.push(rukn)
  logPeopleAudit({
    personKind: 'rukn',
    personId: rukn.id,
    personName: rukn.name,
    action: 'import',
    updatedBy,
  })
  notifyPeopleChange()
  return { success: true }
}

export type MigrationImportStats = {
  imported: number
  updated: number
  skipped: number
  duplicates: number
  errors: number
}

export function importPeopleWithMigrationPolicy(
  rows: ImportRow[],
  kind: PersonKind,
  conflictResolution: ConflictResolution,
  updatedBy = 'Data Migration',
): MigrationImportStats {
  const stats: MigrationImportStats = {
    imported: 0,
    updated: 0,
    skipped: 0,
    duplicates: 0,
    errors: 0,
  }

  const seenMobiles = new Set<string>()

  for (const row of rows) {
    if (!row.name.trim()) {
      stats.skipped++
      stats.errors++
      continue
    }

    const gender = typeof row.gender === 'string' ? parseGender(row.gender) : row.gender
    if (!gender) {
      stats.skipped++
      stats.errors++
      continue
    }

    if (kind === 'karkun' && !row.mobile.trim()) {
      stats.skipped++
      stats.errors++
      continue
    }

    if (row.mobile.trim()) {
      const mobileKey = normalizeMobile(row.mobile)
      if (!isValidMobileFormat(row.mobile)) {
        stats.skipped++
        stats.errors++
        continue
      }
      if (seenMobiles.has(mobileKey)) {
        stats.skipped++
        stats.duplicates++
        continue
      }
      seenMobiles.add(mobileKey)
    }

    const existing = findExistingByMigrationRow(row, kind)

    if (existing && existing.kind === kind) {
      if (conflictResolution === 'skip') {
        stats.skipped++
        stats.duplicates++
        continue
      }

      if (conflictResolution === 'merge') {
        if (kind === 'rukn') {
          const current = getRuknById(existing.id)
          if (!current) {
            stats.skipped++
            stats.errors++
            continue
          }
          const merged = mergeContactInput(
            {
              name: current.name,
              gender: current.gender,
              mobile: current.mobile,
              whatsapp: current.whatsapp,
              place: current.place,
              status: current.status,
              notes: current.notes,
            },
            row,
          )
          const result = updateRukn(existing.id, merged, updatedBy, {
            confirmMobileOverwrite: true,
          })
          if (result.success) {
            stats.updated++
          } else {
            stats.skipped++
            stats.errors++
          }
          continue
        }

        const current = MOCK_KARKUN_REGISTRY.find((k) => k.id === existing.id)
        if (!current) {
          stats.skipped++
          stats.errors++
          continue
        }
        const merged = mergeContactInput(
          {
            name: current.name,
            gender: current.gender,
            mobile: current.mobile,
            whatsapp: current.whatsapp,
            place: current.place,
            status: current.status,
            notes: current.notes,
            area: current.area,
            address: current.address,
          },
          row,
        )
        const result = updateKarkun(existing.id, merged, updatedBy, {
          confirmMobileOverwrite: true,
        })
        if (result.success) {
          stats.updated++
        } else {
          stats.skipped++
          stats.errors++
        }
        continue
      }

      if (kind === 'rukn') {
        const result = updateRukn(
          existing.id,
          {
            name: row.name,
            gender,
            mobile: row.mobile,
            whatsapp: row.whatsapp,
            place: row.place?.trim() || DEFAULT_PLACE,
            status: parseStatus(row.status),
            notes: row.notes,
          },
          updatedBy,
          { confirmMobileOverwrite: true },
        )
        if (result.success) {
          stats.updated++
        } else {
          stats.skipped++
          stats.errors++
        }
        continue
      }

      const result = updateKarkun(
        existing.id,
        {
          name: row.name,
          gender,
          mobile: row.mobile,
          whatsapp: row.whatsapp,
          place: row.place?.trim() || DEFAULT_PLACE,
          status: parseStatus(row.status),
          notes: row.notes,
          area: row.area,
          address: row.address,
        },
        updatedBy,
        { confirmMobileOverwrite: true },
      )
      if (result.success) {
        stats.updated++
      } else {
        stats.skipped++
        stats.errors++
      }
      continue
    }

    if (row.mobile.trim()) {
      const crossOwner = findMobileOwner(row.mobile)
      if (crossOwner) {
        stats.skipped++
        stats.duplicates++
        continue
      }
    }

    const createFn =
      kind === 'rukn'
        ? (input: PersonContactInput & { area?: string; address?: string }, by: string) =>
            createRuknForMigration(input, by)
        : (input: PersonContactInput & { area?: string; address?: string }, by: string) =>
            createKarkun(input, by)

    const result = createFn(
      {
        name: row.name,
        gender,
        mobile: row.mobile,
        whatsapp: row.whatsapp,
        place: row.place?.trim() || DEFAULT_PLACE,
        status: parseStatus(row.status),
        notes: row.notes,
        area: row.area,
        address: row.address,
      },
      updatedBy,
    )

    if (result.success) {
      stats.imported++
    } else {
      stats.skipped++
      stats.errors++
    }
  }

  return stats
}
