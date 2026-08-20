/**
 * Public training gathering registration — architecture and safety verification.
 */
import { existsSync, readFileSync } from 'node:fs'
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
  assert(TRAINING_GATHERING_EVENT.eventTitleUrdu === 'تربیتی اجتماع', 'urdu title')
  assert(TRAINING_GATHERING_EVENT.eventTitleEn === 'Tarbiyati Ijtema', 'english title')
  assert(!TRAINING_GATHERING_EVENT.eventTitleEn.includes('Training Gathering'), 'no training gathering label')
  assert(formatRegistrationId('9876543210') === 'TG260913-9876543210', 'deterministic id')
}

function testHost(): void {
  assert(PUBLIC_REGISTRATION_HOST === 'registration.jihbasavakalyan.org', 'host')
  assert(isPublicRegistrationHost('registration.jihbasavakalyan.org'), 'match')
  assert(isPublicRegistrationHost('REGISTRATION.jihbasavakalyan.org.'), 'normalized match')
  assert(!isPublicRegistrationHost('jihbasavakalyan.org'), 'main domain not public host')
  assert(!isPublicRegistrationHost('karkun-connect.vercel.app'), 'vercel alias not public host')
  const hostSrc = read('src/lib/publicRegistration/host.ts')
  assert(hostSrc.includes('isPublicRegistrationHost(window.location.hostname)'), 'hostname branch')
  assert(hostSrc.includes("path === '/register'"), '/register kept as internal fallback')
  const indexHtml = read('index.html')
  assert(indexHtml.includes("host !== 'registration.jihbasavakalyan.org'"), 'index.html hostname gate')
  assert(indexHtml.includes("history.replaceState(null, '', '/'"), 'subdomain canonicalizes to /')
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
  assert(handler.includes("status === 'Active'"), 'reuses Active connection semantics')
  assert(handler.includes('fullName: profile.name'), 'persists registered name')
  assert(handler.includes("paymentStatusRaw === 'paid_cash'"), 'public cash paid reuses paid_cash')
  assert(!handler.includes('razorpay'), 'no razorpay client')
  assert(!handler.includes('twilio'), 'does not invent Twilio')
  assert(!handler.includes('msg91'), 'does not invent MSG91')
  assert(!handler.includes('allow read: if true'), 'no public firestore open')
  const rules = read('firestore.rules')
  assert(rules.includes('match /trainingRegistrations/{registrationId}'), 'registration rules')
  assert(rules.includes('allow create, update, delete: if false'), 'no client writes')
  const karkunsRule = rules.slice(rules.indexOf('match /karkuns/{karkunId}'), rules.indexOf('match /connections'))
  assert(!karkunsRule.includes('allow read: if true'), 'karkuns not public readable')
  assert(karkunsRule.includes('allow create: if isAdministrator()'), 'karkuns create admin only')
}

function testPublicCopyAndPayment(): void {
  const eventSrc = read('src/lib/publicRegistration/event.ts')
  assert(eventSrc.includes("eventTitleUrdu: 'تربیتی اجتماع'"), 'urdu event title constant')
  const page = read('src/pages/public/TrainingRegistrationPage.tsx')
  assert(page.includes('eventTitleUrdu'), 'urdu event title in public UI')
  assert(page.includes('Tarbiyati Ijtema'), 'english event title in public UI')
  assert(!page.includes('Training Gathering'), 'no training gathering in public UI')
  assert(page.includes('Cash Payment Pending'), 'cash pending choice')
  assert(page.includes('Cash Paid'), 'cash paid choice')
  assert(page.includes('Online payment is not available yet'), 'online blocked copy')
  assert(page.includes('Acknowledgement'), 'confirmation is an acknowledgement')
  assert(page.includes('registeredName'), 'uses registered name')
  const labels = read('src/lib/publicRegistration/labels.ts')
  assert(labels.includes("return 'Cash Paid'"), 'paid_cash label is Cash Paid')
  assert(labels.includes("return 'Cash Payment Pending'"), 'cash pending label')
  assert(!/\breturn 'Paid'\s*$/m.test(labels), 'does not display bare Paid')
  const admin = read('src/components/public-registration/TrainingGatheringAdminPanel.tsx')
  assert(admin.includes('Registered people'), 'admin people drill-down')
  assert(admin.includes('registeredPeople'), 'rukn connected registered people')
  assert(admin.includes('Mark Paid'), 'admin mark paid preserved')
  assert(existsSync(resolve(root, 'public/branding/jih-official-logo.png')), 'official logo asset present')
  const logo = read('src/components/public-registration/JihLogoMark.tsx')
  assert(logo.includes('/branding/jih-official-logo.png'), 'uses official logo path')
  assert(logo.includes('<img'), 'renders as static image')
  assert(!logo.includes('<svg'), 'does not use placeholder svg')
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
  run('public copy, cash states, admin drill-down', testPublicCopyAndPayment),
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
