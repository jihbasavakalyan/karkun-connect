/**
 * Sprint 12.5 — mock authentication and session persistence verification.
 * Run: npx vite-node scripts/verify-auth-session.ts
 */
import { DEMO_RUKN_ACCOUNTS } from '@/constants/demoRukn'
import {
  authenticateMock,
  DEMO_CREDENTIALS_DISPLAY,
  getHomeRouteForRole,
} from '@/constants/mockAuth'
import {
  clearAuthSession,
  loadAuthSession,
  resetAuthSessionMemoryForTests,
  saveAuthSession,
} from '@/lib/authSession'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function verifyDemoAccounts(): void {
  assert(DEMO_CREDENTIALS_DISPLAY.length >= 5, 'Demo credentials panel must list admin + 4 Rukns')

  const admin = authenticateMock('admin@demo.com', 'password')
  assert(admin?.role === 'administrator', 'Administrator login must succeed')
  assert(!admin?.ruknId, 'Administrator must not have ruknId')

  const expectedRuknEmails = ['rukn1@demo.com', 'rukn2@demo.com', 'rukn3@demo.com', 'rukn4@demo.com']

  for (const email of expectedRuknEmails) {
    const user = authenticateMock(email, 'password')
    assert(user?.role === 'rukn', `${email} must authenticate as rukn`)
    assert(Boolean(user?.ruknId), `${email} must include ruknId`)
  }

  assert(
    authenticateMock('rukn@demo.com', 'password') === null,
    'Legacy single Rukn login must be removed',
  )

  assert(DEMO_RUKN_ACCOUNTS.length >= 4, 'At least four demo Rukn accounts must be configured')

  const maleIds = DEMO_RUKN_ACCOUNTS.filter((account) => account.email.startsWith('rukn1') || account.email.startsWith('rukn2'))
  const femaleIds = DEMO_RUKN_ACCOUNTS.filter((account) => account.email.startsWith('rukn3') || account.email.startsWith('rukn4'))
  assert(maleIds.length === 2, 'Two male demo Rukn accounts required')
  assert(femaleIds.length === 2, 'Two female demo Rukn accounts required')
  assert(maleIds[0]?.ruknId !== femaleIds[0]?.ruknId, 'Male and female demo accounts must map to different Rukns')
}

function verifyRoutes(): void {
  assert(getHomeRouteForRole('administrator') === '/admin', 'Administrator home route must be /admin')
  assert(getHomeRouteForRole('rukn') === '/rukn', 'Rukn home route must be /rukn')
}

function verifyPersistentSession(): void {
  resetAuthSessionMemoryForTests()
  clearAuthSession()

  const user = authenticateMock('admin@demo.com', 'password')
  assert(user !== null, 'Admin auth required for session test')

  saveAuthSession(user, true)
  const restored = loadAuthSession()
  assert(restored?.email === 'admin@demo.com', 'Persistent session must restore after refresh')

  clearAuthSession()
  assert(loadAuthSession() === null, 'Clear session must remove persisted auth')
}

function verifyTabSession(): void {
  resetAuthSessionMemoryForTests()
  clearAuthSession()

  const user = authenticateMock('rukn2@demo.com', 'password')
  assert(user !== null, 'Rukn auth required for tab session test')

  saveAuthSession(user, false)
  const restored = loadAuthSession()
  assert(restored?.ruknId === user.ruknId, 'Tab session must restore ruknId')

  clearAuthSession()
}

verifyDemoAccounts()
verifyRoutes()
verifyPersistentSession()
verifyTabSession()

console.log('Authentication session verification passed.')
