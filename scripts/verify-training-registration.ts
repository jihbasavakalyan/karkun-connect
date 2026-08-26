/**
 * Public training gathering registration — architecture and safety verification.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  applyConfirmUpiPaid,
  buildTrainingRegistrationAdminView,
  buildTrainingRegistrationCsv,
  buildTrainingRegistrationRuknProgress,
  forbiddenFieldsInRuknProgress,
  isRestorableRegistration,
  listCashCollectors,
  matchesRegisteredPeopleFilters,
  matchesRegisteredPeopleSearch,
  normalizeTrainingMobile,
  paymentQueueTitle,
  PUBLIC_TRAINING_REGISTRATION_URL,
  resolveCashCollector,
  resolveOnlinePaymentEnabled,
  resolvePublicPaymentChoice,
  sanitizeUtr,
  TRAINING_REGISTRATION_SETTINGS_DOC,
} from '@/lib/publicRegistration/adminTracking'
import {
  buildTarbiyatiIjtemaUpiAppUri,
  buildTarbiyatiIjtemaUpiPayUri,
  buildTarbiyatiIjtemaUpiQuery,
  detectTarbiyatiUpiLaunchPlatform,
  encodeTarbiyatiIjtemaUpiQueryValue,
  formatRegistrationId,
  isLikelyMobileUpiClient,
  TARBIYATI_IJTEMA_POSTER_ALT,
  TARBIYATI_IJTEMA_POSTER_SRC,
  TARBIYATI_IJTEMA_UPI_APP_OPTIONS,
  TARBIYATI_IJTEMA_UPI_CURRENCY,
  TARBIYATI_IJTEMA_UPI_DESKTOP_MESSAGE,
  TARBIYATI_IJTEMA_UPI_NO_APP_MESSAGE,
  TARBIYATI_IJTEMA_UPI_PAYEE_NAME,
  TARBIYATI_IJTEMA_UPI_QR_FALLBACK_INTRO,
  TARBIYATI_IJTEMA_UPI_QR_SRC,
  TARBIYATI_IJTEMA_UPI_VPA,
  TRAINING_GATHERING_EVENT,
} from '@/lib/publicRegistration/event'
import { isPublicRegistrationHost, PUBLIC_REGISTRATION_HOST } from '@/lib/publicRegistration/host'
import { trainingAcknowledgementPaymentLabel, trainingPaymentMethodLabel } from '@/lib/publicRegistration/labels'
import { TRAINING_REGISTRATION_CSV_COLUMNS } from '@/lib/publicRegistration/types'
import type { TrainingRegistrationRecord } from '@/lib/publicRegistration/types'
import { FIRESTORE_DOCS } from '@/repositories/firestore/collections'

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
  assert(indexHtml.includes('serviceWorker'), 'public host unregisters stale service workers')
  assert(indexHtml.includes('reg.unregister()'), 'public host unregisters each registration')
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
  assert(handler.includes("const CONNECTIONS = 'connections'"), 'reuses connections collection')
  assert(handler.includes("action === 'rukn_registration_progress'"), 'rukn scoped progress action')
  assert(handler.includes("identity.role !== 'rukn'"), 'rukn progress requires rukn role')
  assert(handler.includes('identity.ruknId'), 'rukn scope comes from session claims')
  assert(handler.includes('RAZORPAY_NOT_AVAILABLE'), 'does not invent Razorpay')
  assert(handler.includes("case: 'existing_rukn'"), 'active rukn may register')
  assert(!handler.includes('RUKN_MOBILE'), 'rukn mobile is not blocked from event registration')
  assert(handler.includes('buildTrainingRegistrationAdminView'), 'admin summary reuses tracking builder')
  assert(!handler.includes('applyMarkCashPaid'), 'old cash mark-paid helper is removed')
  assert(!handler.includes('admin_mark_cash_paid'), 'old cash mark-paid admin action is removed')
  assert(handler.includes('applyConfirmUpiPaid'), 'upi confirm reuses payment-only update')
  assert(handler.includes('fullName: profile.name'), 'persists registered name')
  assert(handler.includes("paymentChoice === 'online'"), 'online payment choice is accepted')
  assert(handler.includes("paymentMethod = 'upi'"), 'online choice stores method upi')
  assert(handler.includes("paymentStatus = 'upi_pending'"), 'online choice stores upi_pending')
  assert(handler.includes("paymentChoice === 'cash_at_ijtema'"), 'cash at ijtema gah is accepted')
  assert(handler.includes("paymentChoice === 'cash_paid_to'"), 'cash paid to is accepted')
  assert(handler.includes('cashPaidToId'), 'stores cash collector id')
  assert(handler.includes('cashPaidToName'), 'stores cash collector name')
  assert(handler.includes('sanitizeUtr'), 'UTR is sanitized server-side')
  assert(handler.includes('listCashCollectors'), 'cash collectors come from existing rukn master')
  assert(handler.includes('admin_export_csv'), 'CSV export is an admin API action')
  assert(handler.includes('admin_confirm_upi_paid'), 'UPI confirm is an admin API action')
  assert(handler.includes('admin_set_online_payment'), 'online payment activation is an admin API action')
  assert(handler.includes('readOnlinePaymentEnabled'), 'online payment flag is read from settings')
  assert(handler.includes('resolveOnlinePaymentEnabled'), 'online flag uses documented resolver')
  assert(handler.includes('findExistingRegistration'), 'existing registration lookup is dedicated')
  assert(handler.includes("where('verifiedMobile', '==', mobile10)"), 'lookup falls back to verified mobile')
  assert(handler.includes('isRestorableRegistration'), 'session restores completed registrations')
  assert(handler.includes('resolvePublicPaymentChoice'), 'submit resolves paymentChoice and legacy fields')
  assert(handler.includes("identity.role !== 'administrator'"), 'admin actions require administrator role')
  assert(handler.includes('RAZORPAY_NOT_AVAILABLE'), 'razorpay submit is explicitly unavailable')
  assert(!handler.includes("from 'razorpay'"), 'no razorpay sdk import')
  assert(!handler.includes('checkout.razorpay'), 'no razorpay checkout')
  assert(!handler.includes('twilio'), 'does not invent Twilio')
  assert(!handler.includes('msg91'), 'does not invent SMS provider')
  assert(!handler.includes('allow read: if true'), 'no public firestore open')
  assert(!handler.includes("collection('payments')"), 'no payments collection')
  assert(!handler.includes("collection('upi')"), 'no upi collection')
  assert(!handler.includes("collection('cashCollectors')"), 'no cash collector collection')
  assert(TRAINING_REGISTRATION_SETTINGS_DOC === FIRESTORE_DOCS.trainingRegistration, 'settings doc reuses FIRESTORE_DOCS')
  assert(FIRESTORE_DOCS.trainingRegistration === 'trainingRegistration', 'existing settings collection document')
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
  assert(page.includes('TARBIYATI_IJTEMA_POSTER_SRC'), 'public hero uses approved poster')
  assert(page.includes('object-contain'), 'poster and QR preserve aspect ratio')
  assert(
    page.includes('overflow-hidden rounded-[2rem] bg-white'),
    'poster and registration share one outer card',
  )
  assert(
    !page.includes('rounded-[1.75rem] border border-[#e5e7de] bg-white/95'),
    'registration is not a second independent card',
  )
  assert(
    !page.includes('mt-6 mb-4 flex items-center justify-center gap-2'),
    'step indicators are not a gap between two cards',
  )
  assert(!page.includes('swiper') && !page.includes('carousel'), 'does not invent a carousel')
  assert(!page.includes('Training Gathering'), 'no training gathering in public UI')
  assert(page.includes('Online Payment'), 'online payment choice')
  assert(page.includes('Currently unavailable'), 'online inactive copy')
  assert(page.includes('using UPI'), 'online active UPI copy')
  assert(page.includes('Cash Payment'), 'cash at ijtema gah choice')
  assert(page.includes('at the Ijtema Gah'), 'cash pending copy')
  assert(page.includes('Cash Paid To'), 'cash paid to choice')
  assert(page.includes('Select Person'), 'cash collector select')
  assert(!page.includes('₹100 paid in cash'), 'generic cash paid choice removed')
  assert(page.includes('TARBIYATI_IJTEMA_UPI_QR_SRC'), 'official QR constant used in public UI')
  assert(page.includes('Scan this QR code using another phone'), 'QR is for another-device payment')
  assert(page.includes('TARBIYATI_IJTEMA_UPI_APP_OPTIONS'), 'app-specific UPI choices')
  assert(eventSrc.includes("label: 'Google Pay'"), 'Google Pay same-device choice')
  assert(eventSrc.includes("label: 'PhonePe'"), 'PhonePe same-device choice')
  assert(eventSrc.includes("label: 'Paytm'"), 'Paytm same-device choice')
  assert(page.includes('TARBIYATI_IJTEMA_UPI_QR_FALLBACK_INTRO'), 'QR fallback intro copy')
  assert(page.includes('Opening your UPI app does not complete payment'), 'deep link is not confirmation')
  assert(page.includes('UTR / Transaction Reference Number'), 'UTR field')
  assert(!page.includes('type="file"') && !page.includes("type='file'"), 'no screenshot file input')
  assert(!page.includes('Razorpay / Online Gateway'), 'public UI has no razorpay fourth card')
  assert(!page.includes('Not available yet'), 'old online blocked copy removed')
  assert(page.includes('Acknowledgement'), 'confirmation is an acknowledgement')
  assert(page.includes('registeredName'), 'uses registered name')
  assert(page.includes('Payment method'), 'acknowledgement shows payment method')
  assert(page.includes('Payment status'), 'acknowledgement shows payment status')
  assert(page.includes('trainingPaymentMethodLabel'), 'acknowledgement uses method label')
  assert(page.includes('isRestorableRegistration'), 'OTP restore uses restorable-registration helper')
  assert(page.includes('clearPublicRegistrationServiceWorkers'), 'public page clears stale service workers')
  const labels = read('src/lib/publicRegistration/labels.ts')
  assert(labels.includes("return 'Cash Paid'"), 'historical paid_cash label remains Cash Paid')
  assert(labels.includes("return 'Cash Pending'"), 'cash pending label')
  assert(labels.includes("return 'UPI Pending'"), 'upi pending label')
  assert(labels.includes("return 'UPI Paid'"), 'upi paid label')
  assert(labels.includes('Cash — Pay at Ijtema Gah'), 'cash pending acknowledgement')
  assert(labels.includes('Cash Paid To:'), 'cash paid to acknowledgement')
  assert(labels.includes('Payment verification pending'), 'upi pending acknowledgement')
  assert(labels.includes('UPI Payment — Paid'), 'upi paid acknowledgement')
  assert(!/\breturn 'Paid'\s*$/m.test(labels), 'does not display bare Paid')
  const admin = read('src/components/public-registration/TrainingGatheringAdminPanel.tsx')
  assert(admin.includes('Registered People'), 'admin people list')
  assert(admin.includes('Registered People (Total:'), 'registered people total is prominent')
  assert(admin.includes('Export CSV'), 'admin CSV export button')
  assert(admin.includes('exportTrainingRegistrationCsv'), 'CSV uses admin API')
  assert(admin.includes('Confirm UPI Paid'), 'admin UPI confirm action')
  assert(!admin.includes('Mark Paid'), 'old admin cash mark-paid action is removed')
  assert(admin.includes('Cash Pending'), 'cash pending queue')
  assert(admin.includes('Cash Paid'), 'cash paid queue')
  assert(admin.includes('UPI Pending'), 'upi pending queue')
  assert(admin.includes('UPI Paid'), 'upi paid queue')
  assert(admin.includes('Cash Paid To'), 'admin shows cash collector')
  assert(admin.includes('Enable Online Payment'), 'admin can activate online payment')
  assert(admin.includes('Disable Online Payment'), 'admin can deactivate online payment')
  assert(admin.includes('setTrainingOnlinePaymentEnabled'), 'online toggle uses admin API')
  assert(admin.includes('paymentQueueTitle'), 'payment queues identify people by name')
  assert(admin.includes('matchesRegisteredPeopleSearch'), 'registered people search')
  assert(admin.includes('matchesRegisteredPeopleFilters'), 'registered people filters')
  assert(admin.includes('RegisteredPersonRow'), 'registered people uses compact expandable rows')
  assert(admin.includes('Connected Rukn'), 'compact list shows connected Rukn')
  assert(admin.includes('expandedRegistrationId'), 'only one person expands at a time')
  assert(admin.includes('aria-expanded'), 'person rows are keyboard accessible')
  assert(admin.includes('cash collector'), 'search includes cash collector')
  assert(admin.includes('relatedPeople'), 'rukn drill-down shows connected karkuns')
  assert(admin.includes('byCategory'), 'admin category table')
  assert(admin.includes('ruknOwnRegistered'), 'rukn own registration distinguished')
  assert(admin.includes('Razorpay remains deferred'), 'razorpay unavailable in admin summary')
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
  assert(existsSync(resolve(root, 'public/branding/jih-official-logo.png')), 'official logo asset present')
  assert(existsSync(resolve(root, 'public/branding/tarbiyati-ijtema-upi-qr.jpeg')), 'official UPI QR asset present')
  assert(existsSync(resolve(root, 'public/branding/tarbiyati-ijtema-2026-poster.jpg')), 'approved poster asset present')
  assert(TARBIYATI_IJTEMA_UPI_QR_SRC === '/branding/tarbiyati-ijtema-upi-qr.jpeg', 'QR public path')
  assert(TARBIYATI_IJTEMA_POSTER_SRC === '/branding/tarbiyati-ijtema-2026-poster.jpg', 'poster public path')
  assert(
    TARBIYATI_IJTEMA_POSTER_ALT.includes('تربیتی اجتماع'),
    'poster alt describes the approved event',
  )
  const logo = read('src/components/public-registration/JihLogoMark.tsx')
  assert(logo.includes('/branding/jih-official-logo.png'), 'uses official logo path')
  assert(logo.includes('<img'), 'renders as static image')
  assert(!logo.includes('<svg'), 'does not use placeholder svg')
  const client = read('src/lib/publicRegistration/client.ts')
  assert(client.includes("'admin_export_csv'"), 'export action is not public')
  assert(client.includes("'admin_set_online_payment'"), 'online activation is not public')
  assert(client.includes('paymentChoice'), 'public submit sends paymentChoice')
  assert(client.includes('cashPaidToId'), 'public submit sends cash collector id')
  assert(!client.includes('markTrainingRegistrationCashPaid'), 'client has no cash mark-paid helper')
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
    cashPaidToId: null,
    cashPaidToName: null,
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
  const paidToCollector = sampleRegistration({
    id: formatRegistrationId('9000000002'),
    personId: 'k-b',
    verifiedMobile: '9000000002',
    fullName: 'Person B',
    paymentStatus: 'paid_cash',
    cashPaidToId: 'r-1',
    cashPaidToName: 'Rukn One',
  })
  const historicalPaid = sampleRegistration({
    id: formatRegistrationId('9000000008'),
    personId: 'k-hist',
    verifiedMobile: '9000000008',
    fullName: 'Historical Paid',
    paymentStatus: 'paid_cash',
  })
  const input = {
    karkuns: [
      { id: 'k-a', name: 'Person A', mobile: '9000000001', gender: 'Male' },
      { id: 'k-b', name: 'Person B', mobile: '9000000002', gender: 'Female' },
      { id: 'k-c', name: 'Person C', mobile: '9000000003', gender: 'Male' },
      { id: 'k-hist', name: 'Historical Paid', mobile: '9000000008', gender: 'Male' },
    ],
    rukns: [{ id: 'r-1', name: 'Rukn One', status: 'active' }],
    connections: [
      { ruknId: 'r-1', karkunId: 'k-a', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-b', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-c', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-unrelated-skip', status: 'Inactive' },
    ],
    registrations: [pending, paidToCollector, historicalPaid],
    publicRequests: [],
  }
  const view = buildTrainingRegistrationAdminView(input)
  assert(view.summary.registered === 3, 'registered includes cash pending and both cash paid records')
  assert(view.summary.cashPending === 1, 'cash pending count')
  assert(view.summary.cashPaid === 2, 'cash paid count includes historical records')
  assert(view.registrations.some((row) => row.id === pending.id), 'pending person in Registered People')
  assert(view.registrations.some((row) => row.id === paidToCollector.id), 'paid person in Registered People')
  assert(view.registrations.some((row) => row.id === historicalPaid.id), 'historical paid_cash remains in Registered People')
  const historicalRow = view.registrations.find((row) => row.id === historicalPaid.id)
  assert(historicalRow?.paymentStatus === 'paid_cash', 'historical paid_cash remains readable')
  assert(!historicalRow?.cashPaidToName, 'does not invent a historical collector')
  assert(
    trainingAcknowledgementPaymentLabel('paid_cash', historicalRow?.cashPaidToName) === 'Cash Paid',
    'historical paid_cash acknowledgement has no invented collector',
  )
  assert(
    trainingAcknowledgementPaymentLabel('paid_cash', 'Rukn One') === 'Cash Paid To: Rukn One',
    'cash paid to acknowledgement names the collector',
  )
  assert(
    trainingAcknowledgementPaymentLabel('cash_pending') === 'Cash — Pay at Ijtema Gah',
    'cash at ijtema gah acknowledgement',
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
  assert(hero.includes('View Registration Progress'), 'progress detail CTA')
  assert(hero.includes('Connected Karkuns'), 'connected count label')
  assert(hero.includes('Not Registered'), 'not registered count')
  assert(hero.includes('My Registration'), 'own registration is separate')
  assert(hero.includes('No connected Karkuns yet.'), 'empty connected state')
  assert(hero.includes('Retry'), 'error retry')
  assert(!hero.includes('Cash Pending'), 'hero has no cash pending')
  assert(!hero.includes('UPI Pending'), 'hero has no upi pending')
  assert(!hero.includes('UTR'), 'hero has no UTR')
  assert(PUBLIC_TRAINING_REGISTRATION_URL === 'https://registration.jihbasavakalyan.org/', 'opens official host')
  assert(read('src/pages/rukn/RuknHomePage.tsx').includes('<TarbiyatiIjtemaRuknHero'), 'renders on Rukn Home')
  assert(read('src/routes/AppRouter.tsx').includes('tarbiyati-ijtema'), 'progress route registered')
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
    cashPaidToId: 'r-1',
    cashPaidToName: 'Abdul Qadir',
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
  const fatima = view.registrations.find((row) => row.fullName === 'Fatima')
  assert(Boolean(fatima), 'fatima present')
  assert(matchesRegisteredPeopleSearch(fatima!, 'Abdul Qadir'), 'search by cash collector')
  assert(fatima?.cashPaidToId === 'r-1', 'cash collector id stored')
  assert(fatima?.cashPaidToName === 'Abdul Qadir', 'cash collector name stored')
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
  assert(csv.includes('Abdul Qadir'), 'csv includes cashPaidTo name')
  assert(csv.includes('Cash Paid To'), 'csv has cashPaidTo column')
  assert(!csv.toLowerCase().includes('otp'), 'csv does not export otp')
  assert(!csv.toLowerCase().includes('password'), 'csv does not export password')
  assert(!csv.toLowerCase().includes('bearer'), 'csv does not export bearer token')
  const filteredCsv = buildTrainingRegistrationCsv(view.registrations)
  assert(filteredCsv.split(/\r?\n/).filter((line) => line.includes('TG260913-')).length === 4, 'csv is the full dataset')
}

function testRegisteredPeopleCompactList(): void {
  const admin = read('src/components/public-registration/TrainingGatheringAdminPanel.tsx')
  const tracking = read('src/lib/publicRegistration/adminTracking.ts')
  const types = read('src/lib/publicRegistration/types.ts')
  const handler = read('src/server/trainingRegistration/handler.ts')
  const rules = read('firestore.rules')
  const collections = read('src/repositories/firestore/collections.ts')

  assert(admin.includes('function RegisteredPersonRow'), 'compact row component exists')
  assert(admin.includes('function connectedRuknLabel'), 'connected Rukn uses existing names helper')
  assert(admin.includes('row.ruknNames'), 'connected Rukn comes from existing ruknNames')
  assert(tracking.includes('resolveRuknNames'), 'Rukn names still resolved from connections / ruknId')
  assert(tracking.includes('ruknIdsByKarkunId'), 'active connections still populate connected Rukn')
  assert(admin.includes('>Name</span>'), 'compact column Name')
  assert(admin.includes('>Mobile</span>'), 'compact column Mobile')
  assert(admin.includes('>Connected Rukn</span>'), 'compact column Connected Rukn')
  assert(admin.includes("useState('')"), 'rows start collapsed')
  assert(admin.includes('expandedRegistrationId === row.id'), 'details open only for selected person')
  assert(admin.includes("current === row.id ? '' : row.id"), 'opening another person closes the previous row')
  assert(admin.includes('aria-expanded={expanded}'), 'expanded state is exposed to assistive tech')
  assert(admin.includes('type="button"'), 'rows use buttons not clickable divs')
  assert(admin.includes('sm:hidden'), 'mobile stacked compact row exists')
  assert(admin.includes('sm:grid'), 'desktop compact columns exist')

  const compact = admin.slice(
    admin.indexOf('function RegisteredPersonRow'),
    admin.indexOf('function PersonDetail'),
  )
  assert(compact.includes('connectedRuknLabel(row)'), 'compact row shows connected Rukn')
  assert(compact.includes('row.fullName'), 'compact row shows name')
  assert(compact.includes('row.verifiedMobile'), 'compact row shows mobile')
  assert(!compact.includes('trainingPaymentStatusLabel'), 'compact row hides payment status')
  assert(!compact.includes('trainingPaymentMethodLabel'), 'compact row hides payment method')
  assert(!compact.includes('row.utr'), 'compact row hides UTR')
  assert(!compact.includes('paymentVerifiedAt'), 'compact row hides payment verified at')
  assert(!compact.includes('cashPaidToName'), 'compact row hides cash collector')

  const detail = admin.slice(admin.indexOf('function PersonDetail'), admin.indexOf('function FilterSelect'))
  assert(detail.includes('Full Name'), 'expanded keeps full name')
  assert(detail.includes('Gender'), 'expanded keeps gender')
  assert(detail.includes('Category'), 'expanded keeps category')
  assert(detail.includes('Mobile'), 'expanded keeps mobile')
  assert(detail.includes('Registration ID'), 'expanded keeps registration id')
  assert(detail.includes('Registration Date/Time'), 'expanded keeps registration datetime')
  assert(detail.includes('Rukn Name'), 'expanded keeps rukn name')
  assert(detail.includes('Rukn ID'), 'expanded keeps rukn id')
  assert(detail.includes('Person ID'), 'expanded keeps person id')
  assert(detail.includes('Registration Status'), 'expanded keeps registration status')
  assert(detail.includes('Payment Method'), 'expanded keeps payment method')
  assert(detail.includes('Payment Status'), 'expanded keeps payment status')
  assert(detail.includes('Cash Paid To'), 'expanded keeps cash paid to')
  assert(detail.includes('UTR'), 'expanded keeps UTR')
  assert(detail.includes('Payment Submitted At'), 'expanded keeps payment submitted at')
  assert(detail.includes('Payment Verified At'), 'expanded keeps payment verified at')
  assert(detail.includes('Payment Verified By'), 'expanded keeps payment verified by')

  assert(admin.includes('Registered People (Total: {summary.registered})'), 'registered count stays summary.registered')
  assert(admin.includes('matchesRegisteredPeopleSearch'), 'search remains')
  assert(admin.includes('matchesRegisteredPeopleFilters'), 'filters remain')
  assert(admin.includes('exportTrainingRegistrationCsv'), 'CSV export remains')
  assert(admin.includes('displayedPeople'), 'filters still change only the displayed list')
  assert(types.includes('ruknNames: string[]'), 'admin row Rukn names type unchanged')
  assert(handler.includes("const COLLECTION = 'trainingRegistrations'"), 'no new collection in handler')
  assert(!collections.includes('registeredPeople'), 'no new registered-people collection')
  assert(rules.includes('allow create, update, delete: if false'), 'registration write rules unchanged')
  assert(rules.includes('allow read: if isAdministrator()'), 'admin read remains gated')
}

function testNoNewInfrastructure(): void {
  const handler = read('src/server/trainingRegistration/handler.ts')
  const collections = read('src/repositories/firestore/collections.ts')
  assert(collections.includes("trainingRegistrations: 'trainingRegistrations'"), 'reuses trainingRegistrations')
  assert(collections.includes("trainingRegistration: 'trainingRegistration'"), 'reuses settings document id')
  assert(!collections.includes('upiPayments'), 'no upi payments collection constant')
  assert(!collections.includes('cashCollectors'), 'no cash collector collection constant')
  assert(!handler.includes('firebase/storage'), 'does not invent storage upload')
  assert(!handler.includes('uploadBytes'), 'does not invent screenshot upload')
  const page = read('src/pages/public/TrainingRegistrationPage.tsx')
  assert(page.includes('object-contain'), 'QR preserves aspect ratio')
  assert(!page.includes('object-cover'), 'QR is not cropped with object-cover')
}

function testCashCollectorsFromRuknMaster(): void {
  const rukns = [
    { id: 'r-active', name: 'Md Aslam', status: 'active' },
    { id: 'r-archived', name: 'Archived Rukn', status: 'active', isArchived: true },
    { id: 'r-inactive', name: 'Inactive Rukn', status: 'inactive' },
  ]
  const collectors = listCashCollectors(rukns)
  assert(collectors.length === 1, 'only active non-archived rukns are collectors')
  assert(collectors[0]?.id === 'r-active' && collectors[0]?.name === 'Md Aslam', 'collector identity from rukn master')
  const missing = resolveCashCollector(rukns, '')
  assert(!missing.ok, 'collector id required')
  const invalid = resolveCashCollector(rukns, 'r-archived')
  assert(!invalid.ok, 'archived rukn cannot be selected')
  const valid = resolveCashCollector(rukns, 'r-active')
  assert(valid.ok, 'active rukn can be selected')
  if (valid.ok) {
    assert(valid.id === 'r-active' && valid.name === 'Md Aslam', 'stores both collector id and name')
  }
}

function testOnlinePaymentSettingDefault(): void {
  assert(resolveOnlinePaymentEnabled({ exists: false, data: null }) === true, '3 missing settings document defaults UPI on')
  assert(resolveOnlinePaymentEnabled({ exists: true, data: {} }) === true, 'missing flag on existing doc defaults UPI on')
  assert(resolveOnlinePaymentEnabled({ exists: true, data: { onlinePaymentEnabled: true } }) === true, '2 UPI enabled')
  assert(resolveOnlinePaymentEnabled({ exists: true, data: { onlinePaymentEnabled: false } }) === false, '1 UPI disabled')
  const page = read('src/pages/public/TrainingRegistrationPage.tsx')
  assert(page.includes('onlinePaymentEnabled ?'), 'UPI option visibility follows setting')
  assert(page.includes('Currently unavailable'), 'disabled UPI is not selectable')
  assert(page.includes('using UPI'), 'enabled UPI copy is present')
}

function testMobileNormalizationAndExistingRestore(): void {
  assert(normalizeTrainingMobile('9035551913') === '9035551913', '10 digit mobile')
  assert(normalizeTrainingMobile('+91 9035551913') === '9035551913', '+91 with space')
  assert(normalizeTrainingMobile('919035551913') === '9035551913', '91 prefix')
  assert(normalizeTrainingMobile('  9035551913  ') === '9035551913', 'whitespace')
  assert(normalizeTrainingMobile('09035551913') === '9035551913', 'leading zero')
  const existing = sampleRegistration({
    id: formatRegistrationId('9035551913'),
    verifiedMobile: '9035551913',
    fullName: 'Yaseen Ameen',
    paymentStatus: 'cash_pending',
  })
  assert(isRestorableRegistration(existing), '10 existing complete registration is restorable')
  assert(!isRestorableRegistration(null), 'missing registration is not restorable')
  assert(!isRestorableRegistration({ ...existing, id: '', registrationStatus: 'complete' }), 'empty id is not restorable')
  const view = buildTrainingRegistrationAdminView({
    karkuns: [{ id: 'k-y', name: 'Yaseen Ameen', mobile: '9035551913', gender: 'Male' }],
    rukns: [],
    connections: [],
    registrations: [existing, existing],
    publicRequests: [],
  })
  assert(view.registrations.filter((row) => row.verifiedMobile === '9035551913').length === 2, 'builder reads both rows if present')
  assert(formatRegistrationId('9035551913') === formatRegistrationId(normalizeTrainingMobile('+919035551913')), '11 duplicate completed registration uses the same document id')
}

function testLegacySubmitMapping(): void {
  const upi = resolvePublicPaymentChoice({ paymentMethod: 'upi' })
  assert(upi.ok && upi.choice === 'online', 'legacy UPI submit maps to online choice')
  const cashPending = resolvePublicPaymentChoice({ paymentMethod: 'cash', paymentStatus: 'cash_pending' })
  assert(cashPending.ok && cashPending.choice === 'cash_at_ijtema', 'legacy cash pending maps to pay at ijtema gah')
  const cashPaid = resolvePublicPaymentChoice({ paymentMethod: 'cash', paymentStatus: 'paid_cash' })
  assert(!cashPaid.ok, 'legacy generic cash paid requires collector instead of silent paid_cash')
  const named = resolvePublicPaymentChoice({ paymentChoice: 'cash_paid_to' })
  assert(named.ok && named.choice === 'cash_paid_to', '8 cash paid to requires the new choice')
}

function testPublicHostServiceWorkerEscape(): void {
  const vite = read('vite.config.ts')
  assert(vite.includes('skipWaiting: true'), 'new service worker activates immediately')
  assert(vite.includes('clientsClaim: true'), 'new service worker claims open clients')
  assert(vite.includes('injectRegister: false'), 'public host does not auto-register the app PWA')
  const cleanup = read('src/lib/publicRegistration/swCleanup.ts')
  assert(cleanup.includes('unregister()'), 'cleanup unregisters controlling workers')
}

function testFinalPaymentSemantics(): void {
  const page = read('src/pages/public/TrainingRegistrationPage.tsx')
  const handler = read('src/server/trainingRegistration/handler.ts')
  const admin = read('src/components/public-registration/TrainingGatheringAdminPanel.tsx')
  const tracking = read('src/lib/publicRegistration/adminTracking.ts')
  assert(page.includes("setPaymentChoice('online')"), '1 online inactive/active share one online choice')
  assert(page.includes('Currently unavailable'), '1 online inactive copy')
  assert(page.includes('using UPI'), '2 online active copy')
  assert(page.includes('TARBIYATI_IJTEMA_UPI_QR_SRC'), '3 UPI QR appears when online selected')
  assert(page.includes("paymentChoice === 'online' && !utr.trim()"), '4 UTR required for online')
  assert(handler.includes("paymentStatus = 'upi_pending'"), '5 UPI creates upi_pending')
  assert(handler.includes('applyConfirmUpiPaid'), '6 admin confirm reuses paid_upi update')
  assert(tracking.includes("paymentStatus: 'paid_upi'"), '6 confirm changes upi_pending to paid_upi')
  assert(handler.includes("paymentStatus = 'cash_pending'"), '7 cash at ijtema gah creates cash_pending')
  assert(handler.includes("paymentStatus = 'paid_cash'"), '8 cash paid to creates paid_cash')
  assert(handler.includes('cashPaidToId = collector.id'), '9 cash collector id stored')
  assert(handler.includes('cashPaidToName = collector.name'), '9 cash collector name stored')
  assert(page.includes('registration.cashPaidToName'), '10 collector appears in acknowledgement')
  assert(admin.includes('row.cashPaidToName'), '11 collector appears in admin')
  assert(tracking.includes('isRegisteredForEvent'), '12/13 payment change does not define membership')
  assert(!handler.includes('applyMarkCashPaid'), 'no cash mark-paid mutation')
  assert(page.includes('useState<TrainingPublicPaymentChoice | null>'), 'exactly three public choices typed')
  assert(!page.includes("setPaymentChoice('razorpay')"), '20 no public razorpay choice')
  assert(handler.includes("identity.role !== 'administrator'"), '16/17 admin-only activation and UPI confirm')
  assert(handler.includes('admin_set_online_payment'), '16 admin-only activation action')
  assert(handler.includes('admin_confirm_upi_paid'), '17 admin-only UPI confirmation action')
}

function assertEncodedUpiQuery(uri: string, label: string): void {
  const query = uri.slice(uri.indexOf('?') + 1)
  const pairs = query.split('&').map((part) => {
    const eq = part.indexOf('=')
    return [part.slice(0, eq), part.slice(eq + 1)] as const
  })
  const params = Object.fromEntries(pairs)
  assert(params.pa === '60741256000495@cnrb', `${label} VPA query is exact`)
  assert(params.pn === encodeURIComponent('JAMAATEISLAMI HIND'), `${label} payee is URL encoded`)
  assert(params.am === '100', `${label} amount is 100`)
  assert(params.cu === 'INR', `${label} currency is INR`)
  assert(!query.includes(' '), `${label} has no raw spaces`)
  assert(query === buildTarbiyatiIjtemaUpiQuery(), `${label} uses shared encoded query`)
  for (const [key, encoded] of pairs) {
    const expected = encodeTarbiyatiIjtemaUpiQueryValue(
      key === 'pa'
        ? TARBIYATI_IJTEMA_UPI_VPA
        : key === 'pn'
          ? TARBIYATI_IJTEMA_UPI_PAYEE_NAME
          : key === 'am'
            ? '100'
            : TARBIYATI_IJTEMA_UPI_CURRENCY,
    )
    assert(encoded === expected, `${label} ${key} is correctly URL encoded`)
  }
}

function testUpiDeepLinkSameDevicePay(): void {
  assert(TARBIYATI_IJTEMA_UPI_VPA === '60741256000495@cnrb', '1 VPA is exact Canara ID')
  assert(TARBIYATI_IJTEMA_UPI_PAYEE_NAME === 'JAMAATEISLAMI HIND', '2 Payee is exact')
  assert(TRAINING_GATHERING_EVENT.feeInr === 100, '3 amount is exactly ₹100')
  assert(TARBIYATI_IJTEMA_UPI_CURRENCY === 'INR', '4 currency is INR')

  const gpayUri = buildTarbiyatiIjtemaUpiAppUri('gpay')
  const phonePeUri = buildTarbiyatiIjtemaUpiAppUri('phonepe')
  const paytmUri = buildTarbiyatiIjtemaUpiAppUri('paytm')
  const androidFallbackUri = buildTarbiyatiIjtemaUpiPayUri()

  assert(gpayUri.startsWith('gpay://upi/pay?'), '5 Google Pay URI scheme')
  assert(phonePeUri.startsWith('phonepe://upi/pay?'), '6 PhonePe URI scheme')
  assert(paytmUri.startsWith('paytm://upi/pay?'), '7 Paytm URI scheme')
  assertEncodedUpiQuery(gpayUri, '8 Google Pay')
  assertEncodedUpiQuery(phonePeUri, '8 PhonePe')
  assertEncodedUpiQuery(paytmUri, '8 Paytm')
  assertEncodedUpiQuery(androidFallbackUri, '8 Android generic fallback')
  assert(
    gpayUri === `gpay://upi/pay?pa=60741256000495@cnrb&pn=${encodeURIComponent('JAMAATEISLAMI HIND')}&am=100&cu=INR`,
    '5 exact Google Pay deep link',
  )
  assert(
    phonePeUri === `phonepe://upi/pay?pa=60741256000495@cnrb&pn=${encodeURIComponent('JAMAATEISLAMI HIND')}&am=100&cu=INR`,
    '6 exact PhonePe deep link',
  )
  assert(
    paytmUri === `paytm://upi/pay?pa=60741256000495@cnrb&pn=${encodeURIComponent('JAMAATEISLAMI HIND')}&am=100&cu=INR`,
    '7 exact Paytm deep link',
  )
  assert(
    androidFallbackUri === `upi://pay?pa=60741256000495@cnrb&pn=${encodeURIComponent('JAMAATEISLAMI HIND')}&am=100&cu=INR`,
    'Android generic fallback remains standard NPCI intent',
  )
  assert(!androidFallbackUri.includes('am=0'), 'does not copy open-amount am=0 from the static QR')

  assert(detectTarbiyatiUpiLaunchPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') === 'desktop', 'desktop platform')
  assert(detectTarbiyatiUpiLaunchPlatform('Mozilla/5.0 (Linux; Android 14)') === 'android', 'Android platform')
  assert(
    detectTarbiyatiUpiLaunchPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)') === 'ios',
    'iPhone platform',
  )
  assert(!isLikelyMobileUpiClient('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'desktop is not a UPI client')
  assert(isLikelyMobileUpiClient('Mozilla/5.0 (Linux; Android 14)'), 'Android is a UPI client')
  assert(isLikelyMobileUpiClient('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'iPhone is a UPI client')

  const page = read('src/pages/public/TrainingRegistrationPage.tsx')
  const eventSrc = read('src/lib/publicRegistration/event.ts')
  const handler = read('src/server/trainingRegistration/handler.ts')
  const admin = read('src/components/public-registration/TrainingGatheringAdminPanel.tsx')
  const rules = read('firestore.rules')
  const collections = read('src/repositories/firestore/collections.ts')
  assert(TARBIYATI_IJTEMA_UPI_APP_OPTIONS.map((app) => app.label).join(',') === 'Google Pay,PhonePe,Paytm', 'app labels')
  assert(page.includes('TARBIYATI_IJTEMA_UPI_APP_OPTIONS'), 'Google Pay / PhonePe / Paytm choices')
  assert(eventSrc.includes("label: 'Google Pay'"), 'Google Pay button label')
  assert(eventSrc.includes("label: 'PhonePe'"), 'PhonePe button label')
  assert(eventSrc.includes("label: 'Paytm'"), 'Paytm button label')
  assert(page.includes('buildTarbiyatiIjtemaUpiAppUri'), 'page uses app-specific UPI builders')
  assert(page.includes('href={upiAppUris[app.id]}'), 'iOS/Android primary buttons use app-specific hrefs')
  assert(page.includes("upiPlatform !== 'desktop'"), 'app-launch buttons are not shown on desktop')
  assert(page.includes("upiPlatform === 'android'"), '9 generic UPI is Android-gated')
  assert(page.includes('href={androidGenericUpiUri}'), 'Android retains generic UPI fallback href')
  assert(page.includes('buildTarbiyatiIjtemaUpiPayUri'), 'Android fallback still uses generic NPCI URI')
  assert(!page.includes('href={upiPayUri}'), '9 generic upi://pay is not the primary iPhone button')
  assert(!page.includes('href={`upi://pay'), '9 no hardcoded generic UPI href on iPhone')
  assert(!page.includes("href={'upi://pay"), '9 no string generic UPI href on iPhone')
  assert(page.includes('TARBIYATI_IJTEMA_UPI_QR_SRC'), '10 QR remains present')
  assert(page.includes('Scan this QR code using another phone'), '10 QR remains the other-device option')
  assert(TARBIYATI_IJTEMA_UPI_QR_SRC === '/branding/tarbiyati-ijtema-upi-qr.jpeg', '10 QR public path')
  assert(TARBIYATI_IJTEMA_UPI_QR_FALLBACK_INTRO.includes("Don't have one of these apps"), 'QR fallback intro')
  assert(page.includes('TARBIYATI_IJTEMA_UPI_QR_FALLBACK_INTRO'), 'QR fallback intro used in UI')
  assert(page.includes('launchUpiPayment'), 'launch handler is dedicated')
  const launchFn = page.slice(page.indexOf('const launchUpiPayment'), page.indexOf('const changeMobile'))
  assert(launchFn.includes('detectTarbiyatiUpiLaunchPlatform'), 'launch checks platform')
  assert(!launchFn.includes('submitPublicRegistration'), '7 launch does not submit registration')
  assert(!launchFn.includes('completeRegistration'), '7 launch does not complete registration')
  assert(!launchFn.includes('paid_upi'), '13 launch does not mark paid_upi')
  assert(!launchFn.includes('upi_pending'), '7 launch does not write payment status')
  assert(!page.includes('setPaymentStatus'), '13 public page does not set payment status')
  assert(page.includes('Opening your UPI app does not complete payment'), 'copy states deep link is not confirmation')
  assert(page.includes('confirm registration'), 'copy states app launch does not confirm registration')
  assert(page.includes('TARBIYATI_IJTEMA_UPI_DESKTOP_MESSAGE'), 'desktop fallback remains QR-friendly')
  assert(page.includes('TARBIYATI_IJTEMA_UPI_NO_APP_MESSAGE'), 'unavailable-app fallback message is used')
  assert(
    TARBIYATI_IJTEMA_UPI_NO_APP_MESSAGE ===
      'This payment app is not available on this device. Please use another payment option or scan the QR code using another phone.',
    'unavailable-app copy',
  )
  assert(page.includes("paymentChoice === 'online' && !utr.trim()"), '11 UTR remains mandatory in UI')
  assert(handler.includes('sanitizeUtr'), '11 UTR remains mandatory server-side')
  assert(handler.includes("paymentStatus = 'upi_pending'"), '12 submit stores upi_pending')
  const onlineSubmit = handler.slice(
    handler.indexOf('const sanitized = sanitizeUtr(utrRaw)'),
    handler.indexOf("else if (paymentChoice === 'cash_at_ijtema')"),
  )
  assert(onlineSubmit.includes("paymentMethod = 'upi'"), '12 online stores method upi')
  assert(onlineSubmit.includes("paymentStatus = 'upi_pending'"), '12 online stores upi_pending')
  assert(!onlineSubmit.includes('paid_upi'), '13 online submit does not mark paid_upi')
  assert(handler.includes('applyConfirmUpiPaid'), '14 admin confirm is the paid_upi path')
  const tracking = read('src/lib/publicRegistration/adminTracking.ts')
  assert(tracking.includes("paymentStatus: 'paid_upi'"), '14 confirm changes only paymentStatus to paid_upi')
  assert(handler.includes('paymentVerifiedAt: current.paymentVerifiedAt ?? timestamp'), '14 records paymentVerifiedAt')
  assert(handler.includes('paymentVerifiedBy: current.paymentVerifiedBy ?? verifiedBy'), '14 records paymentVerifiedBy')
  assert(admin.includes('Confirm UPI Paid'), '14 admin confirm action unchanged')
  assert(page.includes("setPaymentChoice('cash_at_ijtema')"), '16 Cash at Ijtema Gah remains')
  assert(page.includes('at the Ijtema Gah'), '16 Cash at Ijtema Gah copy remains')
  assert(page.includes("setPaymentChoice('cash_paid_to')"), '17 Cash Paid To remains')
  assert(page.includes('isRestorableRegistration'), '18 same-mobile restore remains')
  assert(admin.includes('Registered People'), '20 Registered People remains')
  const { upiPending, input } = mixedPaymentFixture()
  const view = buildTrainingRegistrationAdminView(input)
  assert(view.registrations.some((row) => row.id === upiPending.id), 'UPI pending person remains in Registered People')
  const csv = buildTrainingRegistrationCsv(view.registrations)
  assert(csv.includes('UTR9000000003'), '20 CSV retains UTR')
  assert(csv.includes('UPI Pending') || csv.includes('upi_pending'), '20 CSV retains payment status')
  assert(csv.includes('UPI'), '20 CSV retains payment method')
  assert(!page.toLowerCase().includes('razorpay'), 'no Razorpay in public page')
  assert(!handler.includes("from 'razorpay'"), 'no Razorpay SDK')
  assert(!eventSrc.toLowerCase().includes('razorpay'), 'no Razorpay in event config')
  assert(rules.includes('match /trainingRegistrations/{registrationId}'), 'registration rules remain')
  assert(rules.includes('allow create, update, delete: if false'), 'client writes remain denied')
  assert(rules.includes('allow read: if isAdministrator()'), 'admin read remains gated')
  assert(!collections.includes('upiPayments'), 'no new UPI collection')
  assert(trainingPaymentMethodLabel('upi') === 'UPI', 'acknowledgement payment method is UPI')
  assert(
    trainingAcknowledgementPaymentLabel('upi_pending') === 'Payment verification pending',
    'acknowledgement payment status is verification pending',
  )
  assert(eventSrc.includes("gpay: 'gpay://upi/pay'"), 'Google Pay scheme constant')
  assert(eventSrc.includes("phonepe: 'phonepe://upi/pay'"), 'PhonePe scheme constant')
  assert(eventSrc.includes("paytm: 'paytm://upi/pay'"), 'Paytm scheme constant')
}

function testRuknDashboardRegistrationProgress(): void {
  const ownRuknReg = sampleRegistration({
    id: formatRegistrationId('9000000000'),
    ruknId: 'r-1',
    verifiedMobile: '9000000000',
    fullName: 'Scoped Rukn',
    paymentMethod: 'upi',
    paymentStatus: 'paid_upi',
    utr: 'UTR-RUKN-OWN',
    cashPaidToId: 'admin',
    cashPaidToName: 'Should not leak',
    paymentVerifiedAt: '2026-08-25T11:00:00.000Z',
    paymentVerifiedBy: 'admin-uid',
  })
  const cashPending = sampleRegistration({
    id: formatRegistrationId('9000000001'),
    personId: 'k-1',
    verifiedMobile: '9000000001',
    fullName: 'Cash Pending Karkun',
    paymentStatus: 'cash_pending',
  })
  const paidCash = sampleRegistration({
    id: formatRegistrationId('9000000002'),
    personId: 'k-2',
    verifiedMobile: '9000000002',
    fullName: 'Paid Cash Karkun',
    paymentStatus: 'paid_cash',
    cashPaidToId: 'r-1',
    cashPaidToName: 'Scoped Rukn',
  })
  const upiPending = sampleRegistration({
    id: formatRegistrationId('9000000003'),
    personId: 'k-3',
    verifiedMobile: '9000000003',
    fullName: 'UPI Pending Karkun',
    paymentMethod: 'upi',
    paymentStatus: 'upi_pending',
    utr: 'UTR9000000003',
  })
  const paidUpi = sampleRegistration({
    id: formatRegistrationId('9000000004'),
    personId: 'k-4',
    verifiedMobile: '9000000004',
    fullName: 'Paid UPI Karkun',
    paymentMethod: 'upi',
    paymentStatus: 'paid_upi',
    utr: 'UTR9000000004',
  })
  const otherRuknReg = sampleRegistration({
    id: formatRegistrationId('9000000099'),
    personId: 'k-other',
    verifiedMobile: '9000000099',
    fullName: 'Other Rukn Karkun',
    paymentStatus: 'paid_cash',
  })
  const inactiveReg = sampleRegistration({
    id: formatRegistrationId('9000000088'),
    personId: 'k-inactive',
    verifiedMobile: '9000000088',
    fullName: 'Inactive Connected',
    paymentStatus: 'cash_pending',
  })
  const unrelatedReg = sampleRegistration({
    id: formatRegistrationId('9000000077'),
    personId: 'k-unrelated',
    verifiedMobile: '9000000077',
    fullName: 'Unrelated Karkun',
    paymentStatus: 'paid_upi',
    paymentMethod: 'upi',
  })
  const input = {
    ruknId: 'r-1',
    rukn: { id: 'r-1', name: 'Scoped Rukn', status: 'active', mobile: '9000000000', gender: 'Male' },
    karkuns: [
      { id: 'k-1', name: 'Cash Pending Karkun', mobile: '9000000001', gender: 'Male', category: 'Karkun' },
      { id: 'k-2', name: 'Paid Cash Karkun', mobile: '9000000002', gender: 'Female', category: 'Muttafiq' },
      { id: 'k-3', name: 'UPI Pending Karkun', mobile: '9000000003', gender: 'Female', category: 'Karkun' },
      { id: 'k-4', name: 'Paid UPI Karkun', mobile: '9000000004', gender: 'Male', category: 'Karkun' },
      { id: 'k-5', name: 'Open One', mobile: '9000000005', gender: 'Male', category: 'Karkun' },
      { id: 'k-6', name: 'Open Two', mobile: '9000000006', gender: 'Female', category: 'Karkun' },
      { id: 'k-7', name: 'Open Three', mobile: '9000000007', gender: 'Male', category: 'Karkun' },
      { id: 'k-8', name: 'Open Four', mobile: '9000000008', gender: 'Female', category: 'Muttafiq' },
      { id: 'k-inactive', name: 'Inactive Connected', mobile: '9000000088', gender: 'Male', category: 'Karkun' },
      { id: 'k-other', name: 'Other Rukn Karkun', mobile: '9000000099', gender: 'Male', category: 'Karkun' },
      { id: 'k-unrelated', name: 'Unrelated Karkun', mobile: '9000000077', gender: 'Male', category: 'Karkun' },
    ],
    connections: [
      { ruknId: 'r-1', karkunId: 'k-1', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-2', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-3', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-4', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-5', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-6', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-7', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-8', status: 'Active' },
      { ruknId: 'r-1', karkunId: 'k-inactive', status: 'Inactive' },
      { ruknId: 'r-2', karkunId: 'k-other', status: 'Active' },
    ],
    registrations: [
      ownRuknReg,
      cashPending,
      paidCash,
      upiPending,
      paidUpi,
      otherRuknReg,
      inactiveReg,
      unrelatedReg,
    ],
  }

  const progress = buildTrainingRegistrationRuknProgress(input)
  assert(progress.ownRegistered === true, '1 rukn sees own registration status')
  assert(progress.connectedCount === 8, '2 connected karkun count')
  assert(progress.registeredCount === 4, '3 registered count is payment-independent')
  assert(progress.notRegisteredCount === 4, '4 not registered count')
  assert(
    progress.registeredCount + progress.notRegisteredCount === progress.connectedCount,
    '5 registered + not registered = connected',
  )
  assert(progress.karkuns.find((row) => row.karkunId === 'k-1')?.registered === true, '7 cash pending still registered')
  assert(progress.karkuns.find((row) => row.karkunId === 'k-2')?.registered === true, '9 paid cash still registered')
  assert(progress.karkuns.find((row) => row.karkunId === 'k-3')?.registered === true, '8 upi pending still registered')
  assert(progress.karkuns.find((row) => row.karkunId === 'k-4')?.registered === true, '10 paid upi still registered')
  assert(
    ['k-5', 'k-6', 'k-7', 'k-8'].every((id) => progress.karkuns.find((row) => row.karkunId === id)?.registered === false),
    '6 payment does not invent registration; open people stay not registered',
  )
  assert(!progress.karkuns.some((row) => row.karkunId === 'k-unrelated'), '11 unrelated karkuns excluded')
  assert(!progress.karkuns.some((row) => row.karkunId === 'k-inactive'), '12 inactive connections excluded')
  assert(!progress.karkuns.some((row) => row.karkunId === 'r-1' || row.mobile === '9000000000'), '13 own registration not counted as connected')
  assert(!progress.karkuns.some((row) => row.karkunId === 'k-other'), '14 cannot see another rukn karkuns')
  assert(progress.karkuns.length === 8, '15 complete dataset is not returned; only scoped people')
  const leaked = forbiddenFieldsInRuknProgress(progress)
  assert(leaked.length === 0, `16 payment/admin fields not exposed: ${leaked.join(', ')}`)

  const otherProgress = buildTrainingRegistrationRuknProgress({
    ...input,
    ruknId: 'r-2',
    rukn: { id: 'r-2', name: 'Other Rukn', status: 'active', mobile: '9000000066' },
  })
  assert(otherProgress.connectedCount === 1, 'other rukn only sees own connection')
  assert(otherProgress.karkuns[0]?.karkunId === 'k-other', 'other rukn scoped to own karkun')
  assert(!otherProgress.karkuns.some((row) => row.karkunId === 'k-1'), '14 other rukn cannot access first rukn karkuns')

  const empty = buildTrainingRegistrationRuknProgress({
    ruknId: 'r-empty',
    rukn: { id: 'r-empty', name: 'Empty Rukn', status: 'active', mobile: '9000000011' },
    karkuns: [],
    connections: [],
    registrations: [],
  })
  assert(empty.connectedCount === 0 && empty.registeredCount === 0 && empty.notRegisteredCount === 0, 'empty connected is zero')
  assert(empty.ownRegistered === false, 'empty rukn own status still computed')

  const handler = read('src/server/trainingRegistration/handler.ts')
  const ruknFn = handler.slice(
    handler.indexOf('async function handleRuknRegistrationProgress'),
    handler.indexOf('async function publicPaymentOptions'),
  )
  assert(ruknFn.includes("where('ruknId', '==', ruknId)"), 'server queries only this rukn connections')
  assert(ruknFn.includes('identity.ruknId'), 'does not accept client ruknId')
  assert(!ruknFn.includes('body.ruknId'), 'does not read ruknId from request body')
  assert(!ruknFn.includes('loadAdminView'), 'does not load full admin view')
  assert(!ruknFn.includes('buildTrainingRegistrationAdminView'), 'does not return admin dataset')
  assert(!ruknFn.includes('utr'), 'rukn handler does not copy UTR')
  assert(!ruknFn.includes('cashPaidTo'), 'rukn handler does not copy cash collector')
  assert(handler.includes("ok: true, progress"), 'returns progress only')
  const collections = read('src/repositories/firestore/collections.ts')
  assert(collections.includes("trainingRegistrations: 'trainingRegistrations'"), '17 no new collection')
  assert(!collections.includes('ruknRegistrationProgress'), '17 no progress collection')
  const admin = read('src/components/public-registration/TrainingGatheringAdminPanel.tsx')
  assert(admin.includes('Registered People'), '18 admin registered people remains')
  assert(admin.includes('Confirm UPI Paid'), '18 admin UPI confirm remains')
  assert(admin.includes('Export CSV'), '18 admin CSV remains')
  const page = read('src/pages/public/TrainingRegistrationPage.tsx')
  assert(page.includes('existing_rukn'), '19 public rukn registration remains')
  assert(page.includes('UTR / Transaction Reference Number'), '19 public UTR remains')
  const detail = read('src/pages/rukn/TarbiyatiIjtemaRegistrationProgressPage.tsx')
  assert(detail.includes('All'), 'filter all')
  assert(detail.includes('Not Registered'), 'filter not registered')
  assert(!detail.includes('Cash Pending'), 'detail has no payment queues')
  assert(!detail.includes('UTR'), 'detail has no UTR')
  const client = read('src/lib/publicRegistration/client.ts')
  assert(client.includes("'rukn_registration_progress'"), 'client calls scoped action')
  const rules = read('firestore.rules')
  assert(rules.includes('allow read: if isAdministrator()'), 'firestore admin-only read unchanged')
  assert(rules.includes('allow create, update, delete: if false'), 'no client writes')
}

const cases = [
  run('event constants and registration id', testEventAndId),
  run('subdomain host detection', testHost),
  run('Rukn OTP behaviour unchanged', testRuknOtpUntouched),
  run('verified server path and rules', testSecurityPath),
  run('public copy, cash states, admin drill-down', testPublicCopyAndPayment),
  run('same application entry, no second app', testNoSecondApp),
  run('Person schema education/profession', testPersonSchemaDelta),
  run('registration vs payment separation without cash mark-paid', testRegistrationPaymentSeparation),
  run('male female overall tracking', testGenderTracking),
  run('open registration categories', testOpenCategoryRegistration),
  run('rukn connected scope and registered vs remaining', testRuknScopeAndRegistration),
  run('rukn home hero contract', testRuknHeroContract),
  run('rukn dashboard registration progress scope', testRuknDashboardRegistrationProgress),
  run('UPI pending to paid without leaving Registered People', testUpiFlowAndRegisteredPeople),
  run('same-device UPI deep link without marking paid', testUpiDeepLinkSameDevicePay),
  run('UTR trim empty and preserve', testUtrValidation),
  run('search filters and full CSV export', testSearchFiltersAndCsv),
  run('registered people compact expandable list', testRegisteredPeopleCompactList),
  run('no new collection or screenshot infrastructure', testNoNewInfrastructure),
  run('cash collectors from existing rukn master', testCashCollectorsFromRuknMaster),
  run('online payment setting default and visibility', testOnlinePaymentSettingDefault),
  run('mobile normalization and existing registration restore', testMobileNormalizationAndExistingRestore),
  run('legacy submit mapping without generic cash paid', testLegacySubmitMapping),
  run('public host service worker escape', testPublicHostServiceWorkerEscape),
  run('final three-choice payment semantics', testFinalPaymentSemantics),
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
