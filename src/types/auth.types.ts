export type UserRole = 'administrator' | 'rukn'

export type AuthUser = {
  email: string
  role: UserRole
  ruknId?: string
}

export type LoginResult =
  | { success: true; user: AuthUser }
  | { success: false; error: string }

export type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => LoginResult
  logout: () => void
}
