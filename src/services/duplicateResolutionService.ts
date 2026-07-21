/**
 * KC-0070 — Duplicate Resolution business workflow.
 * Soft-archives duplicates only (never deletes). Reuses existing archive/persist paths.
 */

import { MOCK_KARKUN_REGISTRY, getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { normalizeMobile } from '@/lib/mobileValidation'
import { buildArchivePatch, bumpVersion } from '@/lib/preservation/softDelete'
import { notifyPeopleRegistryChange } from '@/lib/peopleStore'
import { appendConnectionLedgerEntry } from '@/services/connectionLedgerService'
import { getAllSubmittedForms } from '@/stores/annexure1Store'
import { getActivityLog, logActivity } from '@/stores/activityLogStore'
import { getAllAssignments } from '@/stores/assignmentStore'
import { getAllFollowUpRecords } from '@/stores/followUpStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type DuplicateRecordSnapshot = {
  id: string
  name: string
  mobile: string
  status: string
  displayStatus: string
  connectedRuknId: string
  connectedRuknName: string
  createdAt: string
  asn: string
  assignmentStatus: string
  activityCount: number
  visitCount: number
  followUpCount: number
  complianceHints: string
  historyCount: number
  isActiveConnected: boolean
  isArchived: boolean
  mergedInto?: string
}

export type DuplicateGroup = {
  mobileKey: string
  mobile: string
  members: DuplicateRecordSnapshot[]
  recommendedMasterId: string | null
  recommendationReason: string
  status: 'needs_review' | 'resolved'
}

export type DuplicateResolutionSummary = {
  duplicateGroups: number
  needsReview: number
  resolved: number
  archived: number
}

export type MergePreview = {
  masterId: string
  duplicateId: string
  master: DuplicateRecordSnapshot
  duplicate: DuplicateRecordSnapshot
  actions: string[]
  blockers: string[]
}

export type ResolveDuplicateInput = {
  masterId: string
  duplicateId: string
  reason?: string
  resolvedBy?: string
}

export type ResolveDuplicateResult =
  | { ok: true; masterId: string; archivedId: string }
  | { ok: false; error: string }

function nowIso(): string {
  return new Date().toISOString()
}

function isActiveConnected(karkunId: string): boolean {
  return getAllAssignments().some(
    (a) => a.karkunId === karkunId && a.status === 'Active' && !a.isArchived,
  )
}

function buildSnapshot(karkun: KarkunRegistryRecord): DuplicateRecordSnapshot {
  const assignments = getAllAssignments().filter((a) => a.karkunId === karkun.id)
  const active = assignments.find((a) => a.status === 'Active' && !a.isArchived)
  const ruknId = active?.ruknId || karkun.assignedRuknId || ''
  const rukn = ruknId ? getRuknById(ruknId) : undefined
  const visits = getAllSubmittedForms().filter((f) => f.karkunId === karkun.id)
  const followUps = getAllFollowUpRecords().filter((f) => f.karkunId === karkun.id)
  const activityCount = getActivityLog().filter((e) => e.karkunId === karkun.id).length

  let displayStatus = karkun.isArchived
    ? karkun.archiveKind === 'duplicate_merge' || karkun.mergedInto
      ? 'Archived Duplicate'
      : 'Archived'
    : active
      ? 'Connected'
      : karkun.status === 'active'
        ? 'Active (not connected)'
        : 'Inactive'

  return {
    id: karkun.id,
    name: karkun.name,
    mobile: karkun.mobile,
    status: karkun.status,
    displayStatus,
    connectedRuknId: ruknId,
    connectedRuknName: rukn?.name || karkun.assignedRukn || '—',
    createdAt: karkun.createdAt,
    asn: active?.assignmentNumber || assignments[0]?.assignmentNumber || '—',
    assignmentStatus: active ? 'Active' : assignments[0]?.status || 'None',
    activityCount,
    visitCount: visits.length,
    followUpCount: followUps.length,
    complianceHints:
      followUps.length > 0 || visits.length > 0
        ? `${visits.length} visit(s), ${followUps.length} follow-up(s)`
        : 'No execution records',
    historyCount: assignments.length,
    isActiveConnected: Boolean(active),
    isArchived: Boolean(karkun.isArchived),
    mergedInto: karkun.mergedInto,
  }
}

