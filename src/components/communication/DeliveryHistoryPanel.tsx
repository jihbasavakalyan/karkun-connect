import { useMemo, useState } from 'react'
import { CommunicationStatusBadge } from '@/components/communication/CommunicationStatusBadge'
import {
  AUDIENCE_FILTER_OPTIONS,
  HISTORY_STATUS_FILTER_OPTIONS,
  filterHistoryByAudience,
  filterHistoryByDate,
  filterHistoryByStatus,
  type CommunicationAudience,
} from '@/lib/communication/audiencePresentation'
import { formatHistoryTimestamp } from '@/services/historyService'
import { useCommunication } from '@/hooks/useCommunication'
import type { MessageDeliveryStatus } from '@/types/communication'

const filterClassName =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/**
 * KC-0077 — Delivery history with Rukn / Karkun tabs and quick filters.
 * Reuses existing history records — no new queries.
 */
export function DeliveryHistoryPanel() {
  const { history } = useCommunication()
  const [audienceTab, setAudienceTab] = useState<CommunicationAudience | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<MessageDeliveryStatus | ''>('')
  const [dateFilter, setDateFilter] = useState('')

  const filtered = useMemo(() => {
    let records = filterHistoryByAudience(history, audienceTab)
    records = filterHistoryByStatus(records, statusFilter)
    records = filterHistoryByDate(records, dateFilter)
    return records
  }, [history, audienceTab, statusFilter, dateFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="History audience">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'rukn', label: 'Rukn History' },
            { id: 'karkun', label: 'Karkun History' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={audienceTab === tab.id}
            onClick={() => setAudienceTab(tab.id)}
            className={[
              'min-h-9 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              audienceTab === tab.id
                ? 'bg-primary-muted text-primary'
                : 'bg-surface text-secondary hover:bg-surface-muted hover:text-text-heading',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-muted/40 p-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="history-audience" className="text-xs font-medium text-secondary">
            Audience
          </label>
          <select
            id="history-audience"
            value={audienceTab}
            onChange={(event) =>
              setAudienceTab(event.target.value as CommunicationAudience | 'all')
            }
            className={filterClassName}
          >
            {AUDIENCE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="history-status" className="text-xs font-medium text-secondary">
            Status
          </label>
          <select
            id="history-status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as MessageDeliveryStatus | '')
            }
            className={filterClassName}
          >
            {HISTORY_STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="history-date" className="text-xs font-medium text-secondary">
            Date
          </label>
          <input
            id="history-date"
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className={filterClassName}
          />
        </div>
        {(statusFilter || dateFilter || audienceTab !== 'all') && (
          <button
            type="button"
            className="min-h-9 text-sm font-medium text-primary hover:underline"
            onClick={() => {
              setAudienceTab('all')
              setStatusFilter('')
              setDateFilter('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface-muted p-6 text-center text-sm text-secondary">
          No messages in delivery history for this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-(--radius-card) border border-border bg-surface shadow-card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted">
              <tr>
                <th className="px-4 py-3 font-semibold text-text-heading">Recipient</th>
                <th className="px-4 py-3 font-semibold text-text-heading">Audience</th>
                <th className="px-4 py-3 font-semibold text-text-heading">Date / Time</th>
                <th className="px-4 py-3 font-semibold text-text-heading">Template</th>
                <th className="px-4 py-3 font-semibold text-text-heading">Status</th>
                <th className="px-4 py-3 font-semibold text-text-heading">Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-heading">{record.recipient.name}</p>
                    <p className="text-xs text-secondary">{record.recipient.mobile}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-secondary">
                    {record.recipient.personKind}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {formatHistoryTimestamp(record.sentAt)}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {record.templateName ?? record.templateId ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <CommunicationStatusBadge status={record.status} />
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-secondary">{record.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
