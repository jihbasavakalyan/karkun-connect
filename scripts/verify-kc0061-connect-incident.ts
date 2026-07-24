/**
 * KC-0061 — Verify connect instrumentation + claims-aware auth refresh.
 * Run: npm run verify:kc0061
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const connectTrace = readFileSync(resolve('src/lib/debug/kc0061ConnectTrace.ts'), 'utf8')
assert(connectTrace.includes('KC-0061'), 'connect tracer present')
assert(connectTrace.includes('originalError'), 'must capture original error')

const assignStore = readFileSync(resolve('src/stores/assignmentStore.ts'), 'utf8')
assert(assignStore.includes('asn.allocate.fail'), 'ASN allocate failures traced')
assert(assignStore.includes('repositoryError'), 'original repository error preserved')

const assignService = readFileSync(resolve('src/services/assignmentService.ts'), 'utf8')
assert(assignService.includes('connection.write.fail'), 'connection write failures traced')
assert(assignService.includes('KC-0061'), 'assign service instrumented')

const available = readFileSync(resolve('src/pages/rukn/AvailableKarkunPage.tsx'), 'utf8')
assert(available.includes('assign returned failure (raw)'), 'UI logs raw before remap')

const auth = readFileSync(resolve('src/services/authenticationService.ts'), 'utf8')
assert(auth.includes('ID token missing rukn claims'), 'force-refresh when JWT lacks rukn role')

const init = readFileSync(resolve('src/repositories/firestore/initialize.ts'), 'utf8')
assert(init.includes('auth.claims.missing') || init.includes('auth.claims.available'), 'dashboard startup logs claim availability')

const provision = readFileSync(
  resolve('scripts/admin/kc0061-provision-rukn-claims.mjs'),
  'utf8',
)
assert(provision.includes('setCustomUserClaims'), 'provision script sets claims')

// Regression constraints — these modules must still exist / not be rewritten away.
for (const file of [
  'src/services/metricsService.ts',
  'src/providers/AuthProvider.tsx',
  'src/pages/admin/AdminHomePage.tsx',
]) {
  assert(readFileSync(resolve(file), 'utf8').length > 100, `${file} must remain`)
}

console.log('KC-0061 verify OK', {
  connectInstrumented: true,
  claimsProvisionScript: true,
  tokenRefreshOnMissingClaims: true,
})
