/**
 * Admin-only Karkun → A Rukn promotion orchestration (Increment 2).
 * No UI. Claims remain first-OTP via the existing Rukn provisioner.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById, ruknMaster, type Rukn } from '@/data/ruknMaster'
import { assertAdministratorDecisionSession } from '@/lib/auth/assertAdministratorDecisionSession'
import {
  isCompleteARuknOfficer,
  isKrPersonId,
  resolveOfficerKind,
} from '@/lib/officerIdentity'
import {
  getPersonCategory,
  isARuknPromotionInProgress,
  isSoftRemoved,
} from '@/lib/peopleClassification'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import { persistKarkunDurable, persistKarkunFieldsDurable, persistRuknDurable } from '@/lib/peopleStore'
import { toOperatorPersistError } from '@/lib/reliability/persistErrors'
import { emitPeopleRegistryChange } from '@/lib/peopleRegistryEvents'
import { bumpVersion } from '@/lib/preservation/softDelete'
import { DEFAULT_PLACE } from '@/types/people.types'
import { removeAssignment } from '@/services/assignmentService'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { getRepositories } from '@/repositories/provider'

const PROMOTION_DENIED = 'Only an Administrator can promote a Karkun to A Rukn.'

export type ARuknPromotionResult =
  | {
      success: true
      aRuknId: string
      sourcePersonId: string
      idempotent: boolean
    }
  | { success: false; error: string }

function nowIso(): string {
  return new Date().toISOString()
}

function todayDate(): string {
  return nowIso().slice(0, 10)
}

function listOfficersForSourcePerson(sourcePersonId: string): Rukn[] {
  return ruknMaster.filter(
    (officer) => officer.sourcePersonId?.trim() === sourcePersonId,
  )
}

function isActiveOfficer(officer: Rukn): boolean {
  return officer.status === 'active' && !officer.isArchived
}

function buildARuknOfficer(input: {
  id: string
  personId: string
  name: string
  gender: Rukn['gender']
  mobile: string
  whatsapp?: string
  place: string
  previousAssignedRuknId?: string
  promotedBy: string
  at: string
}): Rukn {
  return {
    id: input.id,
    name: input.name,
    gender: input.gender,
    mobile: input.mobile,
    whatsapp: input.whatsapp,
    place: input.place,
    status: 'active',
    createdAt: input.at,
    updatedAt: input.at,
    updatedBy: input.promotedBy,
    createdBy: input.promotedBy,
    officerKind: 'a_rukn',
    origin: 'promoted_karkun',
    sourcePersonId: input.personId,
    referredByRuknId: input.previousAssignedRuknId,
  }
}

async function endActiveCampaignAssignments(
  sourcePersonId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const active = getActiveAssignmentsForKarkun(sourcePersonId)
  for (const record of active) {
    const ended = await removeAssignment({
      ruknId: record.ruknId,
      karkunId: sourcePersonId,
      effectiveFrom: todayDate(),
      removalReason: 'PromotedToARukn',
      remarks: 'Karkun promoted to A Rukn',
      assignedBy: 'Administrator',
    })
    if (!ended.success) {
      return { ok: false, error: ended.error }
    }
  }
  return { ok: true }
}

function promotionAlreadyComplete(sourcePersonId: string, aRuknId: string): boolean {
  const person = getKarkunById(sourcePersonId)
  const officer = getRuknById(aRuknId)
  if (!person || !officer) return false
  if (person.promotedToARuknId !== aRuknId) return false
  if (officer.sourcePersonId !== sourcePersonId) return false
  if (!isCompleteARuknOfficer(officer)) return false
  if (getActiveAssignmentsForKarkun(sourcePersonId).length > 0) return false
  if (isARuknPromotionInProgress(person)) return false
  return true
}

async function markPromotionInProgress(
  personId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const person = getKarkunById(personId)
  if (!person) {
    return { ok: false, error: 'Karkun not found.' }
  }
  if (person.aRuknPromotionInProgress === true) {
    return { ok: true }
  }

  const authoritative = await getRepositories().karkun.readRecord(personId)
  if (!authoritative.ok) {
    return { ok: false, error: toOperatorPersistError('karkuns', authoritative.error) }
  }
  if (!authoritative.data) {
    return { ok: false, error: 'Karkun not found.' }
  }
  person.aRuknPromotionInProgress = true
  person.updatedAt = nowIso()
  person.updatedBy = 'Administrator'
  const transitionPatch: {
    aRuknPromotionInProgress: true
    referredByRuknId?: string
    assignmentStatus: typeof person.assignmentStatus
    updatedAt: string
    updatedBy: string
  } = {
    aRuknPromotionInProgress: true,
    assignmentStatus: authoritative.data.assignmentStatus ?? person.assignmentStatus,
    updatedAt: person.updatedAt,
    updatedBy: 'Administrator',
  }
  const authoritativeReferral = authoritative.data.referredByRuknId
  if (typeof authoritativeReferral === 'string') {
    transitionPatch.referredByRuknId = authoritativeReferral
  }
  const persisted = await persistKarkunFieldsDurable(personId, transitionPatch)
  if (!persisted.success) {
    person.aRuknPromotionInProgress = false
    emitPeopleRegistryChange()
    return {
      ok: false,
      error: persisted.error || 'Could not persist promotion transition state.',
    }
  }
  emitPeopleRegistryChange()
  return { ok: true }
}

/**
 * Promote an eligible Karkun to an independent A Rukn (`rukns/AR##`).
 * Retry-safe. Does not provision JWT claims (existing first-OTP path).
 */
