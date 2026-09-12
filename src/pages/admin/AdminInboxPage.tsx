/**
 * KC-0123 / BATCH-06A — Admin Inbox (people intake + Rukn → Admin internal messages).
 * WhatsApp history is not shown here. No chat/thread.
 * KC-028B — unified write lifecycle for approve / reject / mark read.
 * Increment 08 — presentation/IA + Pending includes unread Rukn messages.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { searchParamsEqual } from '@/lib/navigation/searchParamsReplace'
import { CommunicationSectionNav } from '@/components/communication/CommunicationSectionNav'
import { InboxAccordionSection } from '@/components/inbox/InboxAccordionSection'
import { EmptyState, ListSkeleton, PageHeader, PageShell } from '@/components/ui'
import { adminCommunicationPath } from '@/lib/communicationNavigation'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { BUTTON_BASE_CLASS, BUTTON_SIZE_CLASS } from '@/components/ui/buttonBase'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { useAuth } from '@/hooks/useAuth'
import { useRepositoryHydrationStatus } from '@/hooks/useRepositoryHydration'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import {
  buildUnifiedInbox,
  countUnreadInboxItems,
  resolveInboxFolder,
  type InboxFolderFilter,
  type InboxItem,
  type InboxItemKind,
} from '@/lib/peopleLifecycle'
import { classifyWriteError } from '@/lib/reliability/writeLifecycle'
import {
  approvePeopleIntakeRequest,
  rejectNewKarkunRequest,
  subscribeToKarkunRequestStore,
} from '@/services/karkunRequestService'
import {
  reloadKarkunRequestStoreFromPersistence,
  syncKarkunRequestStoreFromServer,
} from '@/stores/karkunRequestStore'
import { reloadMuttafiqRelationshipStoreFromPersistence } from '@/stores/muttafiqRelationshipStore'
import { getRepositoryProviderMode } from '@/repositories/provider'
import { markRuknAdminMessageRead } from '@/services/ruknAdminMessageService'
import { subscribeToRuknAdminMessageStore } from '@/stores/ruknAdminMessageStore'
import { TrainingGatheringAdminPanel } from '@/components/public-registration/TrainingGatheringAdminPanel'
import {
  isNewKarkunIntakeRequest,
  isPublicTrainingRequest,
  publicTrainingReferralValue,
  PublicTrainingApproveFields,
  SubmittedReferringRuknDisplay,
} from '@/components/forms/people/PublicTrainingApproveFields'
import { getPeopleRequestKind } from '@/types/karkunRequest.types'
import { getRuknById } from '@/data/ruknMaster'
import { isEligibleReferringRukn } from '@/lib/referringRukn'
import { buildWhatsAppLink } from '@/utils/personContactLinks'

const FOLDERS: { id: InboxFolderFilter; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'archived', label: 'Archived' },
  { id: 'all', label: 'All' },
]

const KINDS: { id: InboxItemKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'new_karkun', label: 'New Karkun' },
  { id: 'new_muttafiq', label: 'New Muttafiq' },
  { id: 'karkun_to_muttafiq', label: 'Conversions' },
  { id: 'muttafiq_rukn_link', label: 'Muttafiq links' },
  { id: 'rukn_message', label: 'Rukn messages' },
]

const INBOX_LINK_CLASS = [
  BUTTON_BASE_CLASS,
  BUTTON_SIZE_CLASS.md,
  'border border-border bg-surface text-text-heading hover:border-primary/30 hover:bg-surface-muted',
].join(' ')

/** Existing InboxEngine kind labels — presentation grouping only. */
const INBOX_SECTION_ORDER = [
  'new_karkun',
  'training_new_karkun',
  'new_muttafiq',
  'karkun_to_muttafiq',
  'muttafiq_rukn_link',
  'rukn_message',
  'admin_notification',
] as const

function inboxSectionId(item: InboxItem): string {
  if (item.kind === 'new_karkun') {
    return item.rawRequest?.source === 'public_training_registration'
      ? 'training_new_karkun'
      : 'new_karkun'
  }
  return item.kind
}

