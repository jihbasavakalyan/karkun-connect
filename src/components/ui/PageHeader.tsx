import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="ds-page-header">
      <div className="ds-page-header-text">
        <h1 className="ds-page-title">{title}</h1>
        {description && <p className="ds-page-description">{description}</p>}
      </div>
      {actions && <div className="ds-page-header-actions">{actions}</div>}
    </header>
  )
}
