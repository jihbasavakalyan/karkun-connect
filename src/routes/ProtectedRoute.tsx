import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAuthorizedRedirect, getHomeRouteForRole } from '@/lib/auth/authorization'
import { ROUTES } from '@/constants/routes'
import { HomePageSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useRepositoryHydration } from '@/hooks/useRepositoryHydration'
import { logStartupTiming } from '@/lib/startupDiagnostics'
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

function HydrationLoadingScreen() {
  return (
    <div
      className="min-h-svh bg-surface-muted px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="Loading campaign data"
    >
      <div className="mx-auto max-w-5xl">
        <HomePageSkeleton />
      </div>
    </div>
  )
}

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const location = useLocation()
  const { user, isAuthenticated, isInitializing } = useAuth()
  const isHydrated = useRepositoryHydration()

  const canRenderDashboard =
    !isInitializing && isAuthenticated && !!user && user.role === allowedRole && isHydrated

  useEffect(() => {
    logStartupTiming('ProtectedRoute.gate', {
      route: location.pathname,
      allowedRole,
      isInitializing,
      isAuthenticated,
      isHydrated,
      role: user?.role ?? null,
      canRenderDashboard,
    })
  }, [
    allowedRole,
    canRenderDashboard,
    isAuthenticated,
    isHydrated,
    isInitializing,
    location.pathname,
    user?.role,
  ])

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

  if (!isHydrated) {
    return <HydrationLoadingScreen />
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
