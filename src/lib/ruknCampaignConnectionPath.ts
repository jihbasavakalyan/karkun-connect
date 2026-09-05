import { ROUTES } from '@/constants/routes'

/**
 * Routes that must not render campaign connection counts when critical
 * connection/karkun hydrate failed (anti fake-zero). Other Rukn routes stay open.
 */
export function isRuknCampaignConnectionPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === ROUTES.RUKN) return true
  if (path === ROUTES.RUKN_AVAILABLE_KARKUN) return true
  if (path === ROUTES.RUKN_MY_KARKUN) return true
  if (path === ROUTES.RUKN_CAMPAIGN_RECORD) return true
  if (path.startsWith(`${ROUTES.RUKN}/visit/`)) return true
  if (path.startsWith(`${ROUTES.RUKN_COMMUNICATION}/companion/`)) return true
  return false
}
