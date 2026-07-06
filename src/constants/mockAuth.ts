import type { AuthUser, UserRole } from '@/types/auth.types'

type MockCredential = {
  email: string
  password: string
  role: UserRole
}

const MOCK_CREDENTIALS: MockCredential[] = [
  { email: 'admin@demo.com', password: 'password', role: 'administrator' },
  { email: 'rukn@demo.com', password: 'password', role: 'rukn' },
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

  return {
    email: match.email,
    role: match.role,
  }
}

export function getHomeRouteForRole(role: UserRole): '/admin' | '/rukn' {
  return role === 'administrator' ? '/admin' : '/rukn'
}
