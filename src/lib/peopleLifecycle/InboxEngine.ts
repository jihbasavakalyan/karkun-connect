/**
 * KC-0123 — People Lifecycle facade (presentation / orchestration only).
 * Business rules stay in existing request, classification, and communication services.
 */

import { getAllKarkunRequests, getPendingKarkunRequests } from '@/stores/karkunRequestStore'
import { getCommunicationHistory } from '@/stores/communicationStore'
import {
  getPeopleRequestKind,
  type NewKarkunRequest,
  type PeopleRequestKind,
} from '@/types/karkunRequest.types'
import type { CommunicationHistoryRecord } from '@/types/communication'
import { getPersonCategory } from '@/lib/peopleClassification'
import { resolvePersonById } from '@/lib/personResolution'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { adminKarkunProfilePath } from '@/constants/routes'
import { isRuknVisibleCommunication } from './CommunicationResolver'

export type InboxFolder = 'pending' | 'approved' | 'rejected' | 'archived'

export type InboxItemKind =
  | PeopleRequestKind
  | 'rukn_message'
  | 'admin_notification'

export type InboxItem = {
  id: string
  kind: InboxItemKind
  folder: InboxFolder
  title: string
  subtitle: string
  sender: string
  recipient?: string
  relatedPersonId?: string
  relatedPersonName?: string
  createdAt: string
  updatedAt: string
  statusLabel: string
  unread: boolean
  href?: string
  rawRequest?: NewKarkunRequest
  rawMessage?: CommunicationHistoryRecord
}

function requestFolder(request: NewKarkunRequest): InboxFolder {
  if (request.isArchived) return 'archived'
  if (request.status === 'Approved') return 'approved'
  if (request.status === 'Rejected') return 'rejected'
  return 'pending'
}

function kindLabel(kind: InboxItemKind, request?: NewKarkunRequest): string {
  switch (kind) {
    case 'new_karkun':
      return request?.source === 'public_training_registration'
        ? 'Training gathering — new Karkun'
        : 'New Karkun Request'
    case 'new_muttafiq':
      return 'New Muttafiq Request'
    case 'karkun_to_muttafiq':
      return 'Karkun → Muttafiq Conversion'
    case 'rukn_message':
      return 'Rukn Communication'
    case 'admin_notification':
      return 'Administrative Notification'
    default:
      return 'Inbox Item'
  }
}

function mapRequest(request: NewKarkunRequest): InboxItem {
  const kind = getPeopleRequestKind(request)
  return {
    id: `req:${request.id}`,
    kind,
    folder: requestFolder(request),
    title: request.fullName,
    subtitle: kindLabel(kind, request),
    sender: request.requestingRuknName || request.requestingRuknId,
    relatedPersonId: request.sourcePersonId || request.createdKarkunId,
    relatedPersonName: request.fullName,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    statusLabel: request.status,
    unread: request.status === 'Pending Approval',
    href: request.createdKarkunId
      ? adminKarkunProfilePath(request.createdKarkunId)
      : request.sourcePersonId
        ? adminKarkunProfilePath(request.sourcePersonId)
        : undefined,
    rawRequest: request,
  }
}

function mapMessage(record: CommunicationHistoryRecord): InboxItem {
  const recipientName = record.recipient?.name ?? record.recipient?.mobile ?? 'Recipient'
  return {
    id: `msg:${record.id}`,
    kind: 'rukn_message',
    folder: 'approved',
    title: record.templateName || 'Message',
    subtitle: kindLabel('rukn_message'),
    sender: record.actor || 'Rukn',
    recipient: recipientName,
    relatedPersonId: record.recipient?.personId,
    relatedPersonName: recipientName,
    createdAt: record.sentAt,
    updatedAt: record.sentAt,
    statusLabel: record.status,
    unread: false,
    rawMessage: record,
  }
}

/** InboxEngine — single read model for Admin Unified Inbox. */
export function buildUnifiedInbox(options?: {
  folder?: InboxFolder | 'all'
  query?: string
  kind?: InboxItemKind | 'all'
}): InboxItem[] {
  const folder = options?.folder ?? 'all'
  const query = (options?.query ?? '').trim().toLowerCase()
  const kind = options?.kind ?? 'all'

  const requestItems = getAllKarkunRequests().map(mapRequest)
  const messageItems = getCommunicationHistory()
    .filter(isRuknVisibleCommunication)
    .map(mapMessage)

  let items = [...requestItems, ...messageItems].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  )

  if (folder !== 'all') {
    items = items.filter((item) => item.folder === folder)
  }
  if (kind !== 'all') {
    items = items.filter((item) => item.kind === kind)
  }
  if (query) {
    items = items.filter((item) => {
      const hay = [
        item.title,
        item.subtitle,
        item.sender,
        item.recipient,
        item.relatedPersonName,
        item.statusLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(query)
    })
  }

  return items
}

export function countUnreadInboxItems(): number {
  return buildUnifiedInbox({ folder: 'pending' }).filter((item) => item.unread).length
}

export function getPendingIntakeCount(): number {
  return getPendingKarkunRequests().length
}

/** RegistryResolver — current registry + connection snapshot for a person. */
export function resolvePersonLookup(personId: string): {
  found: boolean
  name?: string
  mobile?: string
  category?: string
  status?: string
  assignmentStatus?: string
  connectedToRuknId?: string
  connectedToRuknName?: string
  adminViewRoute?: string
} {
  const resolved = resolvePersonById(personId)
  if (!resolved || resolved.kind === 'rukn') return { found: false }
  const person = getKarkunById(personId)
  if (!person) {
    return {
      found: true,
      name: resolved.name,
      mobile: resolved.mobile,
      category: resolved.category ?? undefined,
      status: resolved.status,
      assignmentStatus: resolved.assignmentStatus,
      connectedToRuknId: resolved.assignedRuknId || undefined,
      connectedToRuknName: resolved.assignedRukn || undefined,
      adminViewRoute: resolved.profilePath ?? adminKarkunProfilePath(personId),
    }
  }
  const active = getActiveAssignmentsForKarkun(personId)[0]
  return {
    found: true,
    name: person.name,
    mobile: person.mobile,
    category: getPersonCategory(person),
    status: person.status,
    assignmentStatus: person.assignmentStatus,
    connectedToRuknId: active?.ruknId ?? person.assignedRuknId,
    connectedToRuknName: (() => {
      if (active) return getRuknById(active.ruknId)?.name ?? person.assignedRukn
      return person.assignedRukn
    })(),
    adminViewRoute: adminKarkunProfilePath(personId),
  }
}

export {
  getPendingKarkunRequests,
  getAllKarkunRequests,
}
