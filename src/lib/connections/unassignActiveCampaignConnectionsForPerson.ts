/**
 * End leftover Active campaign connections so a person has at most one
 * current organisational Rukn. Documents and ASNs are retained as Unassigned.
 *
 * Does not require the campaign Rukn to be currently active.
 * Does not create Muttafiq relationships. Does not change category.
 *
 * Muttafiq uniqueness in upsertActiveDurable remains a separate read-then-write
 * check (client Firestore cannot query inside a transaction).
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getPersonCategory } from '@/lib/peopleClassification'
import { persistKarkunDurable } from '@/lib/peopleStore'
import { logPeopleAudit } from '@/lib/peopleAuditLog'
import { syncKarkunRegistryFromAssignments } from '@/services/assignmentService'
import { appendConnectionLedgerEntry } from '@/services/connectionLedgerService'
import { logActivity } from '@/stores/activityLogStore'
import {
  getActiveAssignmentsForKarkun,
  updateAssignmentStatus,
} from '@/stores/assignmentStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export const ORGANISATIONAL_CAMPAIGN_UNASSIGN_REMARK =
  'Organisational one-current-Rukn cleanup: stale campaign assignment ended. Document retained.'

export type UnassignActiveCampaignResult =
  | { ok: true; endedIds: string[] }
  | { ok: false; error: string }

export function clearCampaignAssignmentDenorm(person: KarkunRegistryRecord): void {
  person.assignedRuknId = ''
  person.assignedRukn = ''
  person.assignmentStatus = 'Available'
  person.assignmentDate = undefined
  person.campaignStatus = person.status === 'inactive' ? 'inactive' : 'not_assigned'
}

function hasStaleCampaignDenorm(person: KarkunRegistryRecord): boolean {
  return (
    Boolean(person.assignedRuknId?.trim()) ||
    Boolean(person.assignedRukn?.trim()) ||
    person.assignmentStatus === 'Assigned' ||
    Boolean(person.assignmentDate)
  )
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Unassign every Active campaign connection for this person.
 * If any write fails, stop and return the error (do not continue parent conversion/upsert).
 */
export async function unassignActiveCampaignConnectionsForPerson(input: {
  personId: string
  performedBy?: string
}): Promise<UnassignActiveCampaignResult> {
  const personId = input.personId.trim()
  if (!personId) return { ok: true, endedIds: [] }

  const performedBy = input.performedBy?.trim() || 'Administrator'
  const actives = getActiveAssignmentsForKarkun(personId)
  const endedIds: string[] = []
  const endedAt = nowIso()
  const endedDate = todayDate()

  for (const record of actives) {
    const previousRemarks = record.remarks?.trim() ?? ''
    const remarks = previousRemarks
      ? `${previousRemarks} | ${ORGANISATIONAL_CAMPAIGN_UNASSIGN_REMARK}`
      : ORGANISATIONAL_CAMPAIGN_UNASSIGN_REMARK
    try {
      const updated = await updateAssignmentStatus(record.assignmentId, 'Unassigned', {
        removalReason: 'Other',
        remarks,
        endedDate,
        updatedAt: endedAt,
      })
      if (!updated) {
        return { ok: false, error: 'Campaign assignment could not be unassigned.' }
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to unassign campaign assignment.',
      }
    }

    endedIds.push(record.assignmentId)
    const ruknName = getRuknById(record.ruknId)?.name ?? record.ruknId
    const karkunName = getKarkunById(personId)?.name ?? personId
    logPeopleAudit({
      personKind: 'karkun',
      personId,
      personName: karkunName,
      action: 'unassign',
      previousValue: ruknName,
      updatedBy: performedBy,
    })
    logActivity({
      type: 'remove',
      message: `Connection removed — ${karkunName} from ${ruknName}`,
      ruknId: record.ruknId,
      karkunId: personId,
      assignmentId: record.assignmentId,
      actor: performedBy,
    })
    appendConnectionLedgerEntry({
      eventType: 'DISCONNECTED',
      performedBy,
      assignmentId: record.assignmentId,
      connectionId: record.assignmentId,
      ruknId: record.ruknId,
      karkunId: personId,
      metadata: {
        removalReason: 'Other',
        reason: 'organisational_one_rukn_stale_campaign_cleanup',
      },
    })
  }

  if (getActiveAssignmentsForKarkun(personId).length > 0) {
    return { ok: false, error: 'Active campaign assignment remained after unassign.' }
  }

  const person = getKarkunById(personId)
  if (!person) return { ok: true, endedIds }

  if (getPersonCategory(person) === 'Muttafiq') {
    if (endedIds.length > 0 || hasStaleCampaignDenorm(person)) {
      clearCampaignAssignmentDenorm(person)
      const durable = await persistKarkunDurable(personId)
      if (!durable.success) {
        return { ok: false, error: durable.error || 'Could not clear campaign assignment fields.' }
      }
    }
  } else {
    await syncKarkunRegistryFromAssignments(personId)
  }

  return { ok: true, endedIds }
}
