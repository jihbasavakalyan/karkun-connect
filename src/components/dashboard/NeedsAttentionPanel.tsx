import type { NeedsAttentionSummary } from '@/constants/mockMissions'

type NeedsAttentionPanelProps = {
  items: NeedsAttentionSummary
}

const attentionItems = [
  { key: 'pendingVisits' as const, label: 'Pending Visits' },
  { key: 'pendingReports' as const, label: 'Pending Reports' },
  { key: 'pendingJihRegistrations' as const, label: 'Not Registered (JIH Web Portal)' },
]

export function NeedsAttentionPanel({ items }: NeedsAttentionPanelProps) {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Needs Attention</h2>

      <ul className="mt-4 space-y-3">
        {attentionItems.map((item) => (
          <li
            key={item.key}
            className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-4 py-3"
          >
            <span className="text-sm font-medium text-text-heading">{item.label}</span>
            <span className="text-lg font-semibold text-primary">{items[item.key]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
