import { Link, useNavigate } from 'react-router-dom'
import { getAuthDisplayLabel } from '@/lib/auth/roleResolver'
import { ROUTES } from '@/constants/routes'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/hooks/useAuth'

type PortalAuthActionsProps = {
  portalLabel: string
  /** Use on dark hero headers (Rukn). */
  tone?: 'default' | 'on-dark'
}

export function PortalAuthActions({ portalLabel, tone = 'default' }: PortalAuthActionsProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const settingsTo =
    user?.role === 'administrator' ? ROUTES.ADMIN_SETTINGS : ROUTES.RUKN_SETTINGS
  const onDark = tone === 'on-dark'

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        <p
          className={[
            'truncate text-xs font-medium',
            onDark ? 'text-white' : 'text-text-heading',
          ].join(' ')}
        >
          {user ? getAuthDisplayLabel(user) : ''}
        </p>
        <p className={['text-xs', onDark ? 'text-white/80' : 'text-secondary'].join(' ')}>
          {portalLabel}
        </p>
      </div>
      <Link
        to={settingsTo}
        className={[
          'inline-flex h-10 w-10 items-center justify-center rounded-lg border transition',
          onDark
            ? 'border-white/30 text-white hover:bg-white/10'
            : 'border-border text-secondary hover:bg-surface-muted hover:text-text-heading',
        ].join(' ')}
        aria-label="Settings"
        title="Settings"
      >
        <Icon name="settings" size="md" />
      </Link>
      <SecondaryButton
        type="button"
        className={[
          'min-h-10 shrink-0 px-3 py-2 text-sm',
          onDark ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : '',
        ].join(' ')}
        onClick={handleLogout}
      >
        Logout
      </SecondaryButton>
    </div>
  )
}
