import { DEMO_RUKN_ACCOUNTS, getDemoRuknIdForEmail } from '@/constants/demoRukn'
import type { AuthUser, UserRole } from '@/types/auth.types'

type MockCredential = {
  email: string
  password: string
  role: UserRole
  ruknId?: string
}

const DEMO_PASSWORD = 'password'

const MOCK_CREDENTIALS: MockCredential[] = [
  { email: 'admin@demo.com', password: DEMO_PASSWORD, role: 'administrator' },
  ...DEMO_RUKN_ACCOUNTS.map((account) => ({
    email: account.email,
    password: DEMO_PASSWORD,
    role: 'rukn' as const,
    ruknId: account.ruknId,
  })),
]

export type DemoCredentialDisplay = {
  roleLabel: string
  email: string
  password: string
  detail?: string
}

export const DEMO_CREDENTIALS_DISPLAY: DemoCredentialDisplay[] = [
  {
    roleLabel: 'Administrator',
    email: 'admin@demo.com',
    password: DEMO_PASSWORD,
  },
  ...DEMO_RUKN_ACCOUNTS.map((account) => ({
    roleLabel: 'Rukn',
    email: account.email,
    password: DEMO_PASSWORD,
    detail: `${account.label} — ${account.ruknName}`,
  })),
]

export function authenticateMock(email: string, password: string): AuthUser | null {
  const normalizedEmail = email.trim().toLowerCase()
  const match = MOCK_CREDENTIALS.find(
    (credential) =>
      credential.email === normalizedEmail && credential.password === password,
  )

  if (!match) {
    return null
  }

  if (match.role === 'rukn') {
    const ruknId = match.ruknId ?? getDemoRuknIdForEmail(match.email)
    if (!ruknId) {
      return null
    }

    return {
      email: match.email,
      role: match.role,
      ruknId,
    }
  }

  return {
    email: match.email,
    role: match.role,
  }
}

export function getHomeRouteForRole(role: UserRole): '/admin' | '/rukn' {
  return role === 'administrator' ? '/admin' : '/rukn'
}