function scoreForRecommendation(snapshot: DuplicateRecordSnapshot): number {
  let score = 0
  if (snapshot.isActiveConnected) score += 1000
  if (snapshot.assignmentStatus === 'Active') score += 200
  score += snapshot.visitCount * 10
  score += snapshot.followUpCount * 5
  score += snapshot.activityCount * 2
  score += snapshot.historyCount
  // Prefer newer createdAt slightly when scores tie.
  const created = Date.parse(snapshot.createdAt)
  if (Number.isFinite(created)) score += Math.floor(created / 1_000_000_000)
  return score
}

export function recommendMaster(
  members: DuplicateRecordSnapshot[],
): { masterId: string | null; reason: string } {
  const live = members.filter((m) => !m.isArchived)
  if (live.length === 0) {
    return { masterId: null, reason: 'All members already archived — manual review only.' }
  }

  const connected = live.filter((m) => m.isActiveConnected)
  if (connected.length === 1) {
    return {
      masterId: connected[0]!.id,
      reason: 'Prefer the Connected record.',
    }
  }
  if (connected.length > 1) {
    return {
      masterId: null,
      reason: 'Multiple Connected records — administrator must choose manually.',
    }
  }

  const ranked = [...live].sort((a, b) => scoreForRecommendation(b) - scoreForRecommendation(a))
  const best = ranked[0]!
  const second = ranked[1]
  if (second && scoreForRecommendation(best) === scoreForRecommendation(second)) {
    return {
      masterId: null,
      reason: 'Scores tied — administrator must choose manually.',
    }
  }

  if (best.visitCount + best.followUpCount + best.activityCount > 0) {
    return {
      masterId: best.id,
      reason: 'Prefer the record with more execution / activity history.',
    }
  }

  return {
    masterId: best.id,
    reason: 'Prefer the newest non-connected record (no Active connection found).',
  }
}

export function listDuplicateGroups(): DuplicateGroup[] {
  const byMobile = new Map<string, KarkunRegistryRecord[]>()
  for (const karkun of MOCK_KARKUN_REGISTRY) {
    if (karkun.isArchived) continue
    const key = normalizeMobile(karkun.mobile)
    if (!key) continue
    const list = byMobile.get(key) ?? []
    list.push(karkun)
    byMobile.set(key, list)
  }

  const groups: DuplicateGroup[] = []
  for (const [mobileKey, records] of byMobile) {
    if (records.length < 2) continue
    const members = records.map(buildSnapshot)
    const recommendation = recommendMaster(members)
    groups.push({
      mobileKey,
      mobile: records[0]?.mobile ?? mobileKey,
      members,
      recommendedMasterId: recommendation.masterId,
      recommendationReason: recommendation.reason,
      status: 'needs_review',
    })
  }

  return groups.sort((a, b) => a.mobile.localeCompare(b.mobile))
}

export function getDuplicateResolutionSummary(): DuplicateResolutionSummary {
  const groups = listDuplicateGroups()
  const archivedDuplicates = MOCK_KARKUN_REGISTRY.filter(
    (k) => k.isArchived && (k.archiveKind === 'duplicate_merge' || Boolean(k.mergedInto)),
  )
  const archived = MOCK_KARKUN_REGISTRY.filter((k) => k.isArchived).length
  return {
    duplicateGroups: groups.length,
    needsReview: groups.length,
    resolved: archivedDuplicates.length,
    archived,
  }
}

