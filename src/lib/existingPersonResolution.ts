/**
 * Resolve full existing-person relationship graph for duplicate mobile UX.
 * Uses canonical Person Resolution for the person record, then connection graph.
 */

import { getRuknById } from '@/data/ruknMaster'
import {
  adminAnnexure1Path,
  adminKarkunProfilePath,
  ROUTES,
  ruknVisitPath,
} from '@/constants/routes'
import { getPersonCategory } from '@/lib/peopleClassification'
import { isKarkunSelectableForConnection } from '@/lib/connectionEligibility'
import { resolvePersonById } from '@/lib/personResolution'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { AssignmentRecord } from '@/types/assignment'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { getKarkunById } from '@/constants/mockKarkunRegistry'

export type ExistingPersonRelationship = {
  found: boolean
  lookupFailedStep?: string
  personId: string
  name: string
  mobile: string
  registry: string
  responsibleRuknId: string
  responsibleRuknName: string
  attachedConnectionId: string
  assignmentId: string
  assignmentNumber: string
  connectedSince: string
  campaignStatus: string
  ward: string
  area: string
  personStatus: string
  connectionStatus: 'Already Connected' | 'Not Connected'
  assignmentStatus: string
  eligibleToConnect: boolean
  viewRoute: string
  connectRoute: string
  adminViewRoute: string
  journeyRoute: string
  connectionRoute: string
}

function nonEmpty(value: string | undefined | null): string {
  return value?.trim() || ''
}

function resolvePersonRecord(personId: string): KarkunRegistryRecord | undefined {
  // KC-0128 — identity must resolve through the canonical Person Resolution pipeline first.
  const resolved = resolvePersonById(personId)
  if (!resolved || resolved.kind === 'rukn') {
    // Durable fallback still allows recovery when memory is cold but repo cache has the row.
    const state = unwrapRepository(getRepositories().karkun.loadState(), {
      karkuns: [],
      nextKarkunNum: 1,
    })
    return state.karkuns.find((row) => row.id === personId && !row.isArchived)
  }

  const memory = getKarkunById(personId)
  if (memory) return memory

  const state = unwrapRepository(getRepositories().karkun.loadState(), {
    karkuns: [],
    nextKarkunNum: 1,
  })
  return state.karkuns.find((row) => row.id === personId && !row.isArchived)
}

function resolveActiveAssignment(personId: string): AssignmentRecord | undefined {
  const memory = getActiveAssignmentsForKarkun(personId)[0]
  if (memory) return memory

  const state = unwrapRepository(getRepositories().connection.loadState(), {
    assignments: [],
    nextSequence: 1,
  })
  return state.assignments.find(
    (record) => record.karkunId === personId && record.status === 'Active' && !record.isArchived,
  )
}

function resolveRuknName(ruknId: string): string {
  if (!ruknId) return ''
  const memory = getRuknById(ruknId)
  if (memory?.name) return memory.name

  const rukns = unwrapRepository(getRepositories().rukn.loadAll(), [])
  return rukns.find((rukn) => rukn.id === ruknId)?.name ?? ''
}

/**
 * Full Mobile → Person → Registry → Connection → Rukn → Campaign graph.
 */
export function resolveExistingPersonRelationship(
  personId: string,
  fallbackName = '',
  fallbackMobile = '',
): ExistingPersonRelationship {
  const person = resolvePersonRecord(personId)
  if (!person) {
    return {
      found: false,
      lookupFailedStep: 'Person record',
      personId,
      name: fallbackName || 'Unknown',
      mobile: fallbackMobile,
      registry: '',
      responsibleRuknId: '',
      responsibleRuknName: '',
      attachedConnectionId: '',
      assignmentId: '',
      assignmentNumber: '',
      connectedSince: '',
      campaignStatus: '',
      ward: '',
      area: '',
      personStatus: '',
      connectionStatus: 'Not Connected',
      assignmentStatus: '',
      eligibleToConnect: false,
      viewRoute: ROUTES.RUKN_MY_KARKUN,
      connectRoute: ROUTES.RUKN_AVAILABLE_KARKUN,
      adminViewRoute: adminKarkunProfilePath(personId),
      journeyRoute: adminAnnexure1Path(personId),
      connectionRoute: ROUTES.ADMIN_ASSIGNMENTS,
    }
  }

  const assignment = resolveActiveAssignment(personId)
  const denormRuknId = nonEmpty(person.assignedRuknId)
  const responsibleRuknId = nonEmpty(assignment?.ruknId) || denormRuknId
  let responsibleRuknName = ''
  if (responsibleRuknId) {
    responsibleRuknName = resolveRuknName(responsibleRuknId) || nonEmpty(person.assignedRukn)
    if (!responsibleRuknName) {
      // Rukn master scoped / missing — surface id rather than inventing "Rukn not found".
      responsibleRuknName = responsibleRuknId
    }
  }

  const connected = Boolean(assignment) || Boolean(responsibleRuknId)
  const eligibleToConnect = isKarkunSelectableForConnection(person)

  return {
    found: true,
    personId: person.id,
    name: person.name || fallbackName,
    mobile: nonEmpty(person.mobile) || fallbackMobile,
    registry: getPersonCategory(person),
    responsibleRuknId,
    responsibleRuknName: responsibleRuknName || (connected ? responsibleRuknId : '—'),
    attachedConnectionId: nonEmpty(assignment?.assignmentId),
    assignmentId: nonEmpty(assignment?.assignmentId),
    assignmentNumber: nonEmpty(assignment?.assignmentNumber),
    connectedSince: nonEmpty(assignment?.effectiveFrom) || nonEmpty(person.assignmentDate) || '—',
    campaignStatus: nonEmpty(String(person.campaignStatus ?? '')) || 'not_assigned',
    ward: nonEmpty(person.place) || '—',
    area: nonEmpty(person.area) || '—',
    personStatus: nonEmpty(person.status) || '—',
    connectionStatus: connected ? 'Already Connected' : 'Not Connected',
    assignmentStatus: nonEmpty(person.assignmentStatus) || (connected ? 'Assigned' : 'Available'),
    eligibleToConnect,
    viewRoute: ruknVisitPath(person.id),
    connectRoute: ROUTES.RUKN_AVAILABLE_KARKUN,
    adminViewRoute: adminKarkunProfilePath(person.id),
    journeyRoute: adminAnnexure1Path(person.id),
    connectionRoute: ROUTES.ADMIN_ASSIGNMENTS,
  }
}
