import { CommunicationStatusBadge } from '@/components/communication/CommunicationStatusBadge'
import { formatHistoryTimestamp } from '@/services/historyService'
import { useCommunication } from '@/hooks/useCommunication'

export function DeliveryHistoryPanel() {
  const { history } = useCommunication()

  if (history.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface-muted p-6 text-center text-sm text-secondary">
        No messages in delivery history yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-(--radius-card) border border-border bg-surface shadow-card">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-muted">
          <tr>
            <th className="px-4 py-3 font-semibold text-text-heading">Recipient</th>
            <th className="px-4 py-3 font-semibold text-text-heading">Date / Time</th>
            <th className="px-4 py-3 font-semibold text-text-heading">Template</th>
            <th className="px-4 py-3 font-semibold text-text-heading">Status</th>
            <th className="px-4 py-3 font-semibold text-text-heading">Message</th>
          </tr>
        </thead>
        <tbody>
          {history.map((record) => (
            <tr key={record.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3">
                <p className="font-medium text-text-heading">{record.recipient.name}</p>
                <p className="text-xs text-secondary">{record.recipient.mobile}</p>
              </td>
              <td className="px-4 py-3 text-secondary">{formatHistoryTimestamp(record.sentAt)}</td>
              <td className="px-4 py-3 text-secondary">{record.templateName ?? record.templateId ?? '—'}</td>
              <td className="px-4 py-3">
                <CommunicationStatusBadge status={record.status} />
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-secondary">{record.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
