import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import type { IconName } from '@/design-system/iconNames'
import type { NextRecommendedAction } from '@/types/campaignAutomation.types'
import { Icon } from '@/components/ui/Icon'

type RuknFloatingActionButtonProps = {
  nextAction: NextRecommendedAction
  primaryCallHref?: string
  primaryWhatsAppHref?: string
}

type FabAction = {
  id: string
  label: string
  icon: IconName
  href?: string
  to?: string
  external?: boolean
}

export function RuknFloatingActionButton({
  nextAction,
  primaryCallHref,
  primaryWhatsAppHref,
}: RuknFloatingActionButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const actions: FabAction[] = [
    { id: 'connect', label: 'Connect Karkun', icon: 'link', to: ROUTES.RUKN_AVAILABLE_KARKUN },
    {
      id: 'visit',
      label: 'Record Visit',
      icon: 'clipboard',
      to: !nextAction.isCaughtUp ? nextAction.route : ROUTES.RUKN_MY_KARKUN,
    },
    primaryCallHref ? { id: 'call', label: 'Call', icon: 'phone', href: primaryCallHref } : null,
    primaryWhatsAppHref
      ? { id: 'whatsapp', label: 'WhatsApp', icon: 'message', href: primaryWhatsAppHref, external: true }
      : null,
    { id: 'schedule', label: 'Schedule', icon: 'calendar', href: '#todays-schedule' },
  ].filter(Boolean) as FabAction[]

  return (
    <div ref={rootRef} className="rukn-fab-root">
      {open && (
        <div className="rukn-fab-menu" role="menu" aria-label="Quick actions">
          {actions.map((action, index) => {
            const style = { animationDelay: `${index * 40}ms` }
            const className = 'rukn-fab-menu-item'

            if (action.to) {
              return (
                <Link
                  key={action.id}
                  to={action.to}
                  role="menuitem"
                  className={className}
                  style={style}
                  onClick={() => setOpen(false)}
                >
                  <Icon name={action.icon} size="sm" />
                  {action.label}
                </Link>
              )
            }

            return (
              <a
                key={action.id}
                href={action.href}
                role="menuitem"
                className={className}
                style={style}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noopener noreferrer' : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon name={action.icon} size="sm" />
                {action.label}
              </a>
            )
          })}
        </div>
      )}

      <button
        type="button"
        className={`rukn-fab-trigger ${open ? 'rukn-fab-trigger-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="rukn-fab-icon" aria-hidden="true">
          {open ? <Icon name="x" size="lg" /> : <Icon name="plus" size="lg" />}
        </span>
      </button>
    </div>
  )
}
