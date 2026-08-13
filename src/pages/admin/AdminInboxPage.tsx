/**
 * KC-0123 / BATCH-06A — Admin Inbox (people intake + Rukn → Admin internal messages).
 * WhatsApp history is not shown here. No chat/thread.
 * KC-028B — unified write lifecycle for approve / reject / mark read.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/ui'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { useAuth } from '@/hooks/useAuth'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import {
  buildUnifiedInbox,
  countUnreadInboxItems,
  type InboxFolder,
  type InboxItem,
  type InboxItemKind,
} from '@/lib/peopleLifecycle'
import { classifyWriteError } from '@/lib/reliability/writeLifecycle'
import {
  approvePeopleIntakeRequest,
  rejectNewKarkunRequest,
  subscribeToKarkunRequestStore,
} from '@/services/karkunRequestService'
import { markRuknAdminMessageRead } from '@/services/ruknAdminMessageService'
import { subscribeToRuknAdminMessageStore } from '@/stores/ruknAdminMessageStore'
import { getPeopleRequestKind } from '@/types/karkunRequest.types'
import { getRuknById } from '@/data/ruknMaster'
import { buildWhatsAppLink } from '@/utils/personContactLinks'

const FOLDERS: { id: InboxFolder | 'all'; label: string }[] = [
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
  { id: 'rukn_message', label: 'Rukn messages' },
]

export function AdminInboxPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [tick, setTick] = useState(0)
  const [folder, setFolder] = useState<InboxFolder | 'all'>(
    () => (searchParams.get('folder') as InboxFolder | null) ?? 'pending',
  )
  const [kind, setKind] = useState<InboxItemKind | 'all'>('all')
  const [queryDraft, setQueryDraft] = useState<string | null>(null)
  const query = queryDraft ?? (searchParams.get('query') ?? '')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const { busy, busyKey, progressMessage, run } = useWriteLifecycle()

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
    return buildUnifiedInbox({ folder, kind, query })
  }, [folder, kind, query, tick])

  const unread = useMemo(() => {
    void tick
    return countUnreadInboxItems()
  }, [tick])

  const decidedBy = user?.displayName ?? user?.uid ?? 'Administrator'

  const refreshAfterDecision = () => {
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
      work: async () => {
        const result = await approvePeopleIntakeRequest({
          requestId: request.id,
          decidedBy,
        })
        if (!result.ok) {
          throw Object.assign(new Error(result.error), {
            code: result.code ?? 'unknown',
          })
        }
        return result
      },
      refreshCounters: refreshAfterDecision,
      refreshUi: refreshAfterDecision,
    }).then((lifecycle) => {
      if (!lifecycle) return
      if (!lifecycle.ok) {
        setError(lifecycle.message)
        refreshAfterDecision()
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
      if (!lifecycle.ok) {
        const classified = classifyWriteError(lifecycle.error ?? lifecycle.message)
        setError(classified.message)
        refreshAfterDecision()
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

  return (
    <PageShell>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-heading">Inbox</h1>
          <p className="mt-1 text-sm text-secondary">
            People intake and one-way Rukn messages. Reply to a Rukn on WhatsApp — this is not a
            chat.
          </p>
        </div>
        {unread > 0 ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {unread} unread
          </span>
        ) : null}
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {FOLDERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={[
              'rounded-full border px-3 py-1.5 text-sm font-semibold',
              folder === entry.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-text-heading',
            ].join(' ')}
            onClick={() => setFolder(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Search</span>
          <input
            className={FORM_INPUT_CLASS}
            value={query}
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

      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-secondary">
          No items in this folder.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const itemBusy =
              busyKey === `inbox:approve:${item.rawRequest?.id ?? ''}` ||
              busyKey === `inbox:reject:${item.rawRequest?.id ?? ''}` ||
              busyKey === `inbox:read:${item.rawInternalMessage?.id ?? ''}`
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
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-card"
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
                      </p>
                    ) : null}
                    {item.rawInternalMessage ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-text-heading">
                        {item.rawInternalMessage.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-secondary">
                      {new Date(item.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold">
                    {item.statusLabel}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.href ? (
                    <Link to={item.href} className="text-sm font-semibold text-primary underline">
                      View
                    </Link>
                  ) : null}
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary underline"
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
                      {itemBusy ? progressMessage || '…' : 'Mark read'}
                    </SecondaryButton>
                  ) : null}
                  {canDecide ? (
                    <>
                      <PrimaryButton
                        type="button"
                        disabled={busy}
                        onClick={() => handleApprove(item)}
                      >
                        {itemBusy ? progressMessage || '…' : 'Approve'}
                      </PrimaryButton>
                      <SecondaryButton
                        type="button"
                        disabled={busy}
                        onClick={() => handleReject(item)}
                      >
                        {itemBusy ? progressMessage || '…' : 'Reject'}
                      </SecondaryButton>
                    </>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
