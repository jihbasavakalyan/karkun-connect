type EnterpriseBadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

import type { ReactNode } from 'react'

type EnterpriseBadgeProps = {
  children: ReactNode
  variant?: EnterpriseBadgeVariant
}

const VARIANT_STYLES: Record<EnterpriseBadgeVariant, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  neutral: 'border-border bg-surface-muted text-secondary',
}

export function EnterpriseBadge({ children, variant = 'neutral' }: EnterpriseBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        VARIANT_STYLES[variant],
      ].join(' ')}
    >
      {children}
    </span>
  )
}
