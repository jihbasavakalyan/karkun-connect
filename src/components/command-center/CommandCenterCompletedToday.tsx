type CommandCenterCompletedTodayProps = {
  items: { id: string; label: string; time: string }[]
}

export function CommandCenterCompletedToday({ items }: CommandCenterCompletedTodayProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Completed Today</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3"
          >
            <span className="text-sm font-medium text-text-heading">{item.label}</span>
            <span className="shrink-0 text-xs text-secondary">{item.time}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
