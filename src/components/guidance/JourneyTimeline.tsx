import type { JourneyTimelineEvent } from '@/types/guidance'

type JourneyTimelineProps = {
  events: JourneyTimelineEvent[]
}

export function JourneyTimeline({ events }: JourneyTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-secondary">
        Your journey timeline will appear as you connect and meet.
      </p>
    )
  }

  const chronological = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

  return (
    <ol className="relative space-y-0 border-l-2 border-border pl-6">
      {chronological.map((event, index) => (
        <li key={event.id} className="relative pb-6 last:pb-0">
          <span
            className="absolute -left-[1.65rem] top-1 flex h-3 w-3 rounded-full bg-primary"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-text-heading">{event.title}</p>
          {event.description && (
            <p className="mt-0.5 text-sm text-secondary">{event.description}</p>
          )}
          <p className="mt-1 text-xs text-secondary">
            {new Date(event.occurredAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          {index < chronological.length - 1 && (
            <span className="sr-only">then</span>
          )}
        </li>
      ))}
    </ol>
  )
}
