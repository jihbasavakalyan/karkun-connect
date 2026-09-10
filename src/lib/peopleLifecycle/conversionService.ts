/**
 * KC-0123 — Conversion that preserves person identity.
 * Does not create a duplicate person record.
 * Does not create a Muttafiq relationship from campaign data.
 * Active campaign connections are Unassigned before category change.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { unassignActiveCampaignConnectionsForPerson } from '@/lib/connections/unassignActiveCampaignConnectionsForPerson'
import {
  buildClassificationHistoryEntry,
  ensureMuttafiqRegistryNumber,
  getPersonCategory,
  isSoftRemoved,
} from '@/lib/peopleClassification'
import { logPeopleAudit } from '@/lib/peopleAuditLog'
import { bumpVersion } from '@/lib/preservation/softDelete'
import { notifyPeopleRegistryChange, persistKarkunDurable } from '@/lib/peopleStore'
import { logActivity } from '@/stores/activityLogStore'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { ClassificationResult } from '@/services/peopleClassificationService'

function nowIso(): string {
  return new Date().toISOString()
}

const CONVERSION_REMARKS = 'Approved Karkun → Muttafiq conversion (campaign assignment ended).'

/**
 * Karkun → Muttafiq. Unassign Active campaign connections while still Karkun,
 * then change category. Does not establish Muttafiq↔Rukn ownership.
 */
export async function convertKarkunToMuttafiqPreservingIdentity(
  personId: string,
  changedBy: string,
  remarks?: string,
): Promise<ClassificationResult & { personId?: string }> {
  const person = getKarkunById(personId)
  if (!person) return { success: false, error: 'Person not found.' }
  if (isSoftRemoved(person)) {
    return { success: false, error: 'This person was removed from the registry.' }
  }
  if (getPersonCategory(person) === 'Muttafiq') {
    return { success: false, error: 'Already classified as Muttafiq.' }
  }

  const cleaned = await unassignActiveCampaignConnectionsForPerson({
    personId,
    performedBy: changedBy,
  })
  if (!cleaned.ok) {
    return { success: false, error: cleaned.error, personId }
  }
  if (getActiveAssignmentsForKarkun(personId).length > 0) {
    return {
      success: false,
      error: 'Active campaign assignment remained after unassign.',
      personId,
    }
  }

  const previousCategory = getPersonCategory(person)
  const at = nowIso()
  person.category = 'Muttafiq'
  person.classificationHistory = [
    ...(person.classificationHistory ?? []),
    buildClassificationHistoryEntry({
      previousCategory,
      newCategory: 'Muttafiq',
      changedBy,
      remarks: remarks || CONVERSION_REMARKS,
      at,
    }),
  ]
  ensureMuttafiqRegistryNumber(person)
  person.updatedAt = at
  person.updatedBy = changedBy
  person.version = bumpVersion(person.version)

  logPeopleAudit({
    personKind: 'karkun',
    personId: person.id,
    personName: person.name,
    action: 'reclassify',
    field: 'category',
    previousValue: previousCategory,
    newValue: 'Muttafiq',
    updatedBy: changedBy,
  })

  notifyPeopleRegistryChange()
  const durable = await persistKarkunDurable(personId)
  if (!durable.success) {
    return {
      success: false,
      error: durable.error || 'Conversion could not be saved durably.',
      personId,
    }
  }

  logActivity({
    type: 'complete',
    message: `Converted ${person.name} (${personId}) Karkun → Muttafiq (identity preserved).`,
    karkunId: personId,
    actor: changedBy,
  })

  return { success: true, personId }
}
