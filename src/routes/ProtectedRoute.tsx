import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAuthorizedRedirect, getHomeRouteForRole } from '@/lib/auth/authorization'
import { ROUTES } from '@/constants/routes'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/auth.types'

type ProtectedRouteProps = {
  allowedRole: UserRole
  children: ReactNode
}

function AuthLoadingScreen() {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-4 bg-surface-muted px-6"
      aria-busy="true"
      aria-label="Restoring session"
    >
      <Skeleton className="h-10 w-48 rounded-lg" />
      <Skeleton className="h-4 w-64 rounded-lg" />
    </div>
  )
}

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const location = useLocation()
  const { user, isAuthenticated, isInitializing } = useAuth()

  if (isInitializing) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (user.role !== allowedRole) {
    const redirect = getAuthorizedRedirect(location.pathname, user.role)
    return <Navigate to={redirect} replace />
  }

  return children
}

type GuestRouteProps = {
  children: ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { user, isAuthenticated, isInitializing } = useAuth()

  if (isInitializing) {
    return <AuthLoadingScreen />
  }

  if (isAuthenticated && user) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />
  }

  return children
}
