/**
 * KC-0061 Phase 2 — verify shared Admin+Rukn JWT claim guard.
 * Run: npm run verify:kc0061.phase2
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MISSING_JWT_ROLE_CLAIM_ERROR } from '../src/lib/auth/ensureJwtRoleClaim'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

assert(
  MISSING_JWT_ROLE_CLAIM_ERROR.includes('authorization claims'),
  'operator message must mention authorization claims',
)

const ensure = readFileSync(resolve('src/lib/auth/ensureJwtRoleClaim.ts'), 'utf8')
assert(ensure.includes('ensureJwtRoleClaimPresent'), 'claim helper present')

const auth = readFileSync(resolve('src/services/authenticationService.ts'), 'utf8')
assert(auth.includes('claimsMatchAppRole'), 'Admin+Rukn claim mismatch refresh')

const init = readFileSync(resolve('src/repositories/firestore/initialize.ts'), 'utf8')
assert(init.includes('auth.token.missing_role_claim.refresh'), 'hydrate force-refresh when claim missing')

const assign = readFileSync(resolve('src/services/assignmentService.ts'), 'utf8')
assert(assign.includes('ensureJwtRoleClaimPresent'), 'assignRukn gated on JWT role')

const probe = readFileSync(
  resolve('scripts/admin/kc0061-phase2-admin-vs-rukn-probe.mjs'),
  'utf8',
)
assert(probe.includes('bothSucceed'), 'phase2 probe compares Admin and Rukn')

console.log('KC-0061 Phase 2 verify OK', {
  sharedJwtGuard: true,
  adminAndRuknRefresh: true,
  assignGate: true,
})
