/**
 * Public training gathering registration — architecture and safety verification.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { formatRegistrationId, TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import { isPublicRegistrationHost, PUBLIC_REGISTRATION_HOST } from '@/lib/publicRegistration/host'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name, passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

const root = resolve(process.cwd())

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function testEventAndId(): void {
  assert(TRAINING_GATHERING_EVENT.id === 'training-gathering-2026-09-13', 'event id')
  assert(TRAINING_GATHERING_EVENT.feeInr === 100, 'fee')
  assert(formatRegistrationId('9876543210') === 'TG260913-9876543210', 'deterministic id')
}

function testHost(): void {
  assert(PUBLIC_REGISTRATION_HOST === 'registration.jihbasavakalyan.org', 'host')
  assert(isPublicRegistrationHost('registration.jihbasavakalyan.org'), 'match')
  assert(!isPublicRegistrationHost('jihbasavakalyan.org'), 'main domain not public host')
}

function testRuknOtpUntouched(): void {
  const auth = read('src/services/authenticationService.ts')
  assert(auth.includes('findByMobile(mobile)'), 'Rukn OTP still master-gated')
  assert(auth.includes('finalizeLogin'), 'Rukn finalizeLogin remains')
  const publicAuth = read('src/lib/publicRegistration/phoneAuth.ts')
  assert(!publicAuth.includes('findByMobile'), 'public OTP does not use rukn master gate')
  assert(!publicAuth.includes('finalizeLogin'), 'public OTP does not finalize Rukn login')
  assert(!publicAuth.includes('requestRuknClaimsProvision'), 'public OTP does not provision claims')
}

function testSecurityPath(): void {
  const handler = read('src/server/trainingRegistration/handler.ts')
  assert(handler.includes('verifyIdToken'), 'server verifies ID token')
  assert(handler.includes('phone_number'), 'uses verified phone identity')
  assert(handler.includes("const KARKUNS = 'karkuns'"), 'looks up karkuns server-side')
  assert(handler.includes('RAZORPAY_NOT_AVAILABLE'), 'does not invent Razorpay')
  assert(handler.includes('RUKN_MOBILE'), 'rukn mobile is blocked')
  assert(!handler.includes('allow read: if true'), 'no public firestore open')
  const rules = read('firestore.rules')
  assert(rules.includes('match /trainingRegistrations/{registrationId}'), 'registration rules')
  assert(rules.includes('allow create, update, delete: if false'), 'no client writes')
  const karkunsRule = rules.slice(rules.indexOf('match /karkuns/{karkunId}'), rules.indexOf('match /connections'))
  assert(!karkunsRule.includes('allow read: if true'), 'karkuns not public readable')
  assert(karkunsRule.includes('allow create: if isAdministrator()'), 'karkuns create admin only')
}

function testNoSecondApp(): void {
  const app = read('src/App.tsx')
  assert(app.includes('shouldMountPublicRegistrationApp'), 'hostname/path entry')
  assert(app.includes('PublicRegistrationApp'), 'public app branch')
  const vercel = read('vercel.json')
  assert(vercel.includes('training-registration'), 'same Vercel project API')
}

function testPersonSchemaDelta(): void {
  const types = read('src/types/karkun-registry.types.ts')
  assert(types.includes('education?: string'), 'education on Person')
  assert(types.includes('profession?: string'), 'profession on Person')
}

const cases = [
  run('event constants and registration id', testEventAndId),
  run('subdomain host detection', testHost),
  run('Rukn OTP behaviour unchanged', testRuknOtpUntouched),
  run('verified server path and rules', testSecurityPath),
  run('same application entry, no second app', testNoSecondApp),
  run('Person schema education/profession', testPersonSchemaDelta),
]

const failed = cases.filter((item) => !item.passed)
for (const item of cases) {
  console.log(`${item.passed ? 'PASS' : 'FAIL'}  ${item.name}  ${item.detail}`)
}
if (failed.length > 0) {
  process.exitCode = 1
} else {
  console.log('Training registration verification passed.')
}
