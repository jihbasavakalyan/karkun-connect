import type { ReactNode } from 'react'
import { COS_PLACEHOLDER_NOTE } from '@/lib/communication/cosMockData'

type CosPlaceholderPanelProps = {
  title: string
  description: string
  children?: ReactNode
}

/** Shared empty/foundation shell for COS sections without backend work. */
export function CosPlaceholderPanel({ title, description, children }: CosPlaceholderPanelProps) {
  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
      aria-labelledby={`cos-panel-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <h2
        id={`cos-panel-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className="text-lg font-semibold text-text-heading"
      >
        {title}
      </h2>
      <p className="mt-2 text-sm text-secondary">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
      <p className="mt-4 rounded-lg bg-surface-muted px-3 py-2 text-xs text-secondary">
        {COS_PLACEHOLDER_NOTE}
      </p>
    </section>
  )
}
