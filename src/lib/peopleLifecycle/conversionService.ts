/**
 * KC-0123 — Conversion that preserves identity and active connections.
 * Does not create a duplicate person record.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import {
  buildClassificationHistoryEntry,
  ensureMuttafiqRegistryNumber,
  getPersonCategory,
  isSoftRemoved,
} from '@/lib/peopleClassification'
import { logPeopleAudit } from '@/lib/peopleAuditLog'
import { bumpVersion } from '@/lib/preservation/softDelete'
import { notifyPeopleRegistryChange, persistKarkunDurable } from '@/lib/peopleStore'
import { appendConnectionLedgerEntry } from '@/services/connectionLedgerService'
import { logActivity } from '@/stores/activityLogStore'
import type { ClassificationResult } from '@/services/peopleClassificationService'

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Karkun → Muttafiq while keeping connection metadata and assignment ledger intact.
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

  const previousCategory = getPersonCategory(person)
  const at = nowIso()
  person.category = 'Muttafiq'
  person.classificationHistory = [
    ...(person.classificationHistory ?? []),
    buildClassificationHistoryEntry({
      previousCategory,
      newCategory: 'Muttafiq',
      changedBy,
      remarks: remarks || 'Approved Karkun → Muttafiq conversion (connections preserved).',
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

  appendConnectionLedgerEntry({
    eventType: 'TRANSFERRED',
    performedBy: changedBy,
    karkunId: personId,
    metadata: {
      entity: 'karkun',
      classification: 'Muttafiq',
      action: 'convert_karkun_to_muttafiq_preserve_connections',
      previousCategory,
      newCategory: 'Muttafiq',
    },
  })
  logActivity({
    type: 'complete',
    message: `Converted ${person.name} (${personId}) Karkun → Muttafiq (identity preserved).`,
    karkunId: personId,
    actor: changedBy,
  })

  return { success: true, personId }
}
