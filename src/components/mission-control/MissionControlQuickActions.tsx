/**
 * Mission Control quick actions — router navigation with explicit click handlers.
 */

import { useNavigate } from 'react-router-dom'
import type { MissionControlQuickAction } from '@/lib/missionControl/buildAdminMissionControl'

type MissionControlQuickActionsProps = {
  actions: MissionControlQuickAction[]
  className?: string
}

export function MissionControlQuickActions({
  actions,
  className = '',
}: MissionControlQuickActionsProps) {
  const navigate = useNavigate()

  return (
    <nav
      className={['mc-quick-actions', className].filter(Boolean).join(' ')}
      aria-label="Quick actions"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="mc-quick-action"
          disabled={!action.route}
          onClick={() => {
            if (!action.route) return
            navigate(action.route)
          }}
        >
          {action.label}
        </button>
      ))}
    </nav>
  )
}

type MissionControlActionButtonProps = {
  label: string
  route: string
  className?: string
}

export function MissionControlActionButton({
  label,
  route,
  className = '',
}: MissionControlActionButtonProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className={['mc-quick-action', className].filter(Boolean).join(' ')}
      disabled={!route}
      onClick={() => {
        if (!route) return
        navigate(route)
      }}
    >
      {label}
    </button>
  )
}
