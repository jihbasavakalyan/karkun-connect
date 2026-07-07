import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ensureRegistration } from '@/services/jihWebPortalService'
import { ensureBaitulMaalRecord } from '@/services/baitulMaalService'
import { ensureIjtemaAttendanceRecord } from '@/services/ijtemaAttendanceService'
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
import { DEFAULT_PLACE } from '@/types/people.types'

type PeopleListener = () => void
const listeners = new Set<PeopleListener>()

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
  listeners.forEach((listener) => listener())
}

/** Notify subscribers after assignment-driven registry field updates. */
export function notifyPeopleRegistryChange(): void {
  notifyPeopleChange()
}

export function subscribeToPeopleStore(listener: PeopleListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
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

  return {
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
      k.assignmentStatus === 'Available',
  )
}

type ImportRow = {
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
