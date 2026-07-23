import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { MOCK_KARKUN_REGISTRY, getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById, ruknMaster } from '@/data/ruknMaster'
import {
  getCanonicalConnectedAssignments,
  getCanonicalConnectedKarkunCount,
  getConnectedAssignmentsForRukn,
} from '@/lib/connections/getConnectedKarkunsForRukn'
import { isCampaignEligible } from '@/lib/peopleClassification'
import { getAllKarkuns, getCompatibleKarkunsForRukn, notifyAndPersistKarkunRecords, notifyPeopleRegistryChange } from '@/lib/peopleStore'
import { logPeopleAudit } from '@/lib/peopleAuditLog'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import { logActivity } from '@/stores/activityLogStore'
import { appendConnectionLedgerEntry } from '@/services/connectionLedgerService'
import { getRepositories } from '@/repositories/provider'
import {
  beginTransferCommit,
  endTransferCommit,
} from '@/repositories/firestore/offlineSync'
import {
  appendAssignment,
  applyInPlaceTransfer,
  countAssignmentChanges,
  generateAssignmentNumber,
  getActiveAssignmentForRukn,
  getActiveAssignmentsForKarkun,
  getAllAssignments,
  getAssignmentById,
  getAssignmentHistoryForKarkun,
  getAssignmentHistoryForRukn,
  getAssignmentPeriodCounts,
  getSuspendedAssignmentForRukn,
  updateAssignmentStatus,
} from '@/stores/assignmentStore'
import type {
  AssignInput,
  AssignmentDashboardMetrics,
  AssignmentRecord,
  AssignmentResult,
  KarkunWorkloadSummary,
  RemoveInput,
  ReplaceInput,
  RestoreInput,
  RuknAssignmentSummary,
  TransferInput,
} from '@/types/assignment'
import {
  validateAssignInput,
  validateRemoveInput,
  validateReplaceInput,
  validateRestoreInput,
  validateTransferInput,
} from '@/validation/assignmentValidation'
import {
  createIncidentOperationId,
  traceIncidentStage,
  traceMetricSnapshot,
  traceMutation,
  traceSequencedIncidentStage,
} from '@/lib/incidentTraceCollector'
import { ensureJwtRoleClaimPresent } from '@/lib/auth/ensureJwtRoleClaim'
import {
  connectStepEarlyReturn,
  connectStepEnter,
  connectStepExit,
  traceConnect,
} from '@/lib/debug/kc0061ConnectTrace'

function publishLastAssign(payload: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return
    ;(window as Window & { __KC0061_LAST_ASSIGN__?: Record<string, unknown> }).__KC0061_LAST_ASSIGN__ =
      payload
  } catch {
    // ignore
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

const CONNECTION_PERSIST_USER_ERROR =
  'Unable to save connection. Please try again. If the problem continues, contact Administrator.'

function logOrphanedAsnOnPersistFailure(error: unknown): void {
  if (
    typeof error === 'object' &&
    error !== null &&
    'assignmentNumber' in error &&
    typeof (error as { assignmentNumber: unknown }).assignmentNumber === 'string'
  ) {
    console.warn('[KC-0063] ASN allocated but connection doc not persisted', {
      assignmentNumber: (error as { assignmentNumber: string }).assignmentNumber,
      assignmentId:
        'assignmentId' in error
          ? (error as { assignmentId?: string }).assignmentId
          : undefined,
      code: 'code' in error ? (error as { code?: string }).code : undefined,
    })
  }
}

function operatorConnectionPersistError(error: unknown): string {
  logOrphanedAsnOnPersistFailure(error)
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'commit-timeout'
  ) {
    return 'Connection save timed out. Please try again.'
  }
  return CONNECTION_PERSIST_USER_ERROR
}

function isConnectionPersistFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('repositoryError' in error || ('assignmentNumber' in error && 'assignmentId' in error))
  )
}

