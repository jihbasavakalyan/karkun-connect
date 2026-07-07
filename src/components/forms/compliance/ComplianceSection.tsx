import type { ReactNode } from 'react'

type ComplianceSectionProps = {
  children: ReactNode
}

export function ComplianceSection({ children }: ComplianceSectionProps) {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Compliance</h2>
      <p className="mt-1 text-sm text-secondary">
        Monthly responsibilities and portal compliance for this Karkun.
      </p>
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  )
}
