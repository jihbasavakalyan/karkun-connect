/**
 * KC-0100.3 — Verify automatic Rukn claim provisioning contracts.
 * Fail-closed JWT validation must remain; no client-side claim bypass.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())

const handler = readFileSync(resolve(root, 'src/server/ruknClaims/provisionHandler.ts'), 'utf8')
assert(handler.includes('buildOfficerRuknClaims'), 'server provisions claims via shared officer helper')
assert(handler.includes('verifyIdToken'), 'requires verified ID token')
assert(!handler.includes("role: 'a_rukn'"), 'must not grant a distinct a_rukn JWT role')
assert(handler.includes('administrator'), 'blocks administrator claim path')
assert(handler.includes('matchRuknOfficersByNormalizedMobileFromDb'), 'requires Active officer on Rukn Master')
assert(!handler.includes('createUser'), 'must not create Auth users')

const identity = readFileSync(resolve(root, 'src/lib/officerIdentity.ts'), 'utf8')
assert(identity.includes("role: 'rukn'"), 'only grants rukn role')
assert(identity.includes('isActiveOfficerForRuknClaims'), 'active + non-archived officer gate')

const admin = readFileSync(resolve(root, 'src/server/ruknClaims/firebaseAdmin.ts'), 'utf8')
assert(admin.includes('FIREBASE_SERVICE_ACCOUNT_JSON'), 'prefers dedicated Auth SA env')
assert(admin.includes('project_id !== EXPECTED_PROJECT') || admin.includes('does not match expected'), 'rejects project mismatch')

const api = readFileSync(resolve(root, 'api/rukn-claims-provision.ts'), 'utf8')
assert(api.includes('handleRuknClaimsProvision'), 'Vercel API wires provision handler')

const client = readFileSync(resolve(root, 'src/lib/auth/requestRuknClaimsProvision.ts'), 'utf8')
assert(client.includes('/api/rukn-claims-provision'), 'client calls provision API')
assert(client.includes('Authorization'), 'client sends Bearer token')
assert(client.includes('X-KC-Trace-Id') || client.includes('traceId'), 'client correlating KC-0100.5 trace')

const auth = readFileSync(resolve(root, 'src/services/authenticationService.ts'), 'utf8')
assert(auth.includes('requestRuknClaimsProvision'), 'OTP finalizeLogin requests provision')
assert(auth.includes('[KC-0100.3] attempting auto claim provision after OTP'), 'logs provision attempt')
assert(auth.includes('getIdTokenResult(true)') || auth.includes('getIdToken(true)'), 'force-refreshes JWT after provision')
assert(auth.includes('MISSING_RUKN_JWT_CLAIMS_ERROR'), 'fail-closed message preserved')
assert(auth.includes('[KC-0100] Rukn session rejected'), 'KC-0100 JWT gate unchanged')
assert(auth.includes('claimsProvisionInFlight'), 'defers subscribe sign-out during provision')
assert(auth.includes('logAuthTrace'), 'KC-0100.5 pipeline trace present')
assert(
  auth.includes('attempting claim repair after JWT/Master mismatch'),
  'repairs wrong claims without bypass',
)

const vercel = readFileSync(resolve(root, 'vercel.json'), 'utf8')
assert(vercel.includes('api/rukn-claims-provision.ts'), 'vercel includes provision function files')
assert(vercel.includes('api/rukn-login-eligibility.ts'), 'vercel includes login eligibility function')

const pkg = readFileSync(resolve(root, 'package.json'), 'utf8')
assert(pkg.includes('"firebase-admin"'), 'firebase-admin available for Vercel runtime')
assert(pkg.includes('verify:kc0100.3'), 'npm verify script present')

console.log('KC-0100.3 verify-kc0100-3-activation-reliability: OK')

