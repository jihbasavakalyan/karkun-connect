import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { authenticateMock } from '@/constants/mockAuth'
import { AuthContext } from '@/context/AuthContext'
import { clearAuthSession, loadAuthSession, saveAuthSession } from '@/lib/authSession'
import type { AuthContextValue, AuthUser, LoginResult } from '@/types/auth.types'

type AuthProviderProps = {
  children: ReactNode
}

function readInitialUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null
  }

  return loadAuthSession()
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(readInitialUser)

  const login = useCallback(
    (email: string, password: string, rememberMe: boolean): LoginResult => {
      const authenticatedUser = authenticateMock(email, password)

      if (!authenticatedUser) {
        return {
          success: false,
          error: 'Invalid email or password. Please try again.',
        }
      }

      saveAuthSession(authenticatedUser, rememberMe)
      setUser(authenticatedUser)

      return {
        success: true,
        user: authenticatedUser,
      }
    },
    [],
  )

  const logout = useCallback(() => {
    clearAuthSession()
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
