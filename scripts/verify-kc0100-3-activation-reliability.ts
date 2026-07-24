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
assert(handler.includes('setCustomUserClaims'), 'server provisions claims via Admin SDK')
assert(handler.includes('verifyIdToken'), 'requires verified ID token')
assert(handler.includes("role: 'rukn'"), 'only grants rukn role')
assert(handler.includes('administrator'), 'blocks administrator claim path')
assert(handler.includes('status === \'active\''), 'requires Active Rukn Master')
assert(!handler.includes('createUser'), 'must not create Auth users')

const api = readFileSync(resolve(root, 'api/rukn-claims-provision.ts'), 'utf8')
assert(api.includes('handleRuknClaimsProvision'), 'Vercel API wires provision handler')

const client = readFileSync(resolve(root, 'src/lib/auth/requestRuknClaimsProvision.ts'), 'utf8')
assert(client.includes('/api/rukn-claims-provision'), 'client calls provision API')
assert(client.includes('Authorization'), 'client sends Bearer token')

const auth = readFileSync(resolve(root, 'src/services/authenticationService.ts'), 'utf8')
assert(auth.includes('requestRuknClaimsProvision'), 'OTP finalizeLogin requests provision')
assert(auth.includes('[KC-0100.3] attempting auto claim provision after OTP'), 'logs provision attempt')
assert(auth.includes('getIdToken(true)'), 'force-refreshes JWT after provision')
assert(auth.includes('MISSING_RUKN_JWT_CLAIMS_ERROR'), 'fail-closed message preserved')
assert(auth.includes('[KC-0100] Rukn session rejected'), 'KC-0100 JWT gate unchanged')
assert(
  auth.includes('attempting claim repair after JWT/Master mismatch'),
  'repairs wrong claims without bypass',
)

const vercel = readFileSync(resolve(root, 'vercel.json'), 'utf8')
assert(vercel.includes('api/rukn-claims-provision.ts'), 'vercel includes provision function files')

const pkg = readFileSync(resolve(root, 'package.json'), 'utf8')
assert(pkg.includes('"firebase-admin"'), 'firebase-admin available for Vercel runtime')
assert(pkg.includes('verify:kc0100.3'), 'npm verify script present')

console.log('KC-0100.3 verify-kc0100-3-activation-reliability: OK')
