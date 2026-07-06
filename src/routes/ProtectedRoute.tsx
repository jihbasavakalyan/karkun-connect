import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getHomeRouteForRole } from '@/constants/mockAuth'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/auth.types'

type ProtectedRouteProps = {
  allowedRole: UserRole
  children: ReactNode
}

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user.role !== allowedRole) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />
  }

  return children
}

type GuestRouteProps = {
  children: ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { user, isAuthenticated } = useAuth()

  if (isAuthenticated && user) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />
  }

  return children
}
