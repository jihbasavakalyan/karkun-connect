import type { ReactNode } from 'react'
import type { IconName } from '@/design-system/iconNames'
import { Icon } from './Icon'

export type StatusBadgeVariant =
  | 'healthy'
  | 'attention'
  | 'urgent'
  | 'dormant'
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'pending'
  | 'connected'

const VARIANT_CLASS: Record<StatusBadgeVariant, string> = {
  healthy: 'ds-badge-healthy',
  attention: 'ds-badge-attention',
  urgent: 'ds-badge-urgent',
  dormant: 'ds-badge-dormant',
  neutral: 'ds-badge-neutral',
  info: 'ds-badge-info',
  success: 'ds-badge-success',
  warning: 'ds-badge-warning',
  pending: 'ds-badge-pending',
  connected: 'ds-badge-connected',
}

type StatusBadgeProps = {
  children: ReactNode
  variant?: StatusBadgeVariant
  icon?: IconName
  className?: string
}

export function StatusBadge({
  children,
  variant = 'neutral',
  icon,
  className = '',
}: StatusBadgeProps) {
  return (
    <span className={`ds-badge ${VARIANT_CLASS[variant]} ${className}`.trim()}>
      {icon && (
        <span className="ds-badge-icon" aria-hidden="true">
          <Icon name={icon} size="sm" />
        </span>
      )}
      {children}
    </span>
  )
}