export async function promoteKarkunToARukn(
  sourcePersonId: string,
): Promise<ARuknPromotionResult> {
  const adminGate = await assertAdministratorDecisionSession(PROMOTION_DENIED)
  if (!adminGate.ok) {
    return { success: false, error: adminGate.error }
  }
  // Firestore writes below use the Auth credential synchronized by the gate.

  const personId = sourcePersonId.trim()
  if (!isKrPersonId(personId)) {
    return { success: false, error: 'A Rukn promotion requires a valid Karkun identity (kr-*).' }
  }

  const person = getKarkunById(personId)
  if (!person) {
    return { success: false, error: 'Karkun not found.' }
  }
  if (isSoftRemoved(person)) {
    return { success: false, error: 'This person was removed from the registry.' }
  }
  if (getPersonCategory(person) !== 'Karkun') {
    return { success: false, error: 'Only an active Karkun can be promoted to A Rukn.' }
  }
  if (person.status !== 'active') {
    return { success: false, error: 'Cannot promote an inactive Karkun.' }
  }

  const mobile = normalizeMobile(person.mobile)
  if (!mobile || !isValidMobileFormat(mobile)) {
    return { success: false, error: 'Karkun must have a valid mobile number before promotion.' }
  }

  const linkedOfficers = listOfficersForSourcePerson(personId)
  const activeLinked = linkedOfficers.filter(isActiveOfficer)
  if (activeLinked.length > 1) {
    return {
      success: false,
      error: `Inconsistent state: multiple active A Rukn identities exist for ${personId}.`,
    }
  }

  const flaggedId = person.promotedToARuknId?.trim() || ''
  if (flaggedId) {
    const flaggedOfficer = getRuknById(flaggedId)
    if (!flaggedOfficer) {
      return {
        success: false,
        error: `Inconsistent state: promotedToARuknId ${flaggedId} has no officer document.`,
      }
    }
    if (flaggedOfficer.sourcePersonId !== personId) {
      return {
        success: false,
        error: `Inconsistent state: officer ${flaggedId} does not map to ${personId}.`,
      }
    }
    if (activeLinked[0] && activeLinked[0].id !== flaggedId) {
      return {
        success: false,
        error: `Inconsistent state: ${personId} maps to more than one A Rukn identity.`,
      }
    }
  }

  const recoveredOfficer =
    activeLinked[0] ?? linkedOfficers[0] ?? (flaggedId ? getRuknById(flaggedId) : undefined)

  if (recoveredOfficer && !isActiveOfficer(recoveredOfficer)) {
    return {
      success: false,
      error: `A Rukn identity ${recoveredOfficer.id} already exists for this person and is not active.`,
    }
  }

  if (recoveredOfficer && promotionAlreadyComplete(personId, recoveredOfficer.id)) {
    return {
      success: true,
      aRuknId: recoveredOfficer.id,
      sourcePersonId: personId,
      idempotent: true,
    }
  }

  if (!recoveredOfficer) {
    const conflictingOfficer = ruknMaster.find(
      (officer) =>
        isActiveOfficer(officer) &&
        officer.mobile &&
        normalizeMobile(officer.mobile) === mobile &&
        resolveOfficerKind(officer) === 'rukn',
    )
    if (conflictingOfficer) {
      return {
        success: false,
        error: `Mobile number is already used by Rukn ${conflictingOfficer.id}.`,
      }
    }
  }

  const previousAssignedRuknId =
    person.previousAssignedRuknId?.trim() ||
    recoveredOfficer?.referredByRuknId ||
    getActiveAssignmentsForKarkun(personId)[0]?.ruknId ||
    undefined

  const transition = await markPromotionInProgress(personId)
  if (!transition.ok) {
    return { success: false, error: transition.error }
  }

  const ended = await endActiveCampaignAssignments(personId)
  if (!ended.ok) {
    return { success: false, error: ended.error }
  }

  const latest = getKarkunById(personId)
  if (!latest) {
    return { success: false, error: 'Karkun not found.' }
  }
  latest.assignmentStatus = 'Assigned'
  latest.assignedRuknId = ''
  latest.assignedRukn = ''
  latest.campaignStatus = 'not_assigned'
  emitPeopleRegistryChange()
  const parked = await persistKarkunDurable(personId)
  if (!parked.success) {
    return { success: false, error: parked.error || 'Could not persist Karkun after disconnect.' }
  }

  let officer = recoveredOfficer
  let allocatedNewId = false
  if (!officer) {
    const allocated = await getRepositories().rukn.allocateNextARuknId()
    if (!allocated.ok) {
      return { success: false, error: allocated.error.message }
    }
    allocatedNewId = true
    const at = nowIso()
    officer = buildARuknOfficer({
      id: allocated.data.aRuknId,
      personId,
      name: latest.name,
      gender: latest.gender,
      mobile,
      whatsapp: latest.whatsapp,
      place: latest.place?.trim() || DEFAULT_PLACE,
      previousAssignedRuknId,
      promotedBy: 'Administrator',
      at,
    })
    ruknMaster.push(officer)
  } else if (!isCompleteARuknOfficer(officer)) {
    officer.officerKind = 'a_rukn'
    officer.origin = 'promoted_karkun'
    officer.sourcePersonId = personId
    officer.updatedAt = nowIso()
    officer.updatedBy = 'Administrator'
  }

  const persistedOfficer = await persistRuknDurable(officer.id)
  if (!persistedOfficer.success) {
    if (allocatedNewId) {
      const idx = ruknMaster.findIndex((row) => row.id === officer!.id)
      if (idx >= 0) ruknMaster.splice(idx, 1)
    }
    return {
      success: false,
      error: persistedOfficer.error || 'Could not persist A Rukn identity.',
    }
  }

  const source = getKarkunById(personId)
  if (!source) {
    return { success: false, error: 'Karkun not found.' }
  }
  const referredBy = source.referredByRuknId
  source.promotedToARuknId = officer.id
  source.promotedAt = source.promotedAt || nowIso()
  source.promotedBy = source.promotedBy || 'Administrator'
  source.previousAssignedRuknId = previousAssignedRuknId
  source.referredByRuknId = referredBy
  source.aRuknPromotionInProgress = false
  source.assignmentStatus = 'Assigned'
  source.assignedRuknId = ''
  source.assignedRukn = ''
  source.updatedAt = nowIso()
  source.updatedBy = 'Administrator'
  source.version = bumpVersion(source.version)
  emitPeopleRegistryChange()

  const persistedPerson = await persistKarkunDurable(personId)
  if (!persistedPerson.success) {
    return {
      success: false,
      error: persistedPerson.error || 'A Rukn was created but the Karkun promotion link could not be saved.',
    }
  }

  return {
    success: true,
    aRuknId: officer.id,
    sourcePersonId: personId,
    idempotent: Boolean(recoveredOfficer) && !allocatedNewId,
  }
}
