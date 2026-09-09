import { useCommunication } from '@/hooks/useCommunication'

export function ScheduledMessagesPanel() {
  const { scheduledMessages } = useCommunication()
  const active = scheduledMessages.filter((message) => message.status === 'scheduled')

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-secondary">
        Scheduled records are saved with Communication history. They are not sent automatically at
        the chosen time. Use Call or WhatsApp when you are ready to contact someone.
      </p>

      {active.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-muted p-6 text-center text-sm text-secondary">
          No scheduled records yet. Schedule from the WhatsApp composer saves a reminder here; it
          does not dispatch a message.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((message) => (
            <li
              key={message.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-card"
            >
              <p className="font-medium text-text-heading">
                {message.recipients.length} recipient
                {message.recipients.length === 1 ? '' : 's'} · {message.scheduledFor}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-secondary">{message.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
