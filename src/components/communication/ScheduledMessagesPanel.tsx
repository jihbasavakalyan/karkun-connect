import { useCommunication } from '@/hooks/useCommunication'

export function ScheduledMessagesPanel() {
  const { scheduledMessages } = useCommunication()

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Scheduled messaging is architected for Sprint 17. No messages can be scheduled in Sprint 15.
      </p>

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
