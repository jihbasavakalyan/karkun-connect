import type { ReactNode } from 'react'

type HomeSectionProps = {
  title: string
  subtitle?: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
  id?: string
}

export function HomeSection({
  title,
  subtitle,
  children,
  variant = 'primary',
  id,
}: HomeSectionProps) {
  return (
    <section
      id={id}
      className={
        variant === 'primary'
          ? 'home-section-primary'
          : 'home-section-secondary'
      }
    >
      <header className="home-section-header">
        <h2 className="home-section-title">{title}</h2>
        {subtitle && <p className="home-section-subtitle">{subtitle}</p>}
      </header>
      <div className="home-section-body">{children}</div>
    </section>
  )
}
