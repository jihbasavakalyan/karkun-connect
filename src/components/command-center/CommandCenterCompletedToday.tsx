type CommandCenterCompletedTodayProps = {
  items: { id: string; label: string; time: string }[]
}

export function CommandCenterCompletedToday({ items }: CommandCenterCompletedTodayProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="enterprise-card p-6">
      <h2 className="enterprise-section-title">Completed Today</h2>
      <p className="enterprise-section-subtitle">Your accomplishments for today</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-green-200/60 bg-green-50/50 px-4 py-3"
          >
            <span className="text-sm font-medium text-text-heading">{item.label}</span>
            <span className="shrink-0 text-xs text-secondary">{item.time}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
