import type { ReactNode } from 'react'

type PageShellProps = {
  children: ReactNode
  variant?: 'default' | 'narrow' | 'wide'
  className?: string
}

export function PageShell({ children, variant = 'default', className = '' }: PageShellProps) {
  const variantClass =
    variant === 'narrow' ? 'ds-page-narrow' : variant === 'wide' ? 'ds-page-wide' : ''

  return (
    <div className={`ds-page campaign-fade-in ${variantClass} ${className}`.trim()}>
      {children}
    </div>
  )
}
