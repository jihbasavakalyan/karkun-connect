import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { authenticateMock } from '@/constants/mockAuth'
import { AuthContext } from '@/context/AuthContext'
import type { AuthContextValue, AuthUser, LoginResult } from '@/types/auth.types'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const login = useCallback((email: string, password: string): LoginResult => {
    const authenticatedUser = authenticateMock(email, password)

    if (!authenticatedUser) {
      return {
        success: false,
        error: 'Invalid email or password. Please try again.',
      }
    }

    setUser(authenticatedUser)

    return {
      success: true,
      user: authenticatedUser,
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
