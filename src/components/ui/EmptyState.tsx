import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { IconName } from '@/design-system/iconNames'
import { Icon } from './Icon'
import { PrimaryButton } from './PrimaryButton'
import { SecondaryButton } from './SecondaryButton'

type EmptyStateProps = {
  icon?: IconName
  title: string
  description: string
  primaryAction?: { label: string; onClick?: () => void; href?: string }
  secondaryAction?: { label: string; onClick?: () => void; href?: string }
  children?: ReactNode
}

export function EmptyState({
  icon = 'sparkles',
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="ds-empty native-empty" role="status">
      <div className="ds-empty-icon" aria-hidden="true">
        <Icon name={icon} size="xl" className="text-primary" />
      </div>
      <h3 className="ds-empty-title">{title}</h3>
      <p className="ds-empty-description">{description}</p>
      {children}
      {(primaryAction || secondaryAction) && (
        <div className="ds-empty-actions">
          {primaryAction &&
            (primaryAction.href ? (
              <Link to={primaryAction.href}>
                <PrimaryButton type="button">{primaryAction.label}</PrimaryButton>
              </Link>
            ) : (
              <PrimaryButton type="button" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </PrimaryButton>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Link to={secondaryAction.href}>
                <SecondaryButton type="button">{secondaryAction.label}</SecondaryButton>
              </Link>
            ) : (
              <SecondaryButton type="button" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </SecondaryButton>
            ))}
        </div>
      )}
    </div>
  )
}
