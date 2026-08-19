export const PUBLIC_REGISTRATION_HOST = 'registration.jihbasavakalyan.org'

export function isPublicRegistrationHost(hostname?: string): boolean {
  const host = (hostname ?? (typeof window === 'undefined' ? '' : window.location.hostname))
    .trim()
    .toLowerCase()
  return host === PUBLIC_REGISTRATION_HOST
}

/**
 * Dedicated public registration entry:
 * - registration.jihbasavakalyan.org (any path)
 * - /register on the main origin (pre-DNS testing; no Admin/Rukn chrome)
 */
export function shouldMountPublicRegistrationApp(): boolean {
  if (typeof window === 'undefined') return false
  if (isPublicRegistrationHost(window.location.hostname)) return true
  const path = window.location.pathname
  return path === '/register' || path.startsWith('/register/')
}
