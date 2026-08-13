/**
 * KC-0123 — People Lifecycle facade (presentation / orchestration only).
 * BATCH-06A — Admin Inbox = people intake + Rukn → Admin internal messages.
 * WhatsApp history is not an Inbox item.
 */

import { getAllKarkunRequests, getPendingKarkunRequests } from '@/stores/karkunRequestStore'
import { getAllRuknAdminMessages } from '@/stores/ruknAdminMessageStore'
import {
  getPeopleRequestKind,
  type NewKarkunRequest,
  type PeopleRequestKind,
} from '@/types/karkunRequest.types'
import type { RuknAdminMessage } from '@/types/ruknAdminMessage.types'
import { getPersonCategory } from '@/lib/peopleClassification'
import { resolvePersonById } from '@/lib/personResolution'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { adminKarkunProfilePath, adminRuknDetailPath } from '@/constants/routes'

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
  rawInternalMessage?: RuknAdminMessage
}

function requestFolder(request: NewKarkunRequest): InboxFolder {
  if (request.isArchived) return 'archived'
  if (request.status === 'Approved') return 'approved'
  if (request.status === 'Rejected') return 'rejected'
  return 'pending'
}

function kindLabel(kind: InboxItemKind): string {
  switch (kind) {
    case 'new_karkun':
      return 'New Karkun Request'
    case 'new_muttafiq':
      return 'New Muttafiq Request'
    case 'karkun_to_muttafiq':
      return 'Karkun → Muttafiq Conversion'
    case 'rukn_message':
      return 'Rukn → Admin message'
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
    subtitle: kindLabel(kind),
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

function mapInternalMessage(record: RuknAdminMessage): InboxItem {
  return {
    id: `ram:${record.id}`,
    kind: 'rukn_message',
    folder: record.status === 'unread' ? 'pending' : 'archived',
    title: record.subject || 'Message to Administrator',
    subtitle: kindLabel('rukn_message'),
    sender: record.ruknName || record.ruknId,
    recipient: 'Administrator',
    relatedPersonId: record.ruknId,
    relatedPersonName: record.ruknName,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    statusLabel: record.status === 'unread' ? 'Unread' : 'Read',
    unread: record.status === 'unread',
    href: adminRuknDetailPath(record.ruknId),
    rawInternalMessage: record,
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
  const messageItems = getAllRuknAdminMessages().map(mapInternalMessage)

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
        item.rawInternalMessage?.body,
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
