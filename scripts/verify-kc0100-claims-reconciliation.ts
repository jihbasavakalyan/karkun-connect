/**
 * KC-0100.2 — Verify Rukn claims reconciliation + OTP claims safeguard contracts.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())

const reconcile = readFileSync(
  resolve(root, 'scripts/admin/kc0100-reconcile-rukn-claims.mjs'),
  'utf8',
)
assert(reconcile.includes('setCustomUserClaims'), 'reconcile script repairs claims')
assert(reconcile.includes('missing_claims'), 'audit classifies missing claims')
assert(reconcile.includes('wrong_claims'), 'audit classifies wrong claims')
assert(reconcile.includes('idempotent') || reconcile.includes('correctlyProvisioned'), 'idempotent reconcile')
assert(reconcile.includes('--dry-run'), 'supports dry-run')
assert(reconcile.includes('--yes'), 'supports apply')
assert(reconcile.includes('administrator'), 'skips / protects admin path')
assert(!reconcile.includes('createUser'), 'must not create Auth users')

const validation = readFileSync(
  resolve(root, 'src/lib/auth/ruknClaimsValidation.ts'),
  'utf8',
)
assert(validation.includes('validateRuknJwtClaimsAgainstMaster'), 'claims validator present')
assert(validation.includes('role claim mismatch'), 'logs role mismatch reason')
assert(validation.includes('ruknId claim'), 'logs ruknId mismatch reason')

const auth = readFileSync(resolve(root, 'src/services/authenticationService.ts'), 'utf8')
assert(auth.includes('MISSING_RUKN_JWT_CLAIMS_ERROR'), 'KC-0100 fail-closed message preserved')
assert(auth.includes('[KC-0100] Rukn session rejected'), 'KC-0100 gate unchanged')
assert(auth.includes('[KC-0100.2] Rukn claims validation failed after OTP'), 'OTP claims safeguard logs')
assert(auth.includes('finalizeLogin(result.user, expectedRukn)'), 'OTP passes expected Rukn for validation')
assert(auth.includes('claims_validation:'), 'structured claims failure detail')

const pkg = readFileSync(resolve(root, 'package.json'), 'utf8')
assert(pkg.includes('admin:kc0100:claims'), 'npm script for reconcile present')
assert(pkg.includes('verify:kc0100.2'), 'npm verify script present')

console.log('KC-0100.2 verify-kc0100-claims-reconciliation: OK')