function inboxSectionLabel(sectionId: string): string {
  switch (sectionId) {
    case 'new_karkun':
      return 'New Karkun Request'
    case 'training_new_karkun':
      return 'Training gathering — new Karkun'
    case 'new_muttafiq':
      return 'New Muttafiq Request'
    case 'karkun_to_muttafiq':
      return 'Karkun → Muttafiq Conversion'
    case 'muttafiq_rukn_link':
      return 'Muttafiq → Rukn Link'
    case 'rukn_message':
      return 'Rukn → Admin message'
    case 'admin_notification':
      return 'Administrative Notification'
    default:
      return 'Inbox Item'
  }
}

function groupInboxItems(items: InboxItem[]): { id: string; label: string; items: InboxItem[] }[] {
  const buckets = new Map<string, InboxItem[]>()
  for (const item of items) {
    const id = inboxSectionId(item)
    const list = buckets.get(id) ?? []
    list.push(item)
    buckets.set(id, list)
  }
  const ordered: { id: string; label: string; items: InboxItem[] }[] = []
  for (const id of INBOX_SECTION_ORDER) {
    const groupItems = buckets.get(id)
    if (groupItems && groupItems.length > 0) {
      ordered.push({ id, label: inboxSectionLabel(id), items: groupItems })
    }
  }
  for (const [id, groupItems] of buckets) {
    if (!INBOX_SECTION_ORDER.includes(id as (typeof INBOX_SECTION_ORDER)[number])) {
      ordered.push({ id, label: inboxSectionLabel(id), items: groupItems })
    }
  }
  return ordered
}

function writeInboxSearchParams(
  current: URLSearchParams,
  patch: { folder?: InboxFolderFilter; query?: string },
): URLSearchParams {
  const next = new URLSearchParams(current)
  if (patch.folder !== undefined) {
    next.set('folder', patch.folder)
  }
  if (patch.query !== undefined) {
    const trimmed = patch.query.trim()
    if (trimmed) next.set('query', trimmed)
    else next.delete('query')
  }
  return next
}