export function buildMergePreview(
  masterId: string,
  duplicateId: string,
): MergePreview | { error: string } {
  if (masterId === duplicateId) {
    return { error: 'Master and duplicate must be different records.' }
  }
  const masterRecord = getKarkunById(masterId)
  const duplicateRecord = getKarkunById(duplicateId)
  if (!masterRecord || !duplicateRecord) {
    return { error: 'One or both records were not found.' }
  }
  if (masterRecord.isArchived) {
    return { error: 'Master record is archived. Choose an active master.' }
  }
  if (duplicateRecord.isArchived) {
    return { error: 'Duplicate is already archived.' }
  }

  const master = buildSnapshot(masterRecord)
  const duplicate = buildSnapshot(duplicateRecord)
  const blockers: string[] = []

  if (duplicate.isActiveConnected) {
    blockers.push(
      'Duplicate is currently Connected. Choose the Connected record as Master, or Disconnect the duplicate first.',
    )
  }
  if (
    normalizeMobile(master.mobile) &&
    normalizeMobile(duplicate.mobile) &&
    normalizeMobile(master.mobile) !== normalizeMobile(duplicate.mobile)
  ) {
    blockers.push('Records do not share the same mobile number.')
  }

  return {
    masterId,
    duplicateId,
    master,
    duplicate,
    actions: [
      'Keep master',
      'Preserve activity on both document IDs (no re-write)',
      'Preserve visits on both document IDs (no re-write)',
      'Preserve follow-ups on both document IDs (no re-write)',
      'Preserve compliance references (no re-write)',
      'Preserve master connection / ASN',
      'Archive duplicate (never delete)',
    ],
    blockers,
  }
}

/**
 * Soft-archive the duplicate into the master. Never deletes Firestore documents.
 * Does not migrate activity/visits — history remains on original document IDs.
 */
export function resolveDuplicateByArchive(
  input: ResolveDuplicateInput,
): ResolveDuplicateResult {
  const preview = buildMergePreview(input.masterId, input.duplicateId)
  if ('error' in preview) {
    return { ok: false, error: preview.error }
  }
  if (preview.blockers.length > 0) {
    return { ok: false, error: preview.blockers[0]! }
  }

  const duplicate = MOCK_KARKUN_REGISTRY.find((k) => k.id === input.duplicateId)
  if (!duplicate) {
    return { ok: false, error: 'Duplicate Karkun not found.' }
  }
  if (duplicate.isArchived) {
    return { ok: false, error: 'Duplicate is already archived.' }
  }
  if (isActiveConnected(duplicate.id)) {
    return {
      ok: false,
      error: 'Cannot archive a Connected duplicate. Select it as Master or disconnect first.',
    }
  }

  const resolvedBy = input.resolvedBy?.trim() || 'Administrator'
  const reason =
    input.reason?.trim() ||
    `Duplicate mobile resolution: keep ${input.masterId}, archive ${input.duplicateId}`
  const at = nowIso()
  const patch = buildArchivePatch(resolvedBy, at)

  Object.assign(duplicate, patch, {
    status: 'inactive' as const,
    archiveKind: 'duplicate_merge' as const,
    mergedInto: input.masterId,
    mergedBy: resolvedBy,
    mergedAt: at,
    mergeReason: reason,
    originalDocumentId: duplicate.id,
    updatedAt: at,
    updatedBy: resolvedBy,
    version: bumpVersion(duplicate.version),
    notes: [duplicate.notes?.trim(), `[Archived Duplicate → ${input.masterId}] ${reason}`]
      .filter(Boolean)
      .join('\n'),
  })

  notifyPeopleRegistryChange()

  appendConnectionLedgerEntry({
    eventType: 'ARCHIVED',
    performedBy: resolvedBy,
    karkunId: duplicate.id,
    metadata: {
      entity: 'karkun',
      archiveKind: 'duplicate_merge',
      mergedInto: input.masterId,
      reason,
    },
  })

  logActivity({
    type: 'complete',
    severity: 'IMPORTANT',
    message: `Duplicate Merge: archived ${duplicate.name} (${duplicate.id}) into master ${input.masterId}. Reason: ${reason}`,
    karkunId: input.masterId,
    actor: resolvedBy,
  })

  return { ok: true, masterId: input.masterId, archivedId: duplicate.id }
}

export function getArchivedDuplicateRecords(): DuplicateRecordSnapshot[] {
  return MOCK_KARKUN_REGISTRY.filter(
    (k) => k.isArchived && (k.archiveKind === 'duplicate_merge' || Boolean(k.mergedInto)),
  ).map(buildSnapshot)
}
