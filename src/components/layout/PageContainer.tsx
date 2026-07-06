import type { ReactNode } from 'react'

type PageContainerProps = {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`min-h-svh bg-surface ${className}`}>{children}</div>
  )
}
