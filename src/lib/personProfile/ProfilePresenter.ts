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
import {
  getMuttafiqDisplayNumber,
  getPersonCategory,
  getRemovedRegistryLabel,
  isMuttafiq,
} from '@/lib/peopleClassification'
import { UI_LABELS } from '@/lib/uiTerminology'
import { getMuttafiqConnectedRuknDisplayForPerson } from '@/stores/muttafiqRelationshipStore'
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
  const removedLabel = getRemovedRegistryLabel(person)
  const operationalMuttafiq = isMuttafiq(person)
  const connection = resolveActiveConnection(personId)
  const muttafiqDisplay = operationalMuttafiq
    ? getMuttafiqConnectedRuknDisplayForPerson(personId)
    : null
  const muttafiqView = muttafiqDisplay?.view ?? null
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

  const registryLabel = removedLabel
    ? removedLabel
    : operationalMuttafiq
      ? `Muttafiq${getMuttafiqDisplayNumber(person) ? ` · ${getMuttafiqDisplayNumber(person)}` : ''}`
      : 'Karkun'

  const removed = removedLabel
    ? {
        label: removedLabel,
        by: person.archivedBy?.trim() || person.updatedBy || 'Administrator',
        at: person.archivedAt,
        reason: person.deleteReason,
        relationshipHistoryPreserved: true,
      }
    : undefined

  return {
    personId,
    found: true,
    removed,
    header: {
      name: person.name,
      mobile: person.mobile,
      gender: person.gender,
      registry: registryLabel,
      campaignStatus: removed
        ? removed.label
        : guidance?.stageLabel || person.campaignStatus || person.status,
      connectedRuknName: removed
        ? '—'
        : muttafiqView
          ? muttafiqView.status === 'none'
            ? 'Not Connected'
            : muttafiqView.connectedRuknLabel
          : connection.ruknName || person.assignedRukn || (connection.connected ? connection.ruknId! : 'Unassigned'),
      connectedCount: removed ? undefined : muttafiqView ? muttafiqView.activeCount : undefined,
      ward: person.place || '',
      area: person.area || '',
      photoPlaceholder: initials(person.name),
    },
    responsibility: {
      responsibleRuknName: removed
        ? '—'
        : muttafiqView
          ? muttafiqView.status === 'none'
            ? 'Not Connected'
            : muttafiqView.connectedRuknLabel
          : connection.ruknName || person.assignedRukn || 'Unassigned',
      connectedSince: removed
        ? '—'
        : muttafiqView
          ? muttafiqView.current?.createdAt?.slice(0, 10) || '—'
          : active?.effectiveFrom || person.assignmentDate || '—',
      connectionStatus: removed
        ? removed.label
        : muttafiqView
          ? muttafiqView.relationshipLabel
          : connection.connected
            ? connection.status || person.assignmentStatus || 'Active'
            : person.assignmentStatus || 'Available',
      assignmentHistory: history,
    },
    campaignStatus: removed ? [] : aggregatePersonCampaignStatus(personId),
    journeyStages: removed ? [] : buildPersonJourneyStages(personId),
    continuousJourney: removed ? null : loadContinuousKarkunJourney(personId),
    timeline: buildPersonCampaignTimeline(person),
    communications: aggregatePersonCommunications(personId),
    quickActions: [
      {
        id: 'journey',
        label: 'Open Journey',
        href: adminAnnexure1Path(personId),
        kind: removed ? 'placeholder' : 'link',
      },
      {
        id: 'notify',
        label: 'Notify',
        href: `${ROUTES.ADMIN_COMMUNICATION}?personId=${encodeURIComponent(personId)}`,
        kind: removed ? 'placeholder' : 'link',
      },
      {
        id: 'connection',
        label: 'Open Connection',
        href: ROUTES.ADMIN_ASSIGNMENTS,
        kind: removed ? 'placeholder' : 'link',
      },
      {
        id: 'conversion',
        label: 'Request Conversion',
        href: adminKarkunPendingRequestsPath(),
        kind: !removed && category === 'Karkun' ? 'link' : 'placeholder',
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
    relationshipDisplay:
      !removed && muttafiqView && muttafiqDisplay
        ? {
            status: muttafiqView.status,
            activeCount: muttafiqView.activeCount,
            title: UI_LABELS.connectedRukn,
            emptyLabel:
              muttafiqView.status === 'duplicate' ? 'Needs review' : UI_LABELS.notConnected,
            diagnosticRuknIds: muttafiqView.diagnosticRuknIds,
            row: muttafiqDisplay.row,
          }
        : undefined,
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
