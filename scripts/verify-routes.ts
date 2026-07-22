/**
 * Sprint 13 — route and navigation audit verification.
 * Run: npx vite-node scripts/verify-routes.ts
 */
import { ADMIN_NAV_ITEMS } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const REQUIRED_ADMIN_ROUTES = [
  ROUTES.ADMIN,
  ROUTES.ADMIN_CAMPAIGN,
  ROUTES.ADMIN_CAMPAIGN_SETUP,
  ROUTES.ADMIN_RUKN,
  ROUTES.ADMIN_KARKUN,
  ROUTES.ADMIN_ASSIGNMENTS,
  ROUTES.ADMIN_EXECUTION,
  ROUTES.ADMIN_COMPLIANCE,
  ROUTES.ADMIN_FOLLOW_UP,
  ROUTES.ADMIN_COMMUNICATION,
  ROUTES.ADMIN_LISTS,
  ROUTES.ADMIN_SETTINGS,
  ROUTES.ADMIN_HELP,
  ROUTES.LOGIN,
  ROUTES.HOME,
]

const REQUIRED_RUKN_ROUTES = [
  ROUTES.RUKN,
  ROUTES.RUKN_AVAILABLE_KARKUN,
  ROUTES.RUKN_MY_KARKUN,
  ROUTES.RUKN_CAMPAIGN_RECORD,
  ROUTES.RUKN_WEEKLY_IJTEMA,
]

for (const route of REQUIRED_ADMIN_ROUTES) {
  assert(route.startsWith('/'), `Route must be absolute: ${route}`)
}

for (const route of REQUIRED_RUKN_ROUTES) {
  assert(route.startsWith('/'), `Rukn route must be absolute: ${route}`)
}

for (const item of ADMIN_NAV_ITEMS) {
  assert(item.to.startsWith('/admin'), `Admin nav must target admin area: ${item.label}`)
  assert(REQUIRED_ADMIN_ROUTES.includes(item.to as (typeof REQUIRED_ADMIN_ROUTES)[number]), `Admin nav route registered: ${item.label}`)
}

assert(ROUTES.ADMIN_CAMPAIGN === ROUTES.ADMIN_CAMPAIGNS, 'Campaign route aliases must match')
assert(ROUTES.ADMIN_KARKUN === ROUTES.ADMIN_KARKUNAN, 'Karkun legacy alias must match')
assert(ROUTES.ADMIN_RUKN === ROUTES.ADMIN_RUKN_MASTER, 'Rukn legacy alias must match')

console.log('Route and navigation audit verification passed.')
