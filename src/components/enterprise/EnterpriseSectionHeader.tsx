import type { ReactNode } from 'react'

type EnterpriseSectionHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  id?: string
}

export function EnterpriseSectionHeader({
  title,
  subtitle,
  action,
  id,
}: EnterpriseSectionHeaderProps) {
  return (
    <div id={id} className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="enterprise-section-title">{title}</h2>
        {subtitle && <p className="enterprise-section-subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
