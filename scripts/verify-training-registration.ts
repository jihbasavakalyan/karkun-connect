/**
 * Public training gathering registration — architecture and safety verification.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  applyMarkCashPaid,
  buildTrainingRegistrationAdminView,
  PUBLIC_TRAINING_REGISTRATION_URL,
} from '@/lib/publicRegistration/adminTracking'
import { formatRegistrationId, TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import { isPublicRegistrationHost, PUBLIC_REGISTRATION_HOST } from '@/lib/publicRegistration/host'
import type { TrainingRegistrationRecord } from '@/lib/publicRegistration/types'

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
  const tracking = read('src/lib/publicRegistration/adminTracking.ts')
  assert(tracking.includes("status === 'Active'"), 'reuses Active connection semantics')
  assert(tracking.includes("authoritativeGender"), 'gender from master Male/Female only')
  assert(!tracking.includes('infer'), 'does not infer gender from names')
  const handler = read('src/server/trainingRegistration/handler.ts')
  assert(handler.includes('verifyIdToken'), 'server verifies ID token')
  assert(handler.includes('phone_number'), 'uses verified phone identity')
  assert(handler.includes("const KARKUNS = 'karkuns'"), 'looks up karkuns server-side')
  assert(handler.includes('RAZORPAY_NOT_AVAILABLE'), 'does not invent Razorpay')
  assert(handler.includes('RUKN_MOBILE'), 'rukn mobile is blocked')
  assert(handler.includes('buildTrainingRegistrationAdminView'), 'admin summary reuses tracking builder')
  assert(handler.includes('applyMarkCashPaid'), 'mark paid reuses payment-only update')
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
  assert(admin.includes('Registered People'), 'admin people drill-down')
  assert(admin.includes('registeredPeople'), 'registered people list from all registrations')
  assert(admin.includes('relatedPeople'), 'rukn drill-down shows connected karkuns')
  assert(admin.includes('Eligible Male') || admin.includes('eligibleMale'), 'male eligible tracking')
  assert(admin.includes('Not Registered'), 'rukn drill-down distinguishes not registered')
  const hero = read('src/components/home/TarbiyatiIjtemaRuknHero.tsx')
  assert(hero.includes('JihLogoMark'), 'rukn hero reuses official logo component')
  assert(hero.includes('Register for Tarbiyati Ijtema'), 'rukn hero CTA')
  assert(hero.includes('PUBLIC_TRAINING_REGISTRATION_URL'), 'rukn hero uses official registration URL')
  const ruknHome = read('src/pages/rukn/RuknHomePage.tsx')
  assert(ruknHome.includes('TarbiyatiIjtemaRuknHero'), 'hero on authenticated Rukn Home')
  assert(PUBLIC_TRAINING_REGISTRATION_URL === 'https://registration.jihbasavakalyan.org/', 'CTA URL')
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

function sampleRegistration(
  overrides: Partial<TrainingRegistrationRecord> & Pick<TrainingRegistrationRecord, 'id' | 'verifiedMobile' | 'paymentStatus'>,
): TrainingRegistrationRecord {
  return {
    eventId: TRAINING_GATHERING_EVENT.id,
    personId: null,
    candidateRequestId: null,
    fullName: overrides.fullName ?? 'Person',
    registrationStatus: 'complete',
    paymentMethod: 'cash',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

function testRegistrationPaymentSeparation(): void {
  const pending = sampleRegistration({
    id: formatRegistrationId('9000000001'),
    personId: 'k-a',
    verifiedMobile: '9000000001',
    fullName: 'Person A',
    paymentStatus: 'cash_pending',
  })
  const paid = sampleRegistration({
    id: formatRegistrationId('9000000002'),
    personId: 'k-b',
    verifiedMobile: '9000000002',
    fullName: 'Person B',
    paymentStatus: 'paid_cash',
  })
  const input = {
    karkuns: [
      { id: 'k-a', name: 'Person A', mobile: '9000000001', gender: 'Male' },
      { id: 'k-b', name: 'Person B', mobile: '9000000002', gender: 'Female' },
      { id: 'k-c', name: 'Person C', mobile: '9000000003', gender: 'Male' },
    ],
    rukns: [{ id: 'r-1', name: 'Rukn One', status: 'active' }],
    connections: [
      { ruknId: 'r-1', karkunId: 'k-a', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-b', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-c', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-unrelated-skip', status: 'Inactive' },
    ],
    registrations: [pending, paid],
    publicRequests: [],
  }
  const before = buildTrainingRegistrationAdminView(input)
  assert(before.summary.registered === 2, 'registered includes cash pending and cash paid')
  assert(before.summary.cashPending === 1, 'cash pending count')
  assert(before.summary.cashPaid === 1, 'cash paid count')
  assert(before.registrations.some((row) => row.id === pending.id), 'pending person in Registered People')
  assert(before.registrations.some((row) => row.id === paid.id), 'paid person in Registered People')
  assert(
    before.registrations.filter((row) => row.paymentStatus === 'cash_pending').length === 1,
    'cash pending list is payment-filtered',
  )

  const marked = applyMarkCashPaid(pending)
  assert(marked.registrationStatus === 'complete', 'mark paid does not change registration status')
  assert(marked.paymentStatus === 'paid_cash', 'mark paid sets cash paid')
  const after = buildTrainingRegistrationAdminView({
    ...input,
    registrations: [marked, paid],
  })
  assert(after.summary.registered === 2, 'registered count unchanged after mark paid')
  assert(after.summary.cashPending === 0, 'cash pending decreases')
  assert(after.summary.cashPaid === 2, 'cash paid increases')
  assert(after.registrations.some((row) => row.id === pending.id), 'marked person remains in Registered People')
  assert(
    !after.registrations.some((row) => row.id === pending.id && row.paymentStatus === 'cash_pending'),
    'marked person leaves Cash Pending',
  )
}

function testGenderTracking(): void {
  const view = buildTrainingRegistrationAdminView({
    karkuns: [
      { id: 'm1', name: 'Male One', mobile: '9111111111', gender: 'Male' },
      { id: 'm2', name: 'Male Two', mobile: '9111111112', gender: 'Male' },
      { id: 'f1', name: 'Female One', mobile: '9222222221', gender: 'Female' },
    ],
    rukns: [],
    connections: [],
    registrations: [
      sampleRegistration({
        id: formatRegistrationId('9111111111'),
        personId: 'm1',
        verifiedMobile: '9111111111',
        fullName: 'Male One',
        paymentStatus: 'cash_pending',
      }),
    ],
    publicRequests: [],
  })
  assert(view.summary.eligibleMale === 2, 'male eligible')
  assert(view.summary.registeredMale === 1, 'male registered')
  assert(view.summary.remainingMale === 1, 'male remaining')
  assert(view.summary.eligibleFemale === 1, 'female eligible')
  assert(view.summary.registeredFemale === 0, 'female registered')
  assert(view.summary.remainingFemale === 1, 'female remaining')
  assert(view.summary.eligible === 3, 'overall eligible')
  assert(view.summary.registered === 1, 'overall registered')
  assert(view.summary.remaining === 2, 'overall remaining')
}

function testRuknScopeAndRegistration(): void {
  const view = buildTrainingRegistrationAdminView({
    karkuns: [
      { id: 'k-reg-pending', name: 'Pending Karkun', mobile: '9333333331', gender: 'Male' },
      { id: 'k-reg-paid', name: 'Paid Karkun', mobile: '9333333332', gender: 'Female' },
      { id: 'k-open', name: 'Open Karkun', mobile: '9333333333', gender: 'Male' },
      { id: 'k-other', name: 'Other Rukn Karkun', mobile: '9333333334', gender: 'Male' },
    ],
    rukns: [
      { id: 'r-scope', name: 'Scoped Rukn', status: 'active' },
      { id: 'r-other', name: 'Other Rukn', status: 'active' },
    ],
    connections: [
      { ruknId: 'r-scope', karkunId: 'k-reg-pending', status: 'Active' },
      { ruknId: 'r-scope', karkunId: 'k-reg-paid', status: 'Active' },
      { ruknId: 'r-scope', karkunId: 'k-open', status: 'Active' },
      { ruknId: 'r-other', karkunId: 'k-other', status: 'Active' },
    ],
    registrations: [
      sampleRegistration({
        id: formatRegistrationId('9333333331'),
        personId: 'k-reg-pending',
        verifiedMobile: '9333333331',
        fullName: 'Pending Karkun',
        paymentStatus: 'cash_pending',
      }),
      sampleRegistration({
        id: formatRegistrationId('9333333332'),
        personId: 'k-reg-paid',
        verifiedMobile: '9333333332',
        fullName: 'Paid Karkun',
        paymentStatus: 'paid_cash',
      }),
    ],
    publicRequests: [],
  })
  const scoped = view.summary.ruknWise.find((row) => row.ruknId === 'r-scope')
  assert(Boolean(scoped), 'scoped rukn present')
  assert(scoped!.related === 3, 'related is connected karkuns only')
  assert(scoped!.registered === 2, 'cash pending and cash paid both count as registered')
  assert(scoped!.remaining === 1, 'unregistered connected karkun remains remaining')
  assert(scoped!.relatedPeople.some((person) => person.karkunId === 'k-open' && person.listStatus === 'not_registered'), 'unregistered connected remains visible')
  assert(scoped!.relatedPeople.some((person) => person.karkunId === 'k-reg-pending' && person.listStatus === 'registered'), 'cash pending is registered')
  assert(scoped!.relatedPeople.some((person) => person.karkunId === 'k-reg-paid' && person.listStatus === 'registered'), 'cash paid is registered')
  assert(!scoped!.relatedPeople.some((person) => person.karkunId === 'k-other'), 'unrelated karkun excluded')
}

function testRuknHeroContract(): void {
  const hero = read('src/components/home/TarbiyatiIjtemaRuknHero.tsx')
  assert(hero.includes('/branding/jih-official-logo.png') || hero.includes('JihLogoMark'), 'official logo reused')
  assert(hero.includes('Register for Tarbiyati Ijtema'), 'CTA exists')
  assert(PUBLIC_TRAINING_REGISTRATION_URL === 'https://registration.jihbasavakalyan.org/', 'opens official host')
  assert(read('src/pages/rukn/RuknHomePage.tsx').includes('<TarbiyatiIjtemaRuknHero'), 'renders on Rukn Home')
}

const cases = [
  run('event constants and registration id', testEventAndId),
  run('subdomain host detection', testHost),
  run('Rukn OTP behaviour unchanged', testRuknOtpUntouched),
  run('verified server path and rules', testSecurityPath),
  run('public copy, cash states, admin drill-down', testPublicCopyAndPayment),
  run('same application entry, no second app', testNoSecondApp),
  run('Person schema education/profession', testPersonSchemaDelta),
  run('registration vs payment separation and mark paid', testRegistrationPaymentSeparation),
  run('male female overall tracking', testGenderTracking),
  run('rukn connected scope and registered vs remaining', testRuknScopeAndRegistration),
  run('rukn home hero contract', testRuknHeroContract),
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
