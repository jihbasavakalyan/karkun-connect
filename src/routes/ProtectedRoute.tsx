import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAuthorizedRedirect, getHomeRouteForRole } from '@/lib/auth/authorization'
import { ROUTES } from '@/constants/routes'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useRepositoryHydration } from '@/hooks/useRepositoryHydration'
import { logStartupTiming } from '@/lib/startupDiagnostics'
import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'
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

/**
 * KC-0052 — Progressive shell: after auth, render layout/nav/hero immediately.
 * Full-page HomePageSkeleton no longer blocks the entire app on repository hydrate.
 * Pages/sections that need data continue to use useRepositoryHydration / useBackgroundHydration.
 */
export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const location = useLocation()
  const { user, isAuthenticated, isInitializing } = useAuth()
  const isHydrated = useRepositoryHydration()

  const canRenderShell =
    !isInitializing && isAuthenticated && !!user && user.role === allowedRole
  const canRenderDashboard = canRenderShell && isHydrated

  useEffect(() => {
    logStartupTiming('ProtectedRoute.gate', {
      route: location.pathname,
      allowedRole,
      isInitializing,
      isAuthenticated,
      isHydrated,
      role: user?.role ?? null,
      canRenderShell,
      canRenderDashboard,
    })
    markStartupLifecycle('ProtectedRoute.gate', {
      route: location.pathname,
      canRenderShell,
      canRenderDashboard,
      isHydrated,
      isInitializing,
    })
    if (canRenderShell) {
      markStartupLifecycle('ProtectedRoute.shellVisible', {
        route: location.pathname,
        role: user?.role ?? null,
        isHydrated,
      })
    }
    if (canRenderDashboard) {
      markStartupLifecycle('ProtectedRoute.canRender', {
        route: location.pathname,
        role: user?.role ?? null,
      })
      markStartupLifecycle('dashboard.firstInteractive', {
        route: location.pathname,
        role: user?.role ?? null,
      })
    }
  }, [
    allowedRole,
    canRenderDashboard,
    canRenderShell,
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

  return (
    <div aria-busy={!isHydrated} data-hydration={isHydrated ? 'ready' : 'pending'}>
      {children}
    </div>
  )
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
