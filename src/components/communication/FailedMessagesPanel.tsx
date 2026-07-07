import { CommunicationStatusBadge } from '@/components/communication/CommunicationStatusBadge'
import { formatHistoryTimestamp, getFailedCommunicationMessages } from '@/services/historyService'
import { useCommunication } from '@/hooks/useCommunication'

export function FailedMessagesPanel() {
  void useCommunication().version
  const failed = getFailedCommunicationMessages()

  if (failed.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface-muted p-6 text-center text-sm text-secondary">
        No failed messages. Retry handling arrives in Sprint 16.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {failed.map((record) => (
        <li
          key={record.id}
          className="rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-text-heading">{record.recipient.name}</p>
              <p className="text-sm text-secondary">{formatHistoryTimestamp(record.sentAt)}</p>
            </div>
            <CommunicationStatusBadge status={record.status} />
          </div>
          <p className="mt-2 text-sm text-secondary">{record.message}</p>
          {record.failureReason && (
            <p className="mt-2 text-sm text-red-700">{record.failureReason}</p>
          )}
          <p className="mt-2 text-xs text-secondary">
            Retries: {record.retryCount} · Retry queue — Sprint 16
          </p>
        </li>
      ))}
    </ul>
  )
}