export function AdminInboxPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const hydration = useRepositoryHydrationStatus()
  const [searchParams, setSearchParams] = useSearchParams()
  const folder = resolveInboxFolder(searchParams.get('folder'))
  const urlQuery = searchParams.get('query') ?? ''
  const [tick, setTick] = useState(0)
  const [kind, setKind] = useState<InboxItemKind | 'all'>('all')
  const [queryDraft, setQueryDraft] = useState(urlQuery)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [referralByRequestId, setReferralByRequestId] = useState<Record<string, string>>({})
  const [familyByRequestId, setFamilyByRequestId] = useState<Record<string, string>>({})
  const [addressByRequestId, setAddressByRequestId] = useState<Record<string, string>>({})
  const [openInboxSection, setOpenInboxSection] = useState('')
  const { busy, busyKey, progressMessage, run } = useWriteLifecycle()

  useEffect(() => {
    setQueryDraft(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    if (queryDraft === urlQuery) return
    const handle = window.setTimeout(() => {
      setSearchParams((current) => {
        const next = writeInboxSearchParams(current, { query: queryDraft })
        return searchParamsEqual(current, next) ? current : next
      }, {
        replace: true,
      })
    }, 300)
    return () => window.clearTimeout(handle)
  }, [queryDraft, urlQuery, setSearchParams])

  useEffect(() => {
    const unsubRequests = subscribeToKarkunRequestStore(() => setTick((v) => v + 1))
    const unsubMessages = subscribeToRuknAdminMessageStore(() => setTick((v) => v + 1))
    return () => {
      unsubRequests()
      unsubMessages()
    }
  }, [])

  const items = useMemo(() => {
    void tick
    return buildUnifiedInbox({ folder, kind, query: queryDraft })
  }, [folder, kind, queryDraft, tick])

  const groupedItems = useMemo(() => groupInboxItems(items), [items])

  useEffect(() => {
    if (!queryDraft.trim()) return
    const first = groupedItems[0]
    if (first) setOpenInboxSection(first.id)
    // Open matching groups when search/filter changes; do not reset on store ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- groupedItems excluded on purpose
  }, [queryDraft, folder, kind])

  const unread = useMemo(() => {
    void tick
    return countUnreadInboxItems()
  }, [tick])

  const decidedBy = user?.displayName ?? user?.uid ?? 'Administrator'

  const setFolder = (next: InboxFolderFilter) => {
    setSearchParams((current) => {
      const patched = writeInboxSearchParams(current, { folder: next })
      return searchParamsEqual(current, patched) ? current : patched
    }, {
      replace: true,
    })
  }

  const refreshAfterDecision = async () => {
    try {
      await syncKarkunRequestStoreFromServer()
    } catch {
      reloadKarkunRequestStoreFromPersistence()
    }
    try {
      if (getRepositoryProviderMode() === 'firestore') {
        const { refreshMuttafiqRelationshipCacheFromServer } = await import(
          '@/repositories/firestore/muttafiqRelationshipFirestoreRepository'
        )
        await refreshMuttafiqRelationshipCacheFromServer()
      }
    } catch {
      // soft — local / soft-skip
    }
    reloadMuttafiqRelationshipStoreFromPersistence()
    setTick((v) => v + 1)
  }

  const handleApprove = (item: InboxItem) => {
    const request = item.rawRequest
    if (!request) return
    setError('')
    setNotice('')
    void run({
      key: `inbox:approve:${request.id}`,
      queueLabels: ['settings.karkunRequests'],
      timeoutMs: 90_000,
      work: async () => {
        const result = await approvePeopleIntakeRequest({
          requestId: request.id,
          decidedBy,
          referredByRuknId:
            publicTrainingReferralValue(request, referralByRequestId) || undefined,
          fatherHusbandName: isPublicTrainingRequest(request)
            ? familyByRequestId[request.id]
            : undefined,
          address: isPublicTrainingRequest(request) ? addressByRequestId[request.id] : undefined,
        })
        if (!result.ok) {
          throw Object.assign(new Error(result.error), {
            code: result.code ?? 'unknown',
            persistPath: result.persistPath,
            persistCode: result.persistCode,
          })
        }
        return result
      },
      refreshCounters: refreshAfterDecision,
      refreshUi: refreshAfterDecision,
    }).then((lifecycle) => {
      if (!lifecycle) return
      refreshAfterDecision()
      if (!lifecycle.ok) {
        if (lifecycle.code === 'already_processed') {
          setError('')
          setNotice(`${request.fullName} was already processed.`)
          return
        }
        setError(lifecycle.message)
        return
      }
      setNotice(`Approved ${request.fullName}.`)
    })
  }

  const handleReject = (item: InboxItem) => {
    const request = item.rawRequest
    if (!request) return
    setError('')
    setNotice('')
    void run({
      key: `inbox:reject:${request.id}`,
      queueLabels: ['settings.karkunRequests'],
      timeoutMs: 90_000,
      work: async () => {
        const result = await rejectNewKarkunRequest({
          requestId: request.id,
          decidedBy,
        })
        if (!result.ok) {
          throw Object.assign(new Error(result.error), { code: 'unknown' })
        }
        return result
      },
      refreshCounters: refreshAfterDecision,
      refreshUi: refreshAfterDecision,
    }).then((lifecycle) => {
      if (!lifecycle) return
      refreshAfterDecision()
      if (!lifecycle.ok) {
        const classified = classifyWriteError(lifecycle.error ?? lifecycle.message)
        setError(classified.message)
        return
      }
      setNotice(`Rejected ${request.fullName}.`)
    })
  }

  const handleMarkRead = (item: InboxItem) => {
    const message = item.rawInternalMessage
    if (!message) return
    setError('')
    setNotice('')
    void run({
      key: `inbox:read:${message.id}`,
      queueLabels: ['settings.ruknAdminMessages'],
      work: async () => {
        const result = await markRuknAdminMessageRead({
          messageId: message.id,
          readBy: decidedBy,
        })
        if (!result.ok) {
          throw Object.assign(new Error(result.error), { code: 'unknown' })
        }
        return result
      },
      refreshCounters: refreshAfterDecision,
      refreshUi: refreshAfterDecision,
    }).then((lifecycle) => {
      if (!lifecycle) return
      if (!lifecycle.ok) {
        const classified = classifyWriteError(lifecycle.error ?? lifecycle.message)
        setError(classified.message)
        refreshAfterDecision()
        return
      }
      setNotice('Message marked as read.')
    })
  }

  const unreadBadge =
    hydration.ready && unread > 0 ? (
      <span className="rounded-full bg-primary-muted px-3 py-1 text-sm font-semibold text-primary">
        {unread} needing attention
      </span>
    ) : null

  if (hydration.failed) {
    return (
      <PageShell>
        <PageHeader
          title={
            <span dir="rtl" lang="ur">
              ان باکس
            </span>
          }
          description="People intake and one-way Rukn messages. Reply to a Rukn on WhatsApp — this is not a chat."
        />
        <EmptyState
          icon="warning"
          title="Unable to load Inbox"
          description={hydration.error ?? 'Inbox records could not be loaded.'}
        >
          <PrimaryButton type="button" className="mt-3" onClick={hydration.retry}>
            Retry
          </PrimaryButton>
        </EmptyState>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        title={
          <span dir="rtl" lang="ur">
            ان باکس
          </span>
        }
        description="People intake and one-way Rukn messages. Reply to a Rukn on WhatsApp — this is not a chat. Part of مواصلات."
        actions={unreadBadge}
      />

      <CommunicationSectionNav
        active="overview"
        inboxActive
        onChange={(section) => navigate(adminCommunicationPath(section))}
      />

      <nav
        className="mb-4 flex flex-nowrap gap-1 overflow-x-auto border-b border-border pb-px"
        aria-label="Inbox folders"
      >
        {FOLDERS.map((entry) => {
          const selected = folder === entry.id
          return (
            <button
              key={entry.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              className={`ds-tab shrink-0 border-b-2 rounded-none px-4 ${
                selected ? 'border-primary text-primary ds-tab-active' : 'border-transparent'
              }`}
              onClick={() => setFolder(entry.id)}
            >
              {entry.label}
            </button>
          )
        })}
      </nav>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Search</span>
          <input
            className={FORM_INPUT_CLASS}
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Search name, sender, status…"
          />
        </label>
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Filter</span>
          <select
            className={FORM_INPUT_CLASS}
            value={kind}
            onChange={(event) => setKind(event.target.value as InboxItemKind | 'all')}
          >
            {KINDS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="ds-banner-error mb-3" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="ds-banner-success mb-3" role="status">
          {notice}
        </div>
      ) : null}
      {busy && progressMessage ? (
        <p className="mb-3 text-sm text-secondary" role="status" aria-live="polite">
          {progressMessage}
        </p>
      ) : null}

      {!hydration.ready ? (
        <ListSkeleton rows={5} />
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-secondary">
          No items in this folder.
        </p>
      ) : (
        <div className="space-y-3">
          {groupedItems.map((section) => (
            <InboxAccordionSection
              key={section.id}
              title={section.label}
              count={section.items.length}
              open={openInboxSection === section.id}
              onToggle={() =>
                setOpenInboxSection((current) => (current === section.id ? '' : section.id))
              }
            >
              <ul className="space-y-3">
                {section.items.map((item) => {
                  const itemBusy =
                    busyKey === `inbox:approve:${item.rawRequest?.id ?? ''}` ||
                    busyKey === `inbox:reject:${item.rawRequest?.id ?? ''}` ||
                    busyKey === `inbox:read:${item.rawInternalMessage?.id ?? ''}`
                  const actionLabel = itemBusy
                    ? progressMessage || 'Saving'
                    : null
                  const canDecide = Boolean(item.rawRequest && item.folder === 'pending')
                  const canMarkRead = Boolean(
                    item.rawInternalMessage && item.rawInternalMessage.status === 'unread',
                  )
                  const rukn = item.rawInternalMessage
                    ? getRuknById(item.rawInternalMessage.ruknId)
                    : undefined
                  const whatsappHref = rukn
                    ? buildWhatsAppLink(rukn.whatsapp?.trim() ? rukn.whatsapp : rukn.mobile)
                    : null
                  const publicTrainingReferral = item.rawRequest
                    ? publicTrainingReferralValue(item.rawRequest, referralByRequestId)
                    : ''
                  const referringRukn = publicTrainingReferral
                    ? getRuknById(publicTrainingReferral)
                    : undefined
                  const approveBlockedForReferral = Boolean(
                    item.rawRequest &&
                      isNewKarkunIntakeRequest(item.rawRequest) &&
                      (!referringRukn || !isEligibleReferringRukn(referringRukn)),
                  )
                  const viewLabel = item.rawInternalMessage ? 'View Rukn' : 'View person'
                  return (
                    <li
                      key={item.id}
                      className="rounded-xl border border-border bg-surface px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                            {item.subtitle}
                          </p>
                          <p className="font-semibold text-text-heading">{item.title}</p>
                          <p className="mt-1 text-sm text-secondary">
                            From {item.sender}
                            {item.recipient ? ` → ${item.recipient}` : ''}
                          </p>
                          {item.rawRequest ? (
                            <p className="mt-1 text-xs text-secondary">
                              Kind: {getPeopleRequestKind(item.rawRequest)} · {item.rawRequest.mobile}
                              {item.rawRequest.source === 'public_training_registration'
                                ? ` · ${item.rawRequest.address ?? ''} · ${item.rawRequest.education ?? ''} · ${item.rawRequest.profession ?? ''}`
                                : ''}
                            </p>
                          ) : null}
                          {item.rawInternalMessage ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-text-heading">
                              {item.rawInternalMessage.body}
                            </p>
                          ) : null}
                          {item.rawRequest &&
                          canDecide &&
                          isNewKarkunIntakeRequest(item.rawRequest) &&
                          !isPublicTrainingRequest(item.rawRequest) ? (
                            <SubmittedReferringRuknDisplay
                              request={item.rawRequest}
                              referredByRuknId={publicTrainingReferral}
                            />
                          ) : null}
                          {item.rawRequest &&
                          canDecide &&
                          isPublicTrainingRequest(item.rawRequest) ? (
                            <PublicTrainingApproveFields
                              request={item.rawRequest}
                              referredByRuknId={
                                referralByRequestId[item.rawRequest.id] ??
                                item.rawRequest.requestingRuknId ??
                                ''
                              }
                              onReferredByRuknIdChange={(value) =>
                                setReferralByRequestId((current) => ({
                                  ...current,
                                  [item.rawRequest!.id]: value,
                                }))
                              }
                              fatherHusbandName={familyByRequestId[item.rawRequest.id] ?? ''}
                              onFatherHusbandNameChange={(value) =>
                                setFamilyByRequestId((current) => ({
                                  ...current,
                                  [item.rawRequest!.id]: value,
                                }))
                              }
                              address={addressByRequestId[item.rawRequest.id] ?? ''}
                              onAddressChange={(value) =>
                                setAddressByRequestId((current) => ({
                                  ...current,
                                  [item.rawRequest!.id]: value,
                                }))
                              }
                              disabled={busy}
                            />
                          ) : null}
                        </div>
                        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold">
                          {item.statusLabel}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.href ? (
                          <Link to={item.href} className={INBOX_LINK_CLASS}>
                            {viewLabel}
                          </Link>
                        ) : null}
                        {whatsappHref ? (
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={INBOX_LINK_CLASS}
                          >
                            WhatsApp Rukn
                          </a>
                        ) : null}
                        {canMarkRead ? (
                          <SecondaryButton
                            type="button"
                            disabled={busy}
                            onClick={() => handleMarkRead(item)}
                          >
                            {actionLabel ?? 'Mark read'}
                          </SecondaryButton>
                        ) : null}
                        {canDecide ? (
                          <>
                            <PrimaryButton
                              type="button"
                              disabled={busy || approveBlockedForReferral}
                              onClick={() => handleApprove(item)}
                            >
                              {actionLabel ?? 'Approve'}
                            </PrimaryButton>
                            <SecondaryButton
                              type="button"
                              disabled={busy}
                              onClick={() => handleReject(item)}
                            >
                              {actionLabel ?? 'Reject'}
                            </SecondaryButton>
                          </>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </InboxAccordionSection>
          ))}
        </div>
      )}

      <section className="mt-8 border-t border-border pt-6" aria-labelledby="inbox-tarbiyati-heading">
        <h2 id="inbox-tarbiyati-heading" className="text-lg font-semibold text-text-heading" dir="rtl" lang="ur">
          تربیتی اجتماع
        </h2>
        <p className="mt-1 mb-4 text-sm text-secondary">
          Tarbiyati Ijtema registration and payment. Separate from the Inbox queue above.
        </p>
        <TrainingGatheringAdminPanel />
      </section>
    </PageShell>
  )
}
