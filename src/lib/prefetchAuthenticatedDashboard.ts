/**
 * KC-EVO-012A — Start dashboard route chunks as soon as the authenticated
 * shell is allowed, in parallel with repository hydrate (does not wait on
 * hydrationReady).
 */
import type { UserRole } from '@/types/auth.types'

export function prefetchAuthenticatedDashboard(role: UserRole): void {
  if (role === 'rukn') {
    void import('@/layouts/RuknLayout')
    void import('@/pages/rukn/RuknHomePage')
    return
  }
  if (role === 'administrator') {
    void import('@/layouts/AdminLayout')
    void import('@/pages/admin/AdminHomePage')
  }
}
