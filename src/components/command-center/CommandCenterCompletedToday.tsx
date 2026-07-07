type CommandCenterCompletedTodayProps = {
  items: { id: string; label: string; time: string }[]
}

export function CommandCenterCompletedToday({ items }: CommandCenterCompletedTodayProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="cc-card-sm">
      <h2 className="enterprise-section-title">Completed Today</h2>
      <ul className="cc-list-md mt-1 space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded border border-green-200/60 bg-green-50/50 px-2 py-1"
          >
            <span className="line-clamp-1 text-xs font-medium text-text-heading">{item.label}</span>
            <span className="shrink-0 text-[10px] text-secondary">{item.time}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
