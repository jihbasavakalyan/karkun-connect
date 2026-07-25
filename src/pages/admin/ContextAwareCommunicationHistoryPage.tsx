/**
 * KC-0119 — Context-Aware Communication History page.
 */

import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageHeader, PageShell } from '@/components/ui'
import { FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import {
  CONTEXT_TYPE_LABELS,
  filterContextAwareHistory,
  getContextAwareHistoryRecords,
  recipientTypeLabel,
  subscribeToContextAwareHistory,
  type CommunicationContextId,
  type ContextAwareDeliveryChannel,
  type ContextAwareHistoryRecord,
  type ContextAwareHistoryStatus,
  type ContextAwareRecipientType,
} from '@/lib/communication/contextAware'
import { formatHistoryTimestamp } from '@/services/historyService'

const filterClassName =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const CONTEXTS = Object.keys(CONTEXT_TYPE_LABELS) as CommunicationContextId[]

export function ContextAwareCommunicationHistoryPage() {
  const [recordsAll, setRecordsAll] = useState(() => getContextAwareHistoryRecords())
  const [date, setDate] = useState('')
  const [campaign, setCampaign] = useState('')
  const [recipientType, setRecipientType] = useState<ContextAwareRecipientType | ''>('')
  const [context, setContext] = useState<CommunicationContextId | ''>('')
  const [channel, setChannel] = useState<ContextAwareDeliveryChannel | ''>('')
  const [status, setStatus] = useState<ContextAwareHistoryStatus | ''>('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ContextAwareHistoryRecord | null>(null)
  const [copyNotice, setCopyNotice] = useState('')

  useEffect(
    () =>
      subscribeToContextAwareHistory(() => {
        setRecordsAll(getContextAwareHistoryRecords())
      }),
    [],
  )

  const records = useMemo(() => {
    return filterContextAwareHistory(recordsAll, {
      date: date || undefined,
      campaign: campaign || undefined,
      recipientType,
      context,
      channel,
      status,
      search,
    })
  }, [recordsAll, date, campaign, recipientType, context, channel, status, search])

  const handleCopy = async (record: ContextAwareHistoryRecord) => {
    try {
      await navigator.clipboard.writeText(record.finalMessage)
      setCopyNotice(`Copied message for ${record.id}`)
      window.setTimeout(() => setCopyNotice(''), 1500)
    } catch {
      setCopyNotice('Copy failed')
    }
  }

  return (
    <PageShell variant="wide">
      <PageHeader
        title="Communication History"
        description="Context-aware Send history with editorial status. Delivery receipts arrive in a later phase."
      />

      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-surface-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={filterClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
          Campaign
          <input
            type="search"
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            placeholder="Campaign name"
            className={filterClassName}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
          Recipient Type
          <select
            value={recipientType}
            onChange={(event) =>
              setRecipientType(event.target.value as ContextAwareRecipientType | '')
            }
            className={filterClassName}
          >
            <option value="">All</option>
            <option value="rukn">Rukn</option>
            <option value="karkun">Karkun</option>
            <option value="muttafiq">Muttafiq</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
          Context
          <select
            value={context}
            onChange={(event) => setContext(event.target.value as CommunicationContextId | '')}
            className={filterClassName}
          >
            <option value="">All</option>
            {CONTEXTS.map((id) => (
              <option key={id} value={id}>
                {CONTEXT_TYPE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
          Channel
          <select
            value={channel}
            onChange={(event) =>
              setChannel(event.target.value as ContextAwareDeliveryChannel | '')
            }
            className={filterClassName}
          >
            <option value="">All</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ContextAwareHistoryStatus | '')}
            className={filterClassName}
          >
            <option value="">All</option>
            <option value="Prepared">Prepared</option>
            <option value="Sent">Sent</option>
            <option value="Failed">Failed</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-secondary sm:col-span-2">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Recipient, message, sender…"
            className={filterClassName}
          />
        </label>
      </div>

      {copyNotice ? <p className="mb-3 text-sm text-primary">{copyNotice}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-secondary">
            <tr>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Context</th>
              <th className="px-3 py-2 font-semibold">Recipient</th>
              <th className="px-3 py-2 font-semibold">Channel</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Sent By</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-secondary">
                  No context-aware communications recorded yet. Use Notify → Send to create history.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="border-b border-border/70">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatHistoryTimestamp(record.timestamp)}
                  </td>
                  <td className="px-3 py-2">{record.contextLabel}</td>
                  <td className="px-3 py-2">
                    {record.recipientCount === 0
                      ? '—'
                      : record.recipientCount === 1
                        ? record.recipientNames[0]
                        : `${record.recipientCount} (${recipientTypeLabel(record.recipientType)})`}
                  </td>
                  <td className="px-3 py-2 capitalize">{record.channel}</td>
                  <td className="px-3 py-2">{record.status}</td>
                  <td className="px-3 py-2">{record.sentBy}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton
                        type="button"
                        size="sm"
                        onClick={() => setSelected(record)}
                      >
                        View
                      </SecondaryButton>
                      <SecondaryButton type="button" size="sm" onClick={() => void handleCopy(record)}>
                        Copy
                      </SecondaryButton>
                      <SecondaryButton type="button" size="sm" disabled title="Coming in a later phase">
                        Resend
                      </SecondaryButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={Boolean(selected)}
        title="Communication Detail"
        onClose={() => setSelected(null)}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setSelected(null)}>
              Close
            </SecondaryButton>
            {selected ? (
              <PrimaryButton type="button" onClick={() => void handleCopy(selected)}>
                Copy Message
              </PrimaryButton>
            ) : null}
          </div>
        }
      >
        {selected ? (
          <div className="space-y-3 text-sm" dir="auto">
            <DetailRow label="Context" value={selected.contextLabel} />
            <DetailRow label="Campaign" value={selected.campaign} />
            <DetailRow
              label="Recipients"
              value={
                selected.recipientNames.length > 0
                  ? selected.recipientNames.join(', ')
                  : `${selected.recipientCount} (${recipientTypeLabel(selected.recipientType)})`
              }
            />
            <DetailRow label="Channel" value={selected.channel} />
            <DetailRow label="Timestamp" value={formatHistoryTimestamp(selected.timestamp)} />
            <DetailRow label="Sender" value={selected.sentBy} />
            <DetailRow label="Status" value={selected.status} />
            <DetailRow label="Editorial Status" value={selected.editorialStatus} />
            <DetailRow label="Edited" value={selected.edited ? 'Yes' : 'No'} />
            <div>
              <p className={FORM_LABEL_CLASS}>Generated Message</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-surface-muted p-3 font-[inherit] text-sm" dir="rtl" lang="ur">
                {selected.generatedMessage}
              </pre>
            </div>
            <div>
              <p className={FORM_LABEL_CLASS}>Final Sent Message</p>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-surface-muted p-3 font-[inherit] text-sm" dir="rtl" lang="ur">
                {selected.finalMessage}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageShell>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={FORM_LABEL_CLASS}>{label}</p>
      <p className="mt-0.5 font-medium text-text-heading">{value}</p>
    </div>
  )
}