async function createAssignmentRecord(
  input: Omit<
    AssignmentRecord,
    'assignmentId' | 'assignmentNumber' | 'assignedDate' | 'createdAt' | 'updatedAt' | 'status'
  >,
): Promise<AssignmentRecord> {
  const timestamp = nowIso()
  // KC-0053: retry ASN allocation if the store already holds that number (safe retry / race).
  let assignmentNumber = ''
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assignmentNumber = await generateAssignmentNumber()
    const collision = getAllAssignments().some(
      (item) =>
        item.assignmentNumber.trim().toUpperCase() === assignmentNumber.trim().toUpperCase(),
    )
    if (!collision) break
    if (attempt === 4) {
      throw new Error(`Duplicate assignment numbers detected: ${assignmentNumber}`)
    }
  }
  return {
    assignmentId: `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assignmentNumber,
    assignedDate: input.effectiveFrom,
    status: 'Active',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  }
}

type KarkunAssignmentSyncSnapshot = {
  assignmentStatus: KarkunRegistryRecord['assignmentStatus']
  assignedRuknId: string
  assignedRukn: string
  assignmentDate: string | undefined
  campaignStatus: KarkunRegistryRecord['campaignStatus']
}

function karkunAssignmentFieldsChanged(
  before: KarkunAssignmentSyncSnapshot,
  karkun: KarkunRegistryRecord,
): boolean {
  return (
    before.assignmentStatus !== karkun.assignmentStatus ||
    before.assignedRuknId !== karkun.assignedRuknId ||
    before.assignedRukn !== karkun.assignedRukn ||
    before.assignmentDate !== karkun.assignmentDate ||
    before.campaignStatus !== karkun.campaignStatus
  )
}

async function syncKarkunRegistryFromAssignments(
  karkunId: string,
  options?: { notify?: boolean },
): Promise<void> {
  // KC-0103 — never sync campaign fields onto Muttafiqeen / soft-removed people.
  const karkun = MOCK_KARKUN_REGISTRY.find((k) => k.id === karkunId && isCampaignEligible(k))
  if (!karkun) return

  const operationId = createIncidentOperationId('sync-karkun-registry')
  const before = {
    assignmentStatus: karkun.assignmentStatus,
    assignedRuknId: karkun.assignedRuknId,
    assignedRukn: karkun.assignedRukn,
    assignmentDate: karkun.assignmentDate,
    campaignStatus: karkun.campaignStatus,
  }

  const activeAssignments = getActiveAssignmentsForKarkun(karkunId)
  if (activeAssignments.length === 0) {
    karkun.assignmentStatus = 'Available'
    karkun.assignedRuknId = ''
    karkun.assignedRukn = ''
    karkun.assignmentDate = undefined
    karkun.campaignStatus = karkun.status === 'active' ? 'not_assigned' : 'inactive'

    if (before.assignmentStatus !== karkun.assignmentStatus) {
      traceMutation({
        operationId,
        entity: 'karkun_registry',
        field: 'assignmentStatus',
        before: before.assignmentStatus,
        after: karkun.assignmentStatus,
        caller: 'syncKarkunRegistryFromAssignments',
        reason: 'no active assignments for karkun',
        sourceOfTruth: 'Derived Calculation',
        extras: {
          karkunId,
        },
      })
    }
    if (before.assignedRuknId !== karkun.assignedRuknId) {
      traceMutation({
        operationId,
        entity: 'karkun_registry',
        field: 'assignedRuknId',
        before: before.assignedRuknId,
        after: karkun.assignedRuknId,
        caller: 'syncKarkunRegistryFromAssignments',
        reason: 'no active assignments for karkun',
        sourceOfTruth: 'Derived Calculation',
        extras: {
          karkunId,
        },
      })
    }
    if (before.assignedRukn !== karkun.assignedRukn) {
      traceMutation({
        operationId,
        entity: 'karkun_registry',
        field: 'assignedRukn',
        before: before.assignedRukn,
        after: karkun.assignedRukn,
        caller: 'syncKarkunRegistryFromAssignments',
        reason: 'no active assignments for karkun',
        sourceOfTruth: 'Derived Calculation',
        extras: {
          karkunId,
        },
      })
    }
    if (before.assignmentDate !== karkun.assignmentDate) {
      traceMutation({
        operationId,
        entity: 'karkun_registry',
        field: 'assignmentDate',
        before: before.assignmentDate,
        after: karkun.assignmentDate,
        caller: 'syncKarkunRegistryFromAssignments',
        reason: 'no active assignments for karkun',
        sourceOfTruth: 'Derived Calculation',
        extras: {
          karkunId,
        },
      })
    }
    if (before.campaignStatus !== karkun.campaignStatus) {
      traceMutation({
        operationId,
        entity: 'karkun_registry',
        field: 'campaignStatus',
        before: before.campaignStatus,
        after: karkun.campaignStatus,
        caller: 'syncKarkunRegistryFromAssignments',
        reason: 'no active assignments for karkun',
        sourceOfTruth: 'Derived Calculation',
        extras: {
          karkunId,
        },
      })
    }

    if (options?.notify !== false && karkunAssignmentFieldsChanged(before, karkun)) {
      await notifyAndPersistKarkunRecords([karkun])
    }
    return
  }

  const primary = activeAssignments[0]
  const rukn = getRuknById(primary.ruknId)
  karkun.assignmentStatus = 'Assigned'
  karkun.assignedRuknId = primary.ruknId
  karkun.assignedRukn = rukn?.name ?? ''
  karkun.assignmentDate = primary.effectiveFrom
  karkun.campaignStatus = 'active'

  if (before.assignmentStatus !== karkun.assignmentStatus) {
    traceMutation({
      operationId,
      entity: 'karkun_registry',
      field: 'assignmentStatus',
      before: before.assignmentStatus,
      after: karkun.assignmentStatus,
      caller: 'syncKarkunRegistryFromAssignments',
      reason: 'active assignment present',
      sourceOfTruth: 'Derived Calculation',
      extras: {
        karkunId,
      },
    })
  }
  if (before.assignedRuknId !== karkun.assignedRuknId) {
    traceMutation({
      operationId,
      entity: 'karkun_registry',
      field: 'assignedRuknId',
      before: before.assignedRuknId,
      after: karkun.assignedRuknId,
      caller: 'syncKarkunRegistryFromAssignments',
      reason: 'active assignment present',
      sourceOfTruth: 'Derived Calculation',
      extras: {
        karkunId,
      },
    })
  }
  if (before.assignedRukn !== karkun.assignedRukn) {
    traceMutation({
      operationId,
      entity: 'karkun_registry',
      field: 'assignedRukn',
      before: before.assignedRukn,
      after: karkun.assignedRukn,
      caller: 'syncKarkunRegistryFromAssignments',
      reason: 'active assignment present',
      sourceOfTruth: 'Derived Calculation',
      extras: {
        karkunId,
      },
    })
  }
  if (before.assignmentDate !== karkun.assignmentDate) {
    traceMutation({
      operationId,
      entity: 'karkun_registry',
      field: 'assignmentDate',
      before: before.assignmentDate,
      after: karkun.assignmentDate,
      caller: 'syncKarkunRegistryFromAssignments',
      reason: 'active assignment present',
      sourceOfTruth: 'Derived Calculation',
      extras: {
        karkunId,
      },
    })
  }
  if (before.campaignStatus !== karkun.campaignStatus) {
    traceMutation({
      operationId,
      entity: 'karkun_registry',
      field: 'campaignStatus',
      before: before.campaignStatus,
      after: karkun.campaignStatus,
      caller: 'syncKarkunRegistryFromAssignments',
      reason: 'active assignment present',
      sourceOfTruth: 'Derived Calculation',
      extras: {
        karkunId,
      },
    })
  }

  if (options?.notify !== false && karkunAssignmentFieldsChanged(before, karkun)) {
    await notifyAndPersistKarkunRecords([karkun])
  }
}

/** Reconcile Karkun registry fields from persisted assignment records after app reload. */
export function syncAllKarkunRegistryFromAssignments(options?: { notify?: boolean }): void {
  traceSequencedIncidentStage('syncAllKarkunRegistryFromAssignments_start', {
    assignmentStoreCount: getAllAssignments().length,
  })
  traceIncidentStage('syncAllKarkunRegistryFromAssignments:start', {
    caller: 'syncAllKarkunRegistryFromAssignments',
    sourceOfTruth: 'Derived Calculation',
    assignmentCount: getAllAssignments().length,
    karkunCount: getAllKarkuns().length,
  })

  for (const karkun of getAllKarkuns()) {
    syncKarkunRegistryFromAssignments(karkun.id, { notify: false })
  }
  if (options?.notify !== false) {
    notifyPeopleRegistryChange()
  }

  traceIncidentStage('syncAllKarkunRegistryFromAssignments:complete', {
    caller: 'syncAllKarkunRegistryFromAssignments',
    sourceOfTruth: 'Derived Calculation',
    assignmentCount: getAllAssignments().length,
    karkunCount: getAllKarkuns().length,
  })
}

function formatNames(ruknId: string, karkunId: string): { ruknName: string; karkunName: string } {
  return {
    ruknName: getRuknById(ruknId)?.name ?? ruknId,
    karkunName: getKarkunById(karkunId)?.name ?? karkunId,
  }
}

/** KC-0053 — coalesce concurrent assign attempts for the same Karkun. */
const assignInFlightByKarkun = new Map<string, Promise<AssignmentResult>>()

export async function assignRukn(input: AssignInput): Promise<AssignmentResult> {
  const serviceSpan = connectStepEnter('service.assignRukn', {
    ruknId: input.ruknId,
    karkunId: input.karkunId,
    assignedBy: input.assignedBy,
  })

  // KC-0061 — static import + always force-refresh before ASN allocate (T2 before T3).
  const claims = await ensureJwtRoleClaimPresent()
  publishLastAssign({
    stage: 'claims_gate',
    at: Date.now(),
    ruknId: input.ruknId,
    karkunId: input.karkunId,
    claimsOk: claims.ok,
    forceRefreshed: claims.forceRefreshed,
    timeline: claims.timeline,
    buildSha: typeof __KC_BUILD_SHA__ !== 'undefined' ? __KC_BUILD_SHA__ : 'unknown',
  })
  if (!claims.ok) {
    connectStepEarlyReturn('service.assignRukn', 'missing_jwt_role_claim', {
      error: claims.error,
      forceRefreshed: claims.forceRefreshed,
    })
    connectStepExit(serviceSpan, 'service.assignRukn', { aborted: 'missing_jwt_role_claim' })
    return { success: false, error: claims.error }
  }

  const validateSpan = connectStepEnter('service.validateAssignInput')
  const validation = validateAssignInput(input)
  connectStepExit(validateSpan, 'service.validateAssignInput', { valid: validation.valid })
  if (!validation.valid) {
    connectStepEarlyReturn('service.validateAssignInput', validation.error)
    connectStepExit(serviceSpan, 'service.assignRukn', { aborted: 'validation', error: validation.error })
    return { success: false, error: validation.error }
  }

  // Idempotent: same Active connection already exists.
  const existingSame = getActiveAssignmentsForKarkun(input.karkunId).find(
    (record) => record.ruknId === input.ruknId,
  )
  if (existingSame) {
    connectStepEarlyReturn('service.assignRukn', 'idempotent_existing_active', {
      assignmentId: existingSame.assignmentId,
    })
    connectStepExit(serviceSpan, 'service.assignRukn', { idempotent: true })
    return { success: true, assignment: existingSame }
  }

  const inflight = assignInFlightByKarkun.get(input.karkunId)
  if (inflight) {
    connectStepEarlyReturn('service.assignRukn', 'coalesced_inflight')
    return inflight
  }

  const work = (async (): Promise<AssignmentResult> => {
    traceConnect('assign.start', {
      ruknId: input.ruknId,
      karkunId: input.karkunId,
      assignedBy: input.assignedBy,
    })

    // Re-check after awaiting any prior work / validation.
    const again = getActiveAssignmentsForKarkun(input.karkunId).find(
      (record) => record.ruknId === input.ruknId,
    )
    if (again) {
      traceConnect('assign.ok', { idempotent: true, assignmentId: again.assignmentId })
      connectStepExit(serviceSpan, 'service.assignRukn', { idempotent: true })
      return { success: true, assignment: again }
    }

    let assignment
    try {
      traceConnect('connection.write.start', {
        repository: 'assignmentStore.appendAssignment',
        firestorePath: 'connections/{assignmentId}',
      })
      assignment = await appendAssignment(
        await createAssignmentRecord({
          ruknId: input.ruknId,
          karkunId: input.karkunId,
          effectiveFrom: input.effectiveFrom,
          assignedBy: input.assignedBy,
          remarks: input.remarks,
        }),
      )
      traceConnect('connection.write.ok', {
        assignmentId: assignment.assignmentId,
        assignmentNumber: assignment.assignmentNumber,
      })
    } catch (error) {
      // KC-0061 — log ORIGINAL exception before returning operator-facing copy.
      traceConnect(
        'connection.write.fail',
        {
          repository: 'createAssignmentRecord/appendAssignment',
          firestorePath: 'settings/connectionMeta + connections/{id}',
        },
        error,
      )
      traceConnect('assign.fail', { stage: 'create_or_append' }, error)
      publishLastAssign({
        stage: 'assign_fail',
        at: Date.now(),
        ruknId: input.ruknId,
        karkunId: input.karkunId,
        code:
          typeof error === 'object' && error && 'code' in error
            ? String((error as { code: unknown }).code)
            : undefined,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        buildSha: typeof __KC_BUILD_SHA__ !== 'undefined' ? __KC_BUILD_SHA__ : 'unknown',
      })
      connectStepExit(serviceSpan, 'service.assignRukn', {
        aborted: 'create_or_append',
        error: error instanceof Error ? error.message : String(error),
      })
      if (isConnectionPersistFailure(error)) {
        return { success: false, error: operatorConnectionPersistError(error) }
      }
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'This Karkun is already connected to a Rukn. Use Transfer to reassign.',
      }
    }

    await syncKarkunRegistryFromAssignments(input.karkunId)

    const { ruknName, karkunName } = formatNames(input.ruknId, input.karkunId)

    logPeopleAudit({
      personKind: 'karkun',
      personId: input.karkunId,
      personName: karkunName,
      action: 'assign',
      newValue: ruknName,
      updatedBy: input.assignedBy,
    })

    logActivity({
      type: 'assign',
      message: `${karkunName} connected to ${ruknName}`,
      ruknId: input.ruknId,
      karkunId: input.karkunId,
      assignmentId: assignment.assignmentId,
      actor: input.assignedBy,
    })

    // KC-0058 — immutable connection ledger (does not alter assign semantics).
    appendConnectionLedgerEntry({
      eventType: 'CONNECTED',
      performedBy: input.assignedBy,
      assignmentId: assignment.assignmentId,
      connectionId: assignment.assignmentId,
      ruknId: input.ruknId,
      karkunId: input.karkunId,
      metadata: { assignmentNumber: assignment.assignmentNumber },
    })

    traceConnect('assign.ok', {
      assignmentId: assignment.assignmentId,
      assignmentNumber: assignment.assignmentNumber,
    })
    connectStepExit(serviceSpan, 'service.assignRukn', {
      success: true,
      assignmentId: assignment.assignmentId,
    })
    return { success: true, assignment }
  })()

  assignInFlightByKarkun.set(input.karkunId, work)
  try {
    return await work
  } finally {
    if (assignInFlightByKarkun.get(input.karkunId) === work) {
      assignInFlightByKarkun.delete(input.karkunId)
    }
  }
}

export async function replaceAssignment(input: ReplaceInput): Promise<AssignmentResult> {
  const claims = await ensureJwtRoleClaimPresent()
  if (!claims.ok) {
    return { success: false, error: claims.error }
  }

  const validation = validateReplaceInput(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const current = (input.currentKarkunId
    ? getActiveAssignmentsForKarkun(input.currentKarkunId).find(
        (record) => record.ruknId === input.ruknId,
      )
    : getActiveAssignmentForRukn(input.ruknId))!
  const endedAt = input.effectiveFrom
  const timestamp = nowIso()
  const priorCurrent = {
    status: current.status,
    replacementReason: current.replacementReason,
    removalReason: current.removalReason,
    remarks: current.remarks,
    endedDate: current.endedDate,
    updatedAt: current.updatedAt,
  }

  try {
    await updateAssignmentStatus(current.assignmentId, 'Replaced', {
      replacementReason: input.replacementReason,
      remarks: input.remarks,
      endedDate: endedAt,
      updatedAt: timestamp,
    })
  } catch (error) {
    return {
      success: false,
      error: isConnectionPersistFailure(error)
        ? operatorConnectionPersistError(error)
        : error instanceof Error
          ? error.message
          : 'Unable to save connection replacement.',
    }
  }

  await syncKarkunRegistryFromAssignments(current.karkunId)

  let newAssignment
  try {
    newAssignment = await appendAssignment(
      await createAssignmentRecord({
        ruknId: input.ruknId,
        karkunId: input.newKarkunId,
        effectiveFrom: input.effectiveFrom,
        assignedBy: input.assignedBy,
        remarks: input.remarks,
      }),
    )
  } catch (error) {
    try {
      await updateAssignmentStatus(current.assignmentId, priorCurrent.status, {
        replacementReason: priorCurrent.replacementReason,
        removalReason: priorCurrent.removalReason,
        remarks: priorCurrent.remarks,
        endedDate: priorCurrent.endedDate,
        updatedAt: priorCurrent.updatedAt,
      })
    } catch (revertError) {
      console.error('[assignmentService.replaceAssignment] failed to revert Replaced status', revertError)
    }
    return {
      success: false,
      error: isConnectionPersistFailure(error)
        ? operatorConnectionPersistError(error)
        : error instanceof Error
          ? error.message
          : 'This Karkun is already connected to a Rukn. Use Transfer to reassign.',
    }
  }

  await syncKarkunRegistryFromAssignments(input.newKarkunId)

  const previous = formatNames(input.ruknId, current.karkunId)
  const next = formatNames(input.ruknId, input.newKarkunId)

  logPeopleAudit({
    personKind: 'karkun',
    personId: current.karkunId,
    personName: previous.karkunName,
    action: 'unassign',
    previousValue: previous.ruknName,
    updatedBy: input.assignedBy,
  })

  logPeopleAudit({
    personKind: 'karkun',
    personId: input.newKarkunId,
    personName: next.karkunName,
    action: 'assign',
    newValue: next.ruknName,
    updatedBy: input.assignedBy,
  })

  logActivity({
    type: 'replace',
    message: `${next.karkunName} replaced ${previous.karkunName}`,
    ruknId: input.ruknId,
    karkunId: input.newKarkunId,
    assignmentId: newAssignment.assignmentId,
    actor: input.assignedBy,
  })

  return { success: true, assignment: newAssignment }
}

/**
 * KC-0055 — Transfer ownership in place.
 * Preserves assignmentId + assignmentNumber. Does not allocate ASN.
 */
export async function transferAssignment(input: TransferInput): Promise<AssignmentResult> {
  // KC-0061 — transfer writes connections/* under JWT role rules (no ASN path).
  const claims = await ensureJwtRoleClaimPresent()
  publishLastAssign({
    stage: 'transfer_claims_gate',
    at: Date.now(),
    karkunId: input.karkunId,
    targetRuknId: input.targetRuknId,
    claimsOk: claims.ok,
    forceRefreshed: claims.forceRefreshed,
    timeline: claims.timeline,
    buildSha: typeof __KC_BUILD_SHA__ !== 'undefined' ? __KC_BUILD_SHA__ : 'unknown',
  })
  if (!claims.ok) {
    return { success: false, error: claims.error }
  }

  const validation = validateTransferInput(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const current = getActiveAssignmentsForKarkun(input.karkunId)[0]!
  const sourceRuknId = current.ruknId
  const targetRuknId = input.targetRuknId.trim()
  const timestamp = nowIso()
  const sourceNames = formatNames(sourceRuknId, input.karkunId)
  const targetNames = formatNames(targetRuknId, input.karkunId)

  const transferRemarks = input.remarks?.trim()
    ? `Transferred from ${sourceNames.ruknName} (${sourceRuknId}) to ${targetNames.ruknName} (${targetRuknId}). ${input.remarks.trim()}`
    : `Transferred from ${sourceNames.ruknName} (${sourceRuknId}) to ${targetNames.ruknName} (${targetRuknId}).`

  const historyMarker: AssignmentRecord = {
    assignmentId: `asgn-xfer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    // Empty ASN — surviving Active keeps the real number (global uniqueness).
    assignmentNumber: '',
    ruknId: sourceRuknId,
    karkunId: input.karkunId,
    assignedDate: current.assignedDate,
    effectiveFrom: current.effectiveFrom,
    status: 'Unassigned',
    assignedBy: input.assignedBy,
    removalReason: input.removalReason ?? 'Transferred',
    remarks: `Transferred to ${targetNames.ruknName} (${targetRuknId}). Surviving connection: ${current.assignmentNumber}.`,
    endedDate: input.effectiveFrom,
    createdAt: current.createdAt,
    updatedAt: timestamp,
  }

  beginTransferCommit()
  try {
    const updated = applyInPlaceTransfer({
      assignmentId: current.assignmentId,
      targetRuknId,
      effectiveFrom: input.effectiveFrom,
      assignedBy: input.assignedBy,
      remarks: transferRemarks,
      historyMarker,
    })

    await syncKarkunRegistryFromAssignments(input.karkunId)

    logPeopleAudit({
      personKind: 'karkun',
      personId: input.karkunId,
      personName: sourceNames.karkunName,
      action: 'assign',
      previousValue: sourceNames.ruknName,
      newValue: targetNames.ruknName,
      updatedBy: input.assignedBy,
    })

    logActivity({
      type: 'transfer',
      message: `${sourceNames.karkunName} transferred from ${sourceNames.ruknName} to ${targetNames.ruknName}`,
      ruknId: targetRuknId,
      karkunId: input.karkunId,
      assignmentId: updated.assignmentId,
      actor: input.assignedBy,
    })

    // KC-0058 — immutable connection ledger (does not alter transfer semantics).
    appendConnectionLedgerEntry({
      eventType: 'TRANSFERRED',
      performedBy: input.assignedBy,
      assignmentId: updated.assignmentId,
      connectionId: updated.assignmentId,
      ruknId: targetRuknId,
      karkunId: input.karkunId,
      metadata: {
        fromRuknId: sourceRuknId,
        toRuknId: targetRuknId,
        assignmentNumber: updated.assignmentNumber,
      },
    })

    const commit = getRepositories().connection.commitConnectionDocuments
    if (commit) {
      const result = await commit([updated, historyMarker])
      if (!result.ok) {
        return {
          success: false,
          error: result.error.message || 'Unable to save transfer. Please try again.',
        }
      }
    }

    const confirmed = getAssignmentById(updated.assignmentId)
    if (!confirmed || confirmed.ruknId !== targetRuknId || confirmed.status !== 'Active') {
      return {
        success: false,
        error: 'Transfer could not be confirmed in local state. Please refresh and try again.',
      }
    }
    if (confirmed.assignmentNumber !== current.assignmentNumber) {
      return {
        success: false,
        error: 'Transfer changed Assignment Number unexpectedly. Contact Administrator.',
      }
    }

    return { success: true, assignment: confirmed }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to complete transfer.',
    }
  } finally {
    endTransferCommit()
  }
}

