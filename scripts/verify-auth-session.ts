/**
 * M7 — Authentication and session verification (no live Firebase required).
 * Run: npm run verify:auth
 */
import { mapFirebaseAuthError } from '@/lib/auth/authErrors'
import {
  getAuthorizedRedirect,
  getHomeRouteForRole,
  isPathAllowedForRole,
} from '@/lib/auth/authorization'
import {
  findRuknIdByPhone,
  isAdministratorEmail,
  resolveAuthUser,
  toE164IndianPhone,
} from '@/lib/auth/roleResolver'
import { ruknMaster } from '@/data/ruknMaster'
import {
  clearAuthSession,
  loadAuthSession,
  resetAuthSessionMemoryForTests,
  saveAuthSession,
} from '@/lib/authSession'
import { authenticationService } from '@/services/authenticationService'
import type { AuthUser } from '@/types/auth.types'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function verifyRoleResolution(): void {
  const admin = resolveAuthUser(
    {
      uid: 'admin-1',
      email: 'ops@jih.org',
      phoneNumber: null,
      displayName: 'Ops Admin',
      customClaims: {},
    },
    ['ops@jih.org'],
  )
  assert(admin?.role === 'administrator', 'Administrator email allowlist must resolve')
  assert(!admin?.ruknId, 'Administrator must not include ruknId')

  const claimAdmin = resolveAuthUser({
    uid: 'admin-2',
    email: 'any@example.com',
    phoneNumber: null,
    displayName: null,
    customClaims: { role: 'administrator' },
  })
  assert(claimAdmin?.role === 'administrator', 'Administrator custom claim must resolve')

  const activeRukn = ruknMaster.find((rukn) => rukn.status === 'active' && rukn.mobile)
  assert(Boolean(activeRukn), 'Need an active Rukn with mobile for phone resolution')

  const rukn = resolveAuthUser({
    uid: 'rukn-1',
    email: null,
    phoneNumber: toE164IndianPhone(activeRukn!.mobile),
    displayName: null,
    customClaims: {},
  })
  assert(rukn?.role === 'rukn', 'Phone login must resolve to rukn role')
  assert(rukn?.ruknId === activeRukn!.id, 'Phone login must map to matching ruknId')

  const unauthorized = resolveAuthUser({
    uid: 'unknown',
    email: 'stranger@example.com',
    phoneNumber: null,
    displayName: null,
    customClaims: {},
  })
  assert(unauthorized === null, 'Unknown users must not receive a role')
}

function verifyRoutesAndAuthorization(): void {
  assert(getHomeRouteForRole('administrator') === '/admin', 'Administrator home route must be /admin')
  assert(getHomeRouteForRole('rukn') === '/rukn', 'Rukn home route must be /rukn')
  assert(isPathAllowedForRole('/admin/settings', 'administrator'), 'Administrator may access admin settings')
  assert(!isPathAllowedForRole('/admin/settings', 'rukn'), 'Rukn must not access admin settings')
  assert(isPathAllowedForRole('/rukn/my-karkun', 'rukn'), 'Rukn may access rukn routes')
  assert(
    getAuthorizedRedirect('/admin/settings', 'rukn') === '/rukn',
    'Unauthorized admin path must redirect to rukn home',
  )
}

function verifyErrorMapping(): void {
  assert(
    mapFirebaseAuthError({ code: 'auth/wrong-password' }).includes('Invalid email or password'),
    'Firebase errors must map to friendly messages',
  )
  assert(
    !mapFirebaseAuthError({ code: 'auth/wrong-password' }).includes('auth/'),
    'Firebase codes must not leak to users',
  )
}

function verifySessionPersistence(): void {
  resetAuthSessionMemoryForTests()
  clearAuthSession()
  authenticationService.resetForTests()

  const adminUser: AuthUser = {
    uid: 'persist-admin',
    email: 'admin@example.com',
    role: 'administrator',
  }

  saveAuthSession(adminUser, true)
  const restored = loadAuthSession()
  assert(restored?.uid === 'persist-admin', 'Persistent session must restore uid')
  assert(restored?.email === 'admin@example.com', 'Persistent session must restore email')

  clearAuthSession()

  const ruknUser: AuthUser = {
    uid: 'persist-rukn',
    email: '',
    phone: '9876543210',
    role: 'rukn',
    ruknId: 'R001',
  }

  saveAuthSession(ruknUser, false)
  const tabRestored = loadAuthSession()
  assert(tabRestored?.ruknId === 'R001', 'Tab session must restore ruknId')

  clearAuthSession()
  assert(loadAuthSession() === null, 'Clear session must remove auth cache')
}

function verifyPhoneHelpers(): void {
  const activeRukn = ruknMaster.find((rukn) => rukn.status === 'active' && rukn.mobile)
  assert(Boolean(activeRukn), 'Need active Rukn mobile for helper test')
  assert(findRuknIdByPhone(activeRukn!.mobile) === activeRukn!.id, 'findRuknIdByPhone must match master')
  assert(isAdministratorEmail('Admin@JIH.org', ['admin@jih.org']), 'Admin email comparison is case-insensitive')
  assert(toE164IndianPhone('9876543210') === '+919876543210', 'Indian phone numbers must use +91 prefix')
}

verifyRoleResolution()
verifyRoutesAndAuthorization()
verifyErrorMapping()
verifySessionPersistence()
verifyPhoneHelpers()

console.log('Authentication session verification passed.')
