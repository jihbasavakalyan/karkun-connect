/**
 * Startup claims-before-critical-read contract + timing marker verification.
 * Run: npx vite-node scripts/verify-startup-claims-gate.ts
 *
 * Before fix: ensureAuthTokenReadyForFirestore(false) only refreshed when role was
 * already missing, then still proceeded — intermittent permission-denied on first load.
 * After fix: always ensureJwtRoleClaimPresent() before critical getDocs; defer when
 * no currentUser so AuthProvider can hydrate post-login.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

const init = readFileSync(resolve('src/repositories/firestore/initialize.ts'), 'utf8')
const repos = readFileSync(
  resolve('src/repositories/firestore/firestoreRepositories.ts'),
  'utf8',
)
const adminHome = readFileSync(resolve('src/pages/admin/AdminHomePage.tsx'), 'utf8')
const ensure = readFileSync(resolve('src/lib/auth/ensureJwtRoleClaim.ts'), 'utf8')

assert(ensure.includes('getIdToken(true)'), 'JWT gate always force-refreshes ID token')
assert(init.includes('ensureJwtRoleClaimPresent'), 'startup hydrate uses JWT role claim gate')
assert(
  !/await user\.getIdTokenResult\(forceRefresh\)[\s\S]{0,200}if \(!claimRole && !forceRefresh\)/.test(
    init,
  ),
  'removed conditional-only force-refresh path that raced Firestore credentials',
)
assert(init.includes('auth.ready'), 'timing: auth ready')
assert(init.includes('auth.token.refreshed'), 'timing: token refreshed')
assert(init.includes('auth.claims.available'), 'timing: claims available')
assert(init.includes('repository.initialized'), 'timing: repository initialized')
assert(init.includes('auth.no_user.defer_hydrate'), 'no protected reads before sign-in')
assert(
  init.includes("outcome === 'deferred'") || init.includes("=== 'deferred'"),
  'deferred startup must not set initialized=true',
)
assert(
  repos.includes('firestore.first_critical_read.start'),
  'timing: first firestore read',
)
assert(adminHome.includes('dashboard.rendered'), 'timing: dashboard rendered')
assert(
  adminHome.includes('permissionDeniedWhileAuthInitializing'),
  'permission-denied during auth init must not hard-fail the dashboard UI',
)

// Expected marker order (documented for ops measurement).
const expectedOrder = [
  'auth.authStateReady',
  'auth.ready',
  'auth.token.refreshed',
  'auth.claims.available',
  'repository.initialized',
  'firestore.first_critical_read.start',
  'firestore.first_critical_read.complete',
  'dashboard.rendered',
]
console.log(
  JSON.stringify(
    {
      contract: 'claims-before-critical-read',
      expectedLifecycleOrder: expectedOrder,
      beforeFix:
        'Conditional getIdTokenResult refresh; critical getDocs could run without Firestore-attached role claim → intermittent permission-denied.',
      afterFix:
        'Always ensureJwtRoleClaimPresent (getIdToken(true)+role) before critical reads; defer when unsigned; soft UI while auth initializing.',
      measurement:
        'In browser after login: window.__KC027G_LIFECYCLE__ — compare t for auth.claims.available vs firestore.first_critical_read.start (claims must be earlier) and dashboard.rendered t as startup duration.',
    },
    null,
    2,
  ),
)

console.log('Startup claims gate verification passed.')