export async function removeAssignment(input: RemoveInput): Promise<AssignmentResult> {
  const validation = validateRemoveInput(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const current = (input.karkunId
    ? getActiveAssignmentsForKarkun(input.karkunId).find(
        (record) => record.ruknId === input.ruknId,
      )
    : getActiveAssignmentForRukn(input.ruknId))!
  const timestamp = nowIso()

  try {
    await updateAssignmentStatus(current.assignmentId, 'Unassigned', {
      removalReason: input.removalReason,
      remarks: input.remarks,
      endedDate: input.effectiveFrom,
      updatedAt: timestamp,
    })
  } catch (error) {
    return {
      success: false,
      error: isConnectionPersistFailure(error)
        ? operatorConnectionPersistError(error)
        : error instanceof Error
          ? error.message
          : 'Unable to disconnect.',
    }
  }

  await syncKarkunRegistryFromAssignments(current.karkunId)

  const { ruknName, karkunName } = formatNames(input.ruknId, current.karkunId)

  logPeopleAudit({
    personKind: 'karkun',
    personId: current.karkunId,
    personName: karkunName,
    action: 'unassign',
    previousValue: ruknName,
    updatedBy: input.assignedBy,
  })

  logActivity({
    type: 'remove',
    message: `Connection removed — ${karkunName} from ${ruknName}`,
    ruknId: input.ruknId,
    karkunId: current.karkunId,
    assignmentId: current.assignmentId,
    actor: input.assignedBy,
  })

  // KC-0058 — immutable connection ledger (status becomes Unassigned; row retained).
  appendConnectionLedgerEntry({
    eventType: 'DISCONNECTED',
    performedBy: input.assignedBy,
    assignmentId: current.assignmentId,
    connectionId: current.assignmentId,
    ruknId: input.ruknId,
    karkunId: current.karkunId,
    metadata: { removalReason: input.removalReason },
  })

  return { success: true, assignment: current }
}

export async function restoreAssignment(input: RestoreInput): Promise<AssignmentResult> {
  const validation = validateRestoreInput(input)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const result = await assignRukn(input)
  if (!result.success || !result.assignment) {
    return result
  }

  const { ruknName, karkunName } = formatNames(input.ruknId, input.karkunId)

  logActivity({
    type: 'restore',
    message: `Connection restored — ${karkunName} to ${ruknName}`,
    ruknId: input.ruknId,
    karkunId: input.karkunId,
    assignmentId: result.assignment.assignmentId,
    actor: input.assignedBy,
  })

  // KC-0058 — ledger RESTORED (CONNECTED already written by assignRukn).
  appendConnectionLedgerEntry({
    eventType: 'RESTORED',
    performedBy: input.assignedBy,
    assignmentId: result.assignment.assignmentId,
    connectionId: result.assignment.assignmentId,
    ruknId: input.ruknId,
    karkunId: input.karkunId,
  })

  return result
}

export function getRuknAssignmentSummary(ruknId: string): RuknAssignmentSummary {
  const history = getAssignmentHistoryForRukn(ruknId)
  // Canonical connected set (same as Dashboard / Connected page / Automation).
  const activeAssignments = getConnectedAssignmentsForRukn(ruknId)
  const currentAssignment = activeAssignments[0] ?? null
  const suspendedAssignment = getSuspendedAssignmentForRukn(ruknId) ?? null
  const lastChange = history[0]

  let assignmentStatus: RuknAssignmentSummary['assignmentStatus'] = 'Unassigned'
  if (activeAssignments.length > 0) {
    assignmentStatus = 'Assigned'
  } else if (suspendedAssignment) {
    assignmentStatus = 'Suspended'
  }

  const primary = currentAssignment ?? suspendedAssignment

  return {
    currentAssignment: primary,
    activeAssignments,
    assignedKarkunCount: activeAssignments.length,
    assignmentSince: primary?.effectiveFrom ?? null,
    assignmentHistory: history,
    lastAssignmentChange: lastChange?.updatedAt ?? null,
    assignmentStatus,
  }
}

export function getKarkunWorkloadSummary(karkunId: string): KarkunWorkloadSummary {
  const history = getAssignmentHistoryForKarkun(karkunId)
  const activeAssignments = history.filter((record) => record.status === 'Active')
  const completedAssignments = history.filter((record) => record.status === 'Completed')
  const inactiveAssignments = history.filter(
    (record) =>
      record.status === 'Unassigned' ||
      record.status === 'Replaced' ||
      record.status === 'Suspended',
  )

  const assignedRukns = activeAssignments
    .map((record) => getRuknById(record.ruknId)?.name ?? record.ruknId)
    .filter(Boolean)

  return {
    assignedRukns,
    activeAssignments,
    completedAssignments,
    inactiveAssignments,
  }
}

export function getAssignmentDashboardMetrics(): AssignmentDashboardMetrics {
  // KC-028A: Connected KPI = canonical unique Active + !archived Karkuns (not raw row count).
  const connectedAssignments = getCanonicalConnectedAssignments()
  const assignedRuknIds = new Set(connectedAssignments.map((record) => record.ruknId))
  const activeRukns = ruknMaster.filter((rukn) => rukn.status === 'active')
  const karkuns = getAllKarkuns().filter(
    (k) => k.status === 'active' && isValidMobileFormat(normalizeMobile(k.mobile)),
  )
  const periodCounts = getAssignmentPeriodCounts()

  const metrics = {
    activeAssignments: getCanonicalConnectedKarkunCount(),
    unassignedRukns: activeRukns.filter((rukn) => !assignedRuknIds.has(rukn.id)).length,
    assignedRukns: assignedRuknIds.size,
    availableMaleKarkuns: karkuns.filter(
      (k) => k.gender === 'Male' && k.assignmentStatus === 'Available',
    ).length,
    availableFemaleKarkuns: karkuns.filter(
      (k) => k.gender === 'Female' && k.assignmentStatus === 'Available',
    ).length,
    totalAssignmentChanges: countAssignmentChanges(),
    assignmentsToday: periodCounts.assignmentsToday,
    assignmentsThisWeek: periodCounts.assignmentsThisWeek,
    assignmentsThisMonth: periodCounts.assignmentsThisMonth,
  }

  traceMetricSnapshot('assignment_dashboard_metrics', {
    caller: 'getAssignmentDashboardMetrics',
    sourceOfTruth: 'Derived Calculation',
    connected: metrics.activeAssignments,
    unconnected: metrics.unassignedRukns,
    activeAssignments: metrics.activeAssignments,
    assignedRukns: metrics.assignedRukns,
    unassignedRukns: metrics.unassignedRukns,
  })

  return metrics
}

export function getKarkunsForRuknAssignment(ruknId: string) {
  return getCompatibleKarkunsForRukn(ruknId).filter(
    (k) => !k.isArchived && isValidMobileFormat(normalizeMobile(k.mobile)),
  )
}

export function getUnassignedRukns() {
  const assignedIds = new Set(
    getCanonicalConnectedAssignments().map((record) => record.ruknId),
  )
  return ruknMaster.filter((rukn) => rukn.status === 'active' && !assignedIds.has(rukn.id))
}

export function getAssignedRukns() {
  const assignedIds = new Set(
    getCanonicalConnectedAssignments().map((record) => record.ruknId),
  )
  return ruknMaster.filter((rukn) => assignedIds.has(rukn.id))
}

export function getKarkunWithWorkload() {
  return getAllKarkuns()
    .filter((k) => !k.isArchived)
    .map((karkun) => ({
      karkun,
      workload: getKarkunWorkloadSummary(karkun.id),
    }))
}

export function ruknMatchesAssignmentSearch(ruknId: string, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  const rukn = getRuknById(ruknId)
  if (!rukn) return false

  if (rukn.name.toLowerCase().includes(normalized)) return true
  if (rukn.mobile.toLowerCase().includes(normalized)) return true

  const history = getAssignmentHistoryForRukn(ruknId)
  for (const record of history) {
    if (record.assignmentNumber.toLowerCase().includes(normalized)) return true

    const karkun = getKarkunById(record.karkunId)
    if (karkun) {
      if (karkun.name.toLowerCase().includes(normalized)) return true
      if (karkun.mobile.toLowerCase().includes(normalized)) return true
    }
  }

  return false
}

export { getAllAssignments, getAssignmentHistoryForRukn, getAssignmentHistoryForKarkun }
