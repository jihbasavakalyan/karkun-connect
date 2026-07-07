import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'

type PortalAuthActionsProps = {
  portalLabel: string
}

export function PortalAuthActions({ portalLabel }: PortalAuthActionsProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-xs font-medium text-text-heading">{user?.email}</p>
        <p className="text-xs text-secondary">{portalLabel}</p>
      </div>
      <SecondaryButton type="button" className="min-h-10 shrink-0 px-3 py-2 text-sm" onClick={handleLogout}>
        Logout
      </SecondaryButton>
    </div>
  )
}
