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
const authProvider = readFileSync(resolve('src/providers/AuthProvider.tsx'), 'utf8')
const runtimeProvider = readFileSync(
  resolve('src/runtime/bootstrap/RuntimeProvider.tsx'),
  'utf8',
)
const appRouter = readFileSync(resolve('src/routes/AppRouter.tsx'), 'utf8')
const mainSrc = readFileSync(resolve('src/main.tsx'), 'utf8')
const appSrc = readFileSync(resolve('src/App.tsx'), 'utf8')

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

assert(
  !authProvider.includes("from '@/repositories/firestore/initialize'"),
  'AuthProvider must not statically import Firestore initialize',
)
assert(
  !authProvider.includes("from '@/stores/userPreferencesStore'"),
  'AuthProvider must not statically import userPreferencesStore (Firestore provider)',
)
assert(
  authProvider.includes("import('@/repositories/firestore/initialize')"),
  'AuthProvider must dynamically import refreshFirestoreAfterAuth after sign-in',
)
assert(
  !/import\s+(?:type\s+)?\{[^}]*\binitializeRuntime\b/.test(runtimeProvider),
  'RuntimeProvider must not statically import initializeRuntime',
)
assert(
  runtimeProvider.includes("import('./initializeRuntime')"),
  'RuntimeProvider must dynamically import initializeRuntime',
)
assert(
  runtimeProvider.includes('isAuthenticated'),
  'RuntimeProvider must wait for authentication before loading Digital Rafeeq',
)
assert(
  appSrc.includes("from '@/runtime/bootstrap/RuntimeProvider'"),
  'App must import RuntimeProvider without the bootstrap barrel (avoids eager runtime/Firestore)',
)
assert(
  appRouter.includes("import('@/layouts/AdminLayout')"),
  'AdminLayout must be lazy-loaded',
)
assert(
  appRouter.includes("import('@/layouts/RuknLayout')"),
  'RuknLayout must be lazy-loaded',
)
assert(
  /if \(isRepositoryHydrationReady\(\)\) \{[\s\S]*initializeRuntime/.test(mainSrc),
  'Digital Rafeeq idle init must wait for repository hydration',
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
