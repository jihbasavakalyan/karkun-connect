/**
 * KC-0101 — Move people between Karkun and Muttafiq classifications.
 * Never deletes or duplicates records; only classification metadata changes.
 */

import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import {
  buildClassificationHistoryEntry,
  getPersonCategory,
  isSoftRemoved,
} from '@/lib/peopleClassification'
import { logPeopleAudit } from '@/lib/peopleAuditLog'
import { bumpVersion } from '@/lib/preservation/softDelete'
import { notifyPeopleRegistryChange, notifyPeopleRegistryUiOnly } from '@/lib/peopleStore'
import { appendConnectionLedgerEntry } from '@/services/connectionLedgerService'
import { logActivity } from '@/stores/activityLogStore'
import {
  getActiveAssignmentsForKarkun,
} from '@/stores/assignmentStore'
import type { PersonCategory, KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type ClassificationResult = {
  success: boolean
  error?: string
  blockers?: string[]
}

function nowIso(): string {
  return new Date().toISOString()
}

function findPerson(id: string): KarkunRegistryRecord | undefined {
  return MOCK_KARKUN_REGISTRY.find((k) => k.id === id)
}

function hasActiveConnection(person: KarkunRegistryRecord): boolean {
  if (person.assignmentStatus === 'Assigned') return true
  if (person.assignedRuknId?.trim()) return true
  return getActiveAssignmentsForKarkun(person.id).length > 0
}

/** Blockers for moving a Karkun to Muttafiqeen (must disconnect first). */
export function getMoveToMuttafiqeenBlockers(personId: string): string[] {
  const person = findPerson(personId)
  if (!person) return ['Person not found.']
  if (isSoftRemoved(person)) return ['This person was removed from the registry.']
  if (getPersonCategory(person) === 'Muttafiq') {
    return ['Already classified as Muttafiq.']
  }

  const blockers: string[] = []
  if (getActiveAssignmentsForKarkun(personId).length > 0) {
    blockers.push('This Karkun has an active assignment. Disconnect first.')
  } else if (hasActiveConnection(person)) {
    blockers.push('This Karkun has an active connection to a Rukn. Disconnect first.')
  }
  return blockers
}

export function getMoveToKarkunBlockers(personId: string): string[] {
  const person = findPerson(personId)
  if (!person) return ['Person not found.']
  if (isSoftRemoved(person)) return ['This person was removed from the registry.']
  if (getPersonCategory(person) === 'Karkun') {
    return ['Already classified as Karkun.']
  }
  return []
}

function applyCategoryChange(
  person: KarkunRegistryRecord,
  newCategory: PersonCategory,
  changedBy: string,
  remarks?: string,
): void {
  const previousCategory = getPersonCategory(person)
  const at = nowIso()
  const entry = buildClassificationHistoryEntry({
    previousCategory,
    newCategory,
    changedBy,
    remarks,
    at,
  })

  person.category = newCategory
  person.classificationHistory = [...(person.classificationHistory ?? []), entry]
  person.isArchived = false
  person.archivedAt = undefined
  person.archivedBy = undefined
  if (person.archiveKind === 'standard') {
    person.archiveKind = undefined
  }
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
    newValue: newCategory,
    updatedBy: changedBy,
  })
}

/**
 * Move Karkun → Muttafiqeen. Replaces legacy Archive for organizational reclassification.
 * Caller should await persistKarkunDurable.
 */
export function moveToMuttafiqeen(
  personId: string,
  changedBy = 'Administrator',
  remarks?: string,
): ClassificationResult {
  const blockers = getMoveToMuttafiqeenBlockers(personId)
  if (blockers.length > 0) {
    return { success: false, error: blockers.join(' '), blockers }
  }

  const person = findPerson(personId)
  if (!person) return { success: false, error: 'Person not found.' }

  applyCategoryChange(person, 'Muttafiq', changedBy, remarks)
  person.needsReview = false

  // Clear pool assignment metadata when leaving campaign eligibility.
  person.assignedRukn = ''
  person.assignedRuknId = ''
  person.assignmentStatus = 'Available'
  person.assignmentDate = undefined
  person.campaignStatus = 'not_assigned'

  notifyPeopleRegistryChange()

  appendConnectionLedgerEntry({
    eventType: 'ARCHIVED',
    performedBy: changedBy,
    karkunId: personId,
    metadata: {
      entity: 'karkun',
      classification: 'Muttafiq',
      action: 'move_to_muttafiqeen',
    },
  })
  logActivity({
    type: 'complete',
    message: `Moved ${person.name} (${personId}) to Muttafiqeen.`,
    karkunId: personId,
    actor: changedBy,
  })

  return { success: true }
}

/**
 * Move Muttafiq → Karkun Registry.
 * Caller should await persistKarkunDurable.
 */
export function moveToKarkunRegistry(
  personId: string,
  changedBy = 'Administrator',
  remarks?: string,
): ClassificationResult {
  const blockers = getMoveToKarkunBlockers(personId)
  if (blockers.length > 0) {
    return { success: false, error: blockers.join(' '), blockers }
  }

  const person = findPerson(personId)
  if (!person) return { success: false, error: 'Person not found.' }

  applyCategoryChange(person, 'Karkun', changedBy, remarks)
  person.assignmentStatus = 'Available'
  person.campaignStatus = person.status === 'inactive' ? 'inactive' : 'not_assigned'

  notifyPeopleRegistryChange()

  appendConnectionLedgerEntry({
    eventType: 'UNARCHIVED',
    performedBy: changedBy,
    karkunId: personId,
    metadata: {
      entity: 'karkun',
      classification: 'Karkun',
      action: 'move_to_karkun',
    },
  })
  logActivity({
    type: 'restore',
    message: `Moved ${person.name} (${personId}) to Karkun Registry.`,
    karkunId: personId,
    actor: changedBy,
  })

  notifyPeopleRegistryUiOnly()
  return { success: true }
}
