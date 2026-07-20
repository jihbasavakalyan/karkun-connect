import { useCommunication } from '@/hooks/useCommunication'

export function ScheduledMessagesPanel() {
  const { scheduledMessages } = useCommunication()

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Scheduled messaging — Coming in next release. No messages can be scheduled yet.
      </p>

      <div className="mt-3">
        <button
          type="button"
          disabled
          title="Coming in next release"
          className="cursor-not-allowed rounded-lg border border-border bg-surface-muted px-4 py-2 text-sm font-medium text-secondary opacity-70"
        >
          Schedule message
        </button>
        <p className="mt-2 text-xs text-secondary">Coming in next release</p>
      </div>

      {scheduledMessages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-muted p-6 text-center text-sm text-secondary">
          No scheduled messages.
        </p>
      ) : (
        <ul className="space-y-2">
          {scheduledMessages.map((message) => (
            <li
              key={message.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-card"
            >
              <p className="font-medium text-text-heading">
                {message.recipients.length} recipients · {message.scheduledFor}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-secondary">{message.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
