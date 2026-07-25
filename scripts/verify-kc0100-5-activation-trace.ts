/**
 * KC-0100.5 — Verify production auth trace + credential hardening contracts.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())

const admin = readFileSync(resolve(root, 'src/server/ruknClaims/firebaseAdmin.ts'), 'utf8')
assert(admin.includes('FIREBASE_SERVICE_ACCOUNT_JSON'), 'dedicated Auth SA required')
assert(admin.includes('EXPECTED_PROJECT'), 'expected Firebase project enforced')
assert(admin.includes('project mismatch') || admin.includes('does not match expected'), 'mismatch rejected')

const handler = readFileSync(resolve(root, 'src/server/ruknClaims/provisionHandler.ts'), 'utf8')
assert(handler.includes('KC-0100.5'), 'handler emits KC-0100.5 traces')
assert(handler.includes('verifyIdToken'), 'step 6 present')
assert(handler.includes('setCustomUserClaims_called'), 'step 9 logged')
assert(handler.includes('getUser_confirms_stored_claims'), 'step 11 logged')
assert(handler.includes('tokenAud'), 'logs token aud on verify failure')
assert(handler.includes("method === 'GET'"), 'GET diagnostics for Admin project')

const trace = readFileSync(resolve(root, 'src/lib/auth/authPipelineTrace.ts'), 'utf8')
assert(trace.includes('logAuthTrace'), 'shared trace helper')
assert(trace.includes('newAuthTraceId'), 'trace id generator')

const auth = readFileSync(resolve(root, 'src/services/authenticationService.ts'), 'utf8')
assert(auth.includes('claimsProvisionInFlight'), 'subscribe race guard')
assert(auth.includes('client_force_refresh_getIdToken'), 'step 12 logged')
assert(auth.includes('decoded_jwt_after_refresh'), 'step 13 logged')
assert(auth.includes('kc0100_activation_guard'), 'step 14 logged')
assert(auth.includes('dashboard_routing'), 'step 15 logged')
assert(auth.includes('[KC-0100] Rukn session rejected'), 'fail-closed JWT gate preserved')

console.log('KC-0100.5 verify-kc0100-5-activation-trace: OK')
