/**
 * KC-0123 — Admin Unified Inbox (people intake + Rukn communications).
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/ui'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { useAuth } from '@/hooks/useAuth'
import {
  buildUnifiedInbox,
  countUnreadInboxItems,
  type InboxFolder,
  type InboxItem,
  type InboxItemKind,
} from '@/lib/peopleLifecycle'
import {
  approvePeopleIntakeRequest,
  rejectNewKarkunRequest,
  subscribeToKarkunRequestStore,
} from '@/services/karkunRequestService'
import { getPeopleRequestKind } from '@/types/karkunRequest.types'

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
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => subscribeToKarkunRequestStore(() => setTick((v) => v + 1)), [])

  const items = useMemo(() => {
    void tick
    return buildUnifiedInbox({ folder, kind, query })
  }, [folder, kind, query, tick])

  const unread = useMemo(() => {
    void tick
    return countUnreadInboxItems()
  }, [tick])

  const decidedBy = user?.displayName ?? user?.uid ?? 'Administrator'

  const handleApprove = (item: InboxItem) => {
    const request = item.rawRequest
    if (!request) return
    setBusyId(item.id)
    setError('')
    setNotice('')
    void (async () => {
      try {
        const result = await approvePeopleIntakeRequest({
          requestId: request.id,
          decidedBy,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setNotice(`Approved ${request.fullName}.`)
        setTick((v) => v + 1)
      } finally {
        setBusyId(null)
      }
    })()
  }

  const handleReject = (item: InboxItem) => {
    const request = item.rawRequest
    if (!request) return
    const result = rejectNewKarkunRequest({ requestId: request.id, decidedBy })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNotice(`Rejected ${request.fullName}.`)
    setTick((v) => v + 1)
  }

  return (
    <PageShell>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-heading">Inbox</h1>
          <p className="mt-1 text-sm text-secondary">
            Unified intake for people requests and Rukn communications.
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

      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-secondary">
          No items in this folder.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const busy = busyId === item.id
            const canDecide = Boolean(item.rawRequest && item.folder === 'pending')
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
                    {item.rawMessage ? (
                      <p className="mt-2 line-clamp-2 text-sm text-text-heading">
                        {item.rawMessage.message}
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
                  {canDecide ? (
                    <>
                      <PrimaryButton
                        type="button"
                        disabled={busy}
                        onClick={() => handleApprove(item)}
                      >
                        {busy ? 'Approving…' : 'Approve'}
                      </PrimaryButton>
                      <SecondaryButton
                        type="button"
                        disabled={busy}
                        onClick={() => handleReject(item)}
                      >
                        Reject
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
