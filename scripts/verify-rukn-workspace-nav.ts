/**
 * Rukn workspace: connection hydrate failure must not freeze navigation/logout
 * or invent a 0-connected / 0-available campaign state.
 * Run: npm run verify:rukn-workspace-nav
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROUTES } from '@/constants/routes'
import { isRuknCampaignConnectionPath } from '@/lib/ruknCampaignConnectionPath'
import {
  getAvailableKarkunPoolHydrateFailureMessage,
  isAvailableKarkunPoolHydrateFailed,
  markAvailableKarkunPoolHydrateFailed,
  markAvailableKarkunPoolHydrateOk,
  resetAvailableKarkunPoolHydrateForTests,
} from '@/repositories/availableKarkunPoolHydrate'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

console.log('verify-rukn-workspace-nav: start')

assert(isRuknCampaignConnectionPath(ROUTES.RUKN), 'Home is connection-scoped')
assert(isRuknCampaignConnectionPath(ROUTES.RUKN_AVAILABLE_KARKUN), 'Connect is connection-scoped')
assert(isRuknCampaignConnectionPath(ROUTES.RUKN_MY_KARKUN), 'Connected is connection-scoped')
assert(
  !isRuknCampaignConnectionPath(ROUTES.RUKN_COMMUNICATION),
  'Communication stays open when connection hydrate fails',
)
assert(
  !isRuknCampaignConnectionPath(ROUTES.RUKN_WEEKLY_IJTEMA),
  'Ijtema stays open when connection hydrate fails',
)
assert(
  !isRuknCampaignConnectionPath(ROUTES.RUKN_MONTHLY_BAITUL_MAAL),
  'Baitul Maal stays open when connection hydrate fails',
)
assert(!isRuknCampaignConnectionPath(ROUTES.ADMIN), 'Admin routes are unaffected')

{
  const layout = read('src/layouts/RuknLayout.tsx')
  assert(layout.includes('PortalAuthActions'), 'Logout control remains in the Rukn header')
  assert(layout.includes('aria-label="Rukn navigation"'), 'bottom navigation remains in the shell')
  assert(layout.includes('isRuknCampaignConnectionPath'), 'failed hydrate is route-scoped')
  const navAt = layout.indexOf('aria-label="Rukn navigation"')
  const failedAt = layout.indexOf('hydration.failed && connectionScoped')
  assert(failedAt >= 0 && navAt > failedAt, 'navigation is not inside the connection error branch')
  assert(layout.includes('<Outlet'), 'independent routes still render Outlet')
  assert(layout.includes('hydration.retry'), 'Retry remains available')
  assert(layout.includes('Unable to load your connections'), 'connection failure copy preserved')
  assert(!layout.includes('pointer-events-none'), 'shell does not disable pointer events')
}

{
  const repo = read('src/repositories/firestore/firestoreRepositories.ts')
  assert(repo.includes("where('promotedToARuknId', '==', '')"), 'Available query constrains promotedToARuknId')
  assert(
    repo.includes("where('aRuknPromotionInProgress', '==', false)"),
    'Available query constrains aRuknPromotionInProgress',
  )
  assert(repo.includes('readAvailableKarkunPoolForClient'), 'Available pool is isolated from hard-fail connections')
  assert(repo.includes('markAvailableKarkunPoolHydrateFailed'), 'Available-pool denial does not fake an empty list silently')
}

{
  const rules = read('firestore.rules')
  assert(rules.includes('isAvailableKarkunData'), 'Available read rule remains')
  assert(rules.includes('!isPromotedToARuknData(data)'), 'promotion exclusion remains in rules')
  assert(rules.includes('!isARuknPromotionInProgressData(data)'), 'transition exclusion remains in rules')
  assert(
    rules.includes('allow update: if (isAdministrator() && referredByUnchanged() && promotedKarkunNotAvailable())'),
    'Admin karkun update rule unchanged',
  )
}

{
  resetAvailableKarkunPoolHydrateForTests()
  assert(!isAvailableKarkunPoolHydrateFailed(), 'pool starts ok')
  markAvailableKarkunPoolHydrateFailed(new Error('Missing or insufficient permissions.'))
  assert(isAvailableKarkunPoolHydrateFailed(), 'pool failure is explicit')
  assert(
    getAvailableKarkunPoolHydrateFailureMessage()?.includes('Missing or insufficient permissions'),
    'pool failure keeps the operator-visible error',
  )
  markAvailableKarkunPoolHydrateOk()
  assert(!isAvailableKarkunPoolHydrateFailed(), 'successful pool read clears the failure')
  assert(getAvailableKarkunPoolHydrateFailureMessage() === null, 'success does not leave a stale error')
}

{
  const connectPage = read('src/pages/rukn/AvailableKarkunPage.tsx')
  assert(connectPage.includes('isAvailableKarkunPoolHydrateFailed'), 'Connect page does not treat pool failure as 0 ready')
  assert(connectPage.includes('Unable to load available Karkuns'), 'Connect shows an explicit pool error')
  assert(connectPage.includes('window.location.reload'), 'Connect retry remains available')
}

console.log('verify-rukn-workspace-nav: OK')
