/**
 * Public training gathering registration — architecture and safety verification.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  applyConfirmUpiPaid,
  applyMarkCashPaid,
  buildTrainingRegistrationAdminView,
  buildTrainingRegistrationCsv,
  matchesRegisteredPeopleFilters,
  matchesRegisteredPeopleSearch,
  paymentQueueTitle,
  PUBLIC_TRAINING_REGISTRATION_URL,
  sanitizeUtr,
} from '@/lib/publicRegistration/adminTracking'
import { formatRegistrationId, TARBIYATI_IJTEMA_UPI_QR_SRC, TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import { isPublicRegistrationHost, PUBLIC_REGISTRATION_HOST } from '@/lib/publicRegistration/host'
import { TRAINING_REGISTRATION_CSV_COLUMNS } from '@/lib/publicRegistration/types'
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
  assert(tracking.includes("from './event.js'"), 'adminTracking uses NodeNext .js specifier for event')
  assert(tracking.includes("from './types.js'"), 'adminTracking uses NodeNext .js specifier for types')
  const apiRoute = read('api/training-registration.ts')
  assert(apiRoute.includes("src/lib/publicRegistration/adminTracking.ts"), 'API packages adminTracking')
  assert(tracking.includes("authoritativeGender"), 'gender from master Male/Female only')
  assert(!tracking.includes('infer'), 'does not infer gender from names')
  const handler = read('src/server/trainingRegistration/handler.ts')
  assert(handler.includes('verifyIdToken'), 'server verifies ID token')
  assert(handler.includes('phone_number'), 'uses verified phone identity')
  assert(handler.includes("const KARKUNS = 'karkuns'"), 'looks up karkuns server-side')
  assert(handler.includes('RAZORPAY_NOT_AVAILABLE'), 'does not invent Razorpay')
  assert(handler.includes("case: 'existing_rukn'"), 'active rukn may register')
  assert(!handler.includes('RUKN_MOBILE'), 'rukn mobile is not blocked from event registration')
  assert(handler.includes('buildTrainingRegistrationAdminView'), 'admin summary reuses tracking builder')
  assert(handler.includes('applyMarkCashPaid'), 'mark paid reuses payment-only update')
  assert(handler.includes('applyConfirmUpiPaid'), 'upi confirm reuses payment-only update')
  assert(handler.includes('fullName: profile.name'), 'persists registered name')
  assert(handler.includes("paymentMethod === 'upi'"), 'accepts UPI payment method')
  assert(handler.includes('sanitizeUtr'), 'UTR is sanitized server-side')
  assert(handler.includes('admin_export_csv'), 'CSV export is an admin API action')
  assert(handler.includes('admin_confirm_upi_paid'), 'UPI confirm is an admin API action')
  assert(handler.includes("identity.role !== 'administrator'"), 'admin actions require administrator role')
  assert(!handler.includes('razorpay'), 'no razorpay client')
  assert(!handler.includes('twilio'), 'does not invent Twilio')
  assert(!handler.includes('msg91'), 'does not invent MSG91')
  assert(!handler.includes('allow read: if true'), 'no public firestore open')
  assert(!handler.includes("collection('payments')"), 'no payments collection')
  assert(!handler.includes("collection('upi')"), 'no upi collection')
  const rules = read('firestore.rules')
  assert(rules.includes('match /trainingRegistrations/{registrationId}'), 'registration rules')
  assert(rules.includes('allow create, update, delete: if false'), 'no client writes')
  assert(rules.includes('allow read: if isAdministrator()'), 'admin read remains administrator-gated')
  const karkunsRule = rules.slice(rules.indexOf('match /karkuns/{karkunId}'), rules.indexOf('match /connections'))
  assert(!karkunsRule.includes('allow read: if true'), 'karkuns not public readable')
  assert(karkunsRule.includes('allow create: if isAdministrator()'), 'karkuns create admin only')
}

function testPublicCopyAndPayment(): void {
  const eventSrc = read('src/lib/publicRegistration/event.ts')
  assert(eventSrc.includes("eventTitleUrdu: 'تربیتی اجتماع'"), 'urdu event title constant')
  assert(eventSrc.includes("/branding/tarbiyati-ijtema-upi-qr.jpeg"), 'QR path constant')
  const page = read('src/pages/public/TrainingRegistrationPage.tsx')
  assert(page.includes('eventTitleUrdu'), 'urdu event title in public UI')
  assert(page.includes('Tarbiyati Ijtema'), 'english event title in public UI')
  assert(!page.includes('Training Gathering'), 'no training gathering in public UI')
  assert(page.includes('Cash'), 'cash payment choice')
  assert(page.includes('UPI Payment'), 'UPI payment choice')
  assert(page.includes('TARBIYATI_IJTEMA_UPI_QR_SRC'), 'official QR constant used in public UI')
  assert(page.includes('Scan this QR code to pay ₹'), 'QR scan copy')
  assert(page.includes('After payment, enter your UTR / Transaction Reference Number.'), 'UTR instruction')
  assert(page.includes('UTR / Transaction Reference Number'), 'UTR field')
  assert(!page.includes('type="file"') && !page.includes("type='file'"), 'no screenshot file input')
  assert(page.includes('Screenshot upload is not available'), 'screenshot limitation is disclosed')
  assert(page.includes('Razorpay / Online Gateway'), 'gateway option labelled')
  assert(page.includes('Not available yet'), 'online blocked copy')
  assert(page.includes('Acknowledgement'), 'confirmation is an acknowledgement')
  assert(page.includes('registeredName'), 'uses registered name')
  assert(page.includes('trainingAcknowledgementPaymentLabel'), 'acknowledgement payment labels')
  const labels = read('src/lib/publicRegistration/labels.ts')
  assert(labels.includes("return 'Cash Paid'"), 'paid_cash label is Cash Paid')
  assert(labels.includes("return 'Cash Pending'"), 'cash pending label')
  assert(labels.includes("return 'UPI Pending'"), 'upi pending label')
  assert(labels.includes("return 'UPI Paid'"), 'upi paid label')
  assert(labels.includes('Cash Payment — Pending'), 'cash pending acknowledgement')
  assert(labels.includes('Cash Payment — Paid'), 'cash paid acknowledgement')
  assert(labels.includes('UPI Payment — Awaiting Verification'), 'upi pending acknowledgement')
  assert(labels.includes('UPI Payment — Paid'), 'upi paid acknowledgement')
  assert(!/\breturn 'Paid'\s*$/m.test(labels), 'does not display bare Paid')
  const admin = read('src/components/public-registration/TrainingGatheringAdminPanel.tsx')
  assert(admin.includes('Registered People'), 'admin people list')
  assert(admin.includes('Registered People (Total:'), 'registered people total is prominent')
  assert(admin.includes('Export CSV'), 'admin CSV export button')
  assert(admin.includes('exportTrainingRegistrationCsv'), 'CSV uses admin API')
  assert(admin.includes('Confirm UPI Paid'), 'admin UPI confirm action')
  assert(admin.includes('Cash Pending'), 'cash pending queue')
  assert(admin.includes('Cash Paid'), 'cash paid queue')
  assert(admin.includes('UPI Pending'), 'upi pending queue')
  assert(admin.includes('UPI Paid'), 'upi paid queue')
  assert(admin.includes('paymentQueueTitle'), 'payment queues identify people by name')
  assert(admin.includes('matchesRegisteredPeopleSearch'), 'registered people search')
  assert(admin.includes('matchesRegisteredPeopleFilters'), 'registered people filters')
  assert(admin.includes('relatedPeople'), 'rukn drill-down shows connected karkuns')
  assert(admin.includes('byCategory'), 'admin category table')
  assert(admin.includes('ruknOwnRegistered'), 'rukn own registration distinguished')
  assert(admin.includes('Razorpay / Online Gateway: Unavailable'), 'razorpay unavailable in admin summary')
  assert(!admin.includes('Eligible'), 'no eligible event-capacity metric')
  assert(!page.includes('rukn_blocked'), 'public UI does not block rukn')
  assert(page.includes('existing_rukn'), 'public UI handles existing rukn')
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
  assert(existsSync(resolve(root, 'public/branding/tarbiyati-ijtema-upi-qr.jpeg')), 'official UPI QR asset present')
  assert(TARBIYATI_IJTEMA_UPI_QR_SRC === '/branding/tarbiyati-ijtema-upi-qr.jpeg', 'QR public path')
  const logo = read('src/components/public-registration/JihLogoMark.tsx')
  assert(logo.includes('/branding/jih-official-logo.png'), 'uses official logo path')
  assert(logo.includes('<img'), 'renders as static image')
  assert(!logo.includes('<svg'), 'does not use placeholder svg')
  const client = read('src/lib/publicRegistration/client.ts')
  assert(client.includes("'admin_export_csv'"), 'export action is not public')
  assert(!client.includes('razorpay'), 'client has no razorpay')
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
    ruknId: null,
    candidateRequestId: null,
    fullName: overrides.fullName ?? 'Person',
    registrationStatus: 'complete',
    paymentMethod: 'cash',
    utr: null,
    paymentSubmittedAt: null,
    paymentVerifiedAt: null,
    paymentVerifiedBy: null,
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
      { id: 'm1', name: 'Male One', mobile: '9111111111', gender: 'Male', category: 'Karkun' },
      { id: 'm2', name: 'Male Two', mobile: '9111111112', gender: 'Male', category: 'Muttafiq' },
      { id: 'f1', name: 'Female One', mobile: '9222222221', gender: 'Female', category: 'Karkun' },
    ],
    rukns: [{ id: 'r-m', name: 'Rukn Male', status: 'active', gender: 'Male', mobile: '9000000099' }],
    connections: [],
    registrations: [
      sampleRegistration({
        id: formatRegistrationId('9111111111'),
        personId: 'm1',
        verifiedMobile: '9111111111',
        fullName: 'Male One',
        paymentStatus: 'cash_pending',
        organisationalCategory: 'karkun',
      }),
      sampleRegistration({
        id: formatRegistrationId('9222222221'),
        personId: 'f1',
        verifiedMobile: '9222222221',
        fullName: 'Female One',
        paymentStatus: 'paid_cash',
        organisationalCategory: 'karkun',
      }),
    ],
    publicRequests: [],
  })
  assert(view.summary.registeredMale === 1, 'male registered')
  assert(view.summary.registeredFemale === 1, 'female registered')
  assert(view.summary.registered === 2, 'overall registered')
  assert(view.summary.registeredMale + view.summary.registeredFemale === view.summary.registered, 'male + female = overall')
  assert(!('eligible' in view.summary), 'eligible master count is not the event product metric')
}

function testOpenCategoryRegistration(): void {
  const view = buildTrainingRegistrationAdminView({
    karkuns: [
      { id: 'k-m', name: 'Karkun M', mobile: '8111111111', gender: 'Male', category: 'Karkun' },
      { id: 'k-f', name: 'Karkun F', mobile: '8111111112', gender: 'Female', category: 'Karkun' },
      { id: 'mu-m', name: 'Muttafiq M', mobile: '8111111113', gender: 'Male', category: 'Muttafiq' },
      { id: 'mu-f', name: 'Muttafiq F', mobile: '8111111114', gender: 'Female', category: 'Muttafiq' },
    ],
    rukns: [
      { id: 'r-m', name: 'Rukn M', status: 'active', gender: 'Male', mobile: '8111111115' },
      { id: 'r-f', name: 'Rukn F', status: 'active', gender: 'Female', mobile: '8111111116' },
    ],
    connections: [],
    registrations: [
      sampleRegistration({
        id: formatRegistrationId('8111111111'),
        personId: 'k-m',
        verifiedMobile: '8111111111',
        paymentStatus: 'cash_pending',
        organisationalCategory: 'karkun',
      }),
      sampleRegistration({
        id: formatRegistrationId('8111111112'),
        personId: 'k-f',
        verifiedMobile: '8111111112',
        paymentStatus: 'paid_cash',
        organisationalCategory: 'karkun',
      }),
      sampleRegistration({
        id: formatRegistrationId('8111111113'),
        personId: 'mu-m',
        verifiedMobile: '8111111113',
        paymentStatus: 'cash_pending',
        organisationalCategory: 'muttafiq',
      }),
      sampleRegistration({
        id: formatRegistrationId('8111111114'),
        personId: 'mu-f',
        verifiedMobile: '8111111114',
        paymentStatus: 'paid_cash',
        organisationalCategory: 'muttafiq',
      }),
      sampleRegistration({
        id: formatRegistrationId('8111111115'),
        ruknId: 'r-m',
        verifiedMobile: '8111111115',
        paymentStatus: 'cash_pending',
        organisationalCategory: 'rukn',
      }),
      sampleRegistration({
        id: formatRegistrationId('8111111116'),
        ruknId: 'r-f',
        verifiedMobile: '8111111116',
        paymentStatus: 'paid_cash',
        organisationalCategory: 'rukn',
      }),
      sampleRegistration({
        id: formatRegistrationId('8111111117'),
        verifiedMobile: '8111111117',
        paymentStatus: 'cash_pending',
        organisationalCategory: 'other',
      }),
    ],
    publicRequests: [
      {
        source: 'public_training_registration',
        mobile: '8111111117',
        fullName: 'Other Person',
        gender: 'Male',
        status: 'Pending Approval',
      },
    ],
  })
  assert(view.summary.byCategory.karkun.male === 1 && view.summary.byCategory.karkun.female === 1, 'karkun gender split')
  assert(view.summary.byCategory.muttafiq.male === 1 && view.summary.byCategory.muttafiq.female === 1, 'muttafiq gender split')
  assert(view.summary.byCategory.rukn.male === 1 && view.summary.byCategory.rukn.female === 1, 'rukn gender split')
  assert(view.summary.byCategory.other.total === 1, 'other registration counted')
  assert(view.summary.registered === 7, 'all open-registration categories counted')
  assert(view.registrations.every((row) => row.registrationStatus === 'complete'), 'payment independent of membership')
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
      { id: 'r-scope', name: 'Scoped Rukn', status: 'active', gender: 'Male', mobile: '9333333399' },
      { id: 'r-other', name: 'Other Rukn', status: 'active', gender: 'Female', mobile: '9333333388' },
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
  assert(scoped!.ruknOwnRegistered === false, 'rukn own registration is separate from connected karkuns')
}

function testRuknHeroContract(): void {
  const hero = read('src/components/home/TarbiyatiIjtemaRuknHero.tsx')
  assert(hero.includes('/branding/jih-official-logo.png') || hero.includes('JihLogoMark'), 'official logo reused')
  assert(hero.includes('Register for Tarbiyati Ijtema'), 'CTA exists')
  assert(PUBLIC_TRAINING_REGISTRATION_URL === 'https://registration.jihbasavakalyan.org/', 'opens official host')
  assert(read('src/pages/rukn/RuknHomePage.tsx').includes('<TarbiyatiIjtemaRuknHero'), 'renders on Rukn Home')
}

function mixedPaymentFixture() {
  const cashPending = sampleRegistration({
    id: formatRegistrationId('9000000001'),
    personId: 'k-a',
    verifiedMobile: '9000000001',
    fullName: 'Md Aslam',
    paymentStatus: 'cash_pending',
    organisationalCategory: 'karkun',
  })
  const cashPaid = sampleRegistration({
    id: formatRegistrationId('9000000002'),
    personId: 'k-b',
    verifiedMobile: '9000000002',
    fullName: 'Fatima',
    paymentStatus: 'paid_cash',
    organisationalCategory: 'muttafiq',
  })
  const upiPending = sampleRegistration({
    id: formatRegistrationId('9000000003'),
    personId: 'k-c',
    verifiedMobile: '9000000003',
    fullName: 'Ayesha',
    paymentMethod: 'upi',
    paymentStatus: 'upi_pending',
    utr: 'UTR9000000003',
    paymentSubmittedAt: '2026-08-25T10:00:00.000Z',
    organisationalCategory: 'other',
  })
  const upiPaid = sampleRegistration({
    id: formatRegistrationId('9000000004'),
    ruknId: 'r-1',
    verifiedMobile: '9000000004',
    fullName: 'Rukn Name',
    paymentMethod: 'upi',
    paymentStatus: 'paid_upi',
    utr: 'UTR9000000004',
    paymentSubmittedAt: '2026-08-25T09:00:00.000Z',
    paymentVerifiedAt: '2026-08-25T11:00:00.000Z',
    paymentVerifiedBy: 'admin-uid',
    organisationalCategory: 'rukn',
  })
  const input = {
    karkuns: [
      { id: 'k-a', name: 'Md Aslam', mobile: '9000000001', gender: 'Male', category: 'Karkun' },
      { id: 'k-b', name: 'Fatima', mobile: '9000000002', gender: 'Female', category: 'Muttafiq' },
      { id: 'k-c', name: 'Ayesha', mobile: '9000000003', gender: 'Female', category: 'Karkun' },
    ],
    rukns: [{ id: 'r-1', name: 'Rukn Name', status: 'active', gender: 'Male', mobile: '9000000004' }],
    connections: [{ ruknId: 'r-1', karkunId: 'k-a', status: 'Active' }],
    registrations: [cashPending, cashPaid, upiPending, upiPaid],
    publicRequests: [
      {
        source: 'public_training_registration',
        mobile: '9000000003',
        fullName: 'Ayesha',
        gender: 'Female',
        status: 'Pending Approval',
      },
    ],
  }
  return { cashPending, cashPaid, upiPending, upiPaid, input }
}

function testUpiFlowAndRegisteredPeople(): void {
  const { cashPending, upiPending, upiPaid, input } = mixedPaymentFixture()
  const before = buildTrainingRegistrationAdminView(input)
  assert(before.summary.registered === 4, 'all payment states remain registered')
  assert(before.summary.upiPending === 1, 'upi pending count')
  assert(before.summary.upiPaid === 1, 'upi paid count')
  assert(before.summary.cashPending === 1, 'cash pending count')
  assert(before.summary.cashPaid === 1, 'cash paid count')
  assert(before.registrations.some((row) => row.id === upiPending.id), 'upi pending remains in Registered People')
  assert(paymentQueueTitle('upi_pending', 'Ayesha') === 'UPI Pending — Ayesha', 'upi pending names the person')
  assert(paymentQueueTitle('paid_upi', 'Md Aslam') === 'UPI Paid — Md Aslam', 'upi paid names the person')
  assert(paymentQueueTitle('cash_pending', 'Md Aslam') === 'Cash Pending — Md Aslam', 'cash pending names the person')
  assert(paymentQueueTitle('paid_cash', 'Fatima') === 'Cash Paid — Fatima', 'cash paid names the person')

  const confirmed = applyConfirmUpiPaid(upiPending)
  assert(confirmed.registrationStatus === 'complete', 'upi confirm does not change registration status')
  assert(confirmed.paymentStatus === 'paid_upi', 'upi confirm sets paid_upi')
  assert(confirmed.utr === 'UTR9000000003', 'UTR is preserved')
  const after = buildTrainingRegistrationAdminView({
    ...input,
    registrations: [cashPending, input.registrations[1], confirmed, upiPaid],
  })
  assert(after.summary.registered === 4, 'registered count unchanged after UPI confirm')
  assert(after.summary.upiPending === 0, 'upi pending decreases')
  assert(after.summary.upiPaid === 2, 'upi paid increases')
  assert(after.registrations.some((row) => row.id === upiPending.id), 'confirmed person remains in Registered People')
}

function testUtrValidation(): void {
  const empty = sanitizeUtr('   ')
  assert(!empty.ok, 'empty UTR rejected')
  const missing = sanitizeUtr('')
  assert(!missing.ok, 'blank UTR rejected')
  const trimmed = sanitizeUtr('  ABC123XYZ  ')
  assert(trimmed.ok, 'trimmed UTR accepted')
  if (trimmed.ok) assert(trimmed.utr === 'ABC123XYZ', 'UTR trimmed and preserved exactly')
  const kept = sanitizeUtr('imps-12 34')
  assert(kept.ok, 'non-numeric UTR accepted without invented format rules')
  if (kept.ok) assert(kept.utr === 'imps-12 34', 'does not rewrite submitted UTR')
}

function testSearchFiltersAndCsv(): void {
  const { input } = mixedPaymentFixture()
  const view = buildTrainingRegistrationAdminView(input)
  const aslam = view.registrations.find((row) => row.fullName === 'Md Aslam')
  assert(Boolean(aslam), 'aslam present')
  assert(matchesRegisteredPeopleSearch(aslam!, 'aslam'), 'search by name')
  assert(matchesRegisteredPeopleSearch(aslam!, '9000000001'), 'search by mobile')
  assert(matchesRegisteredPeopleSearch(aslam!, aslam!.id), 'search by registration id')
  const ayesha = view.registrations.find((row) => row.fullName === 'Ayesha')
  assert(Boolean(ayesha), 'ayesha present')
  assert(matchesRegisteredPeopleSearch(ayesha!, 'UTR9000000003'), 'search by UTR')
  const female = view.registrations.filter((row) =>
    matchesRegisteredPeopleFilters(row, { gender: 'Female' }),
  )
  assert(female.length === 2, 'gender filter is display-only over the same dataset')
  assert(view.summary.registered === 4, 'filters do not change registered count')
  const csv = buildTrainingRegistrationCsv(view.registrations)
  for (const column of TRAINING_REGISTRATION_CSV_COLUMNS) {
    assert(csv.includes(column), `csv has ${column}`)
  }
  assert(csv.includes('Md Aslam'), 'csv includes cash pending person')
  assert(csv.includes('Fatima'), 'csv includes cash paid person')
  assert(csv.includes('Ayesha'), 'csv includes upi pending person')
  assert(csv.includes('Rukn Name'), 'csv includes rukn / upi paid person')
  assert(csv.includes('UTR9000000003'), 'csv includes UTR')
  assert(!csv.toLowerCase().includes('otp'), 'csv does not export otp')
  assert(!csv.toLowerCase().includes('password'), 'csv does not export password')
  assert(!csv.toLowerCase().includes('bearer'), 'csv does not export bearer token')
  const filteredCsv = buildTrainingRegistrationCsv(view.registrations)
  assert(filteredCsv.split(/\r?\n/).filter((line) => line.includes('TG260913-')).length === 4, 'csv is the full dataset')
}

function testNoNewInfrastructure(): void {
  const handler = read('src/server/trainingRegistration/handler.ts')
  const collections = read('src/repositories/firestore/collections.ts')
  assert(collections.includes("trainingRegistrations: 'trainingRegistrations'"), 'reuses trainingRegistrations')
  assert(!collections.includes('upiPayments'), 'no upi payments collection constant')
  assert(!handler.includes('firebase/storage'), 'does not invent storage upload')
  assert(!handler.includes('uploadBytes'), 'does not invent screenshot upload')
  const page = read('src/pages/public/TrainingRegistrationPage.tsx')
  assert(page.includes('object-contain'), 'QR preserves aspect ratio')
  assert(!page.includes('object-cover'), 'QR is not cropped with object-cover')
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
  run('open registration categories', testOpenCategoryRegistration),
  run('rukn connected scope and registered vs remaining', testRuknScopeAndRegistration),
  run('rukn home hero contract', testRuknHeroContract),
  run('UPI pending to paid without leaving Registered People', testUpiFlowAndRegisteredPeople),
  run('UTR trim empty and preserve', testUtrValidation),
  run('search filters and full CSV export', testSearchFiltersAndCsv),
  run('no new collection or screenshot infrastructure', testNoNewInfrastructure),
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
