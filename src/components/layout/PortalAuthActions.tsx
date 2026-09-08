import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAuthDisplayLabel } from '@/lib/auth/roleResolver'
import { ROUTES } from '@/constants/routes'
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
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const settingsTo =
    user?.role === 'administrator' ? ROUTES.ADMIN_SETTINGS : ROUTES.RUKN_SETTINGS
  const profileTo = `${settingsTo}?section=profile`
  const helpTo = user?.role === 'administrator' ? ROUTES.ADMIN_HELP : null
  const onDark = tone === 'on-dark'

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="relative flex min-w-0 items-center gap-2 sm:gap-3" ref={rootRef}>
      <div className="hidden min-w-0 text-right sm:block">
        <p
          className={[
            'truncate text-xs font-medium',
            onDark ? 'text-kc-shell-text' : 'text-kc-shell-ink',
          ].join(' ')}
        >
          {user ? getAuthDisplayLabel(user) : ''}
        </p>
        <p className={['text-xs', onDark ? 'text-kc-shell-text-muted' : 'text-secondary'].join(' ')}>
          {portalLabel}
        </p>
      </div>
      <button
        type="button"
        className={[
          'inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-2 transition',
          onDark
            ? 'border-kc-shell-text/30 text-kc-shell-text hover:bg-white/10'
            : 'border-border text-kc-shell-ink hover:bg-kc-canvas',
        ].join(' ')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="user" size="md" />
        <span className="hidden text-sm font-semibold sm:inline">Account</span>
      </button>
      {open ? (
        <div id={menuId} className="kc-shell-account-menu" role="menu" aria-label="Account">
          <Link
            role="menuitem"
            to={profileTo}
            className="kc-shell-account-item"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <Link
            role="menuitem"
            to={settingsTo}
            className="kc-shell-account-item"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          {helpTo ? (
            <Link
              role="menuitem"
              to={helpTo}
              className="kc-shell-account-item"
              onClick={() => setOpen(false)}
            >
              Help
            </Link>
          ) : null}
          <button type="button" role="menuitem" className="kc-shell-account-item" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}
