/**
 * KC-0124 — ProfilePresenter + PersonProfileEngine entry.
 * Single read model for the Admin 360° Person Profile.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import {
  adminAnnexure1Path,
  adminKarkunProfilePath,
  adminKarkunPendingRequestsPath,
  ROUTES,
} from '@/constants/routes'
import { getPersonCategory, getMuttafiqDisplayNumber } from '@/lib/peopleClassification'
import { getKarkunGuidance } from '@/lib/guidance/guidanceEngine'
import {
  getActiveAssignmentsForKarkun,
  getAssignmentHistoryForKarkun,
} from '@/stores/assignmentStore'
import { resolveActiveConnection } from '@/lib/peopleLifecycle'
import { loadContinuousKarkunJourney } from '@/lib/journey/continuousKarkunJourney'
import { aggregatePersonCampaignStatus } from './StatusAggregator'
import { buildPersonCampaignTimeline } from './TimelineBuilder'
import { buildPersonJourneyStages } from './JourneyBuilder'
import { aggregatePersonCommunications } from './CommunicationAggregator'
import type { Person360Profile } from './types'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

export function presentPerson360Profile(personId: string): Person360Profile {
  const person = getKarkunById(personId)
  if (!person) {
    return {
      personId,
      found: false,
      header: {
        name: 'Person not found',
        mobile: '',
        gender: '',
        registry: '',
        campaignStatus: '',
        connectedRuknName: '',
        ward: '',
        area: '',
        photoPlaceholder: '?',
      },
      responsibility: {
        responsibleRuknName: '',
        connectedSince: '',
        connectionStatus: 'Not found',
        assignmentHistory: [],
      },
      campaignStatus: [],
      journeyStages: [],
      continuousJourney: null,
      timeline: [],
      communications: [],
      quickActions: [],
      inboxHref: ROUTES.ADMIN_INBOX,
      journeyHref: adminAnnexure1Path(personId),
      connectionHref: ROUTES.ADMIN_ASSIGNMENTS,
    }
  }

  const category = getPersonCategory(person)
  const connection = resolveActiveConnection(personId)
  const active = getActiveAssignmentsForKarkun(personId)[0]
  const guidance = getKarkunGuidance(personId)
  const history = getAssignmentHistoryForKarkun(personId).map((record) => {
    const rukn = getRuknById(record.ruknId)
    return {
      assignmentId: record.assignmentId,
      assignmentNumber: record.assignmentNumber,
      ruknId: record.ruknId,
      ruknName: rukn?.name || record.ruknId,
      status: record.status,
      connectedSince: record.effectiveFrom || record.assignedDate,
      endedDate: record.endedDate,
    }
  })

  const registryLabel =
    category === 'Muttafiq'
      ? `Muttafiq${getMuttafiqDisplayNumber(person) ? ` · ${getMuttafiqDisplayNumber(person)}` : ''}`
      : 'Karkun'

  return {
    personId,
    found: true,
    header: {
      name: person.name,
      mobile: person.mobile,
      gender: person.gender,
      registry: registryLabel,
      campaignStatus: guidance?.stageLabel || person.campaignStatus || person.status,
      connectedRuknName:
        connection.ruknName || person.assignedRukn || (connection.connected ? connection.ruknId! : 'Unassigned'),
      ward: person.place || '',
      area: person.area || '',
      photoPlaceholder: initials(person.name),
    },
    responsibility: {
      responsibleRuknName:
        connection.ruknName || person.assignedRukn || 'Unassigned',
      connectedSince: active?.effectiveFrom || person.assignmentDate || '—',
      connectionStatus: connection.connected
        ? connection.status || person.assignmentStatus || 'Active'
        : person.assignmentStatus || 'Available',
      assignmentHistory: history,
    },
    campaignStatus: aggregatePersonCampaignStatus(personId),
    journeyStages: buildPersonJourneyStages(personId),
    continuousJourney: loadContinuousKarkunJourney(personId),
    timeline: buildPersonCampaignTimeline(person),
    communications: aggregatePersonCommunications(personId),
    quickActions: [
      {
        id: 'journey',
        label: 'Open Journey',
        href: adminAnnexure1Path(personId),
        kind: 'link',
      },
      {
        id: 'notify',
        label: 'Notify',
        href: `${ROUTES.ADMIN_COMMUNICATION}?personId=${encodeURIComponent(personId)}`,
        kind: 'link',
      },
      {
        id: 'connection',
        label: 'Open Connection',
        href: ROUTES.ADMIN_ASSIGNMENTS,
        kind: 'link',
      },
      {
        id: 'conversion',
        label: 'Request Conversion',
        href: adminKarkunPendingRequestsPath(),
        kind: category === 'Karkun' ? 'link' : 'placeholder',
      },
      {
        id: 'inbox',
        label: 'View Inbox History',
        href: `${ROUTES.ADMIN_INBOX}?query=${encodeURIComponent(person.name)}`,
        kind: 'link',
      },
    ],
    inboxHref: `${ROUTES.ADMIN_INBOX}?query=${encodeURIComponent(person.name)}`,
    journeyHref: adminAnnexure1Path(personId),
    connectionHref: ROUTES.ADMIN_ASSIGNMENTS,
  }
}

/** Alias — PersonProfileEngine public API. */
export function buildPerson360Profile(personId: string): Person360Profile {
  return presentPerson360Profile(personId)
}

/** Canonical Admin profile URL (same for Karkun and Muttafiq). */
export function adminPersonProfilePath(personId: string): string {
  return adminKarkunProfilePath(personId)
}
