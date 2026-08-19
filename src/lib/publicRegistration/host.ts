export const PUBLIC_REGISTRATION_HOST = 'registration.jihbasavakalyan.org'

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '').split(':')[0] ?? ''
}

export function isPublicRegistrationHost(hostname?: string): boolean {
  const host = normalizeHostname(
    hostname ?? (typeof window === 'undefined' ? '' : window.location.hostname),
  )
  return host === PUBLIC_REGISTRATION_HOST
}

/**
 * Public registration entry:
 * - registration.jihbasavakalyan.org at `/` (any path on that host)
 * - `/register` on other hosts (internal fallback; not required on the public subdomain)
 */
export function shouldMountPublicRegistrationApp(): boolean {
  if (typeof window === 'undefined') return false
  if (isPublicRegistrationHost(window.location.hostname)) return true
  const path = window.location.pathname
  return path === '/register' || path.startsWith('/register/')
}

/** Keep the public subdomain URL at `/` so visitors never need /register. */
export function canonicalizePublicRegistrationPath(): void {
  if (typeof window === 'undefined') return
  if (!isPublicRegistrationHost(window.location.hostname)) return
  const path = window.location.pathname
  if (path === '/' || path === '') return
  window.history.replaceState(null, '', `/${window.location.search}${window.location.hash}`)
}
