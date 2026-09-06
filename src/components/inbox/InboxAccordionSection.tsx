import type { ReactNode } from 'react'

type InboxAccordionSectionProps = {
  title: string
  count: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}

/** Compact collapsible section for Admin Inbox. Does not change item data or actions. */
export function InboxAccordionSection({
  title,
  count,
  open,
  onToggle,
  children,
}: InboxAccordionSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface shadow-card">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="min-w-0 text-sm font-semibold text-text-heading sm:text-base">
          {title}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums text-text-heading">
            {count}
          </span>
          <span className="text-xs text-secondary" aria-hidden="true">
            {open ? '▼' : '▶'}
          </span>
        </span>
      </button>
      {open ? <div className="border-t border-border px-3 py-3 sm:px-4">{children}</div> : null}
    </section>
  )
}
