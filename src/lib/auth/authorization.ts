import { ROUTES } from '@/constants/routes'
import type { UserRole } from '@/types/auth.types'

export function getHomeRouteForRole(role: UserRole): '/admin' | '/rukn' {
  return role === 'administrator' ? '/admin' : '/rukn'
}

export function isPathAllowedForRole(pathname: string, role: UserRole): boolean {
  if (role === 'administrator') {
    return pathname.startsWith(ROUTES.ADMIN)
  }

  return pathname.startsWith(ROUTES.RUKN)
}

export function getAuthorizedRedirect(pathname: string, role: UserRole): string {
  if (isPathAllowedForRole(pathname, role)) {
    return pathname
  }
  return getHomeRouteForRole(role)
}
