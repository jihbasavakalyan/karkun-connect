import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from '@/context/AuthContext'
import { refreshFirestoreAfterAuth } from '@/repositories/firestore/initialize'
import { clearAuthSession, loadAuthSession, saveAuthSession } from '@/lib/authSession'
import { authenticationService } from '@/services/authenticationService'
import { bindUserPreferences } from '@/stores/userPreferencesStore'
import type {
  AuthContextValue,
  AuthStatus,
  AuthUser,
  LoginResult,
  OtpSendResult,
  PasswordResetResult,
} from '@/types/auth.types'

type AuthProviderProps = {
  children: ReactNode
}

function readCachedUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null
  }

  return loadAuthSession()
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(readCachedUser)
  const [status, setStatus] = useState<AuthStatus>(() =>
    authenticationService.isConfigured() ? 'initializing' : 'unauthenticated',
  )

  useEffect(() => {
    bindUserPreferences(user?.uid)
    if (user && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('karkun-connect.last-login', new Date().toLocaleString())
    }
  }, [user])

  useEffect(() => {
    if (!authenticationService.isConfigured()) {
      return
    }

    const unsubscribe = authenticationService.subscribe((authUser) => {
      if (authUser) {
        saveAuthSession(authUser, authenticationService.getRememberMePreference())
        setUser(authUser)
        setStatus('authenticated')
        void refreshFirestoreAfterAuth()
        return
      }

      clearAuthSession()
      setUser(null)
      setStatus('unauthenticated')
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setStatus((current) => (current === 'offline' ? (user ? 'authenticated' : 'unauthenticated') : current))
    }

    const handleOffline = () => {
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user])

  const loginWithEmail = useCallback(
    async (email: string, password: string, rememberMe: boolean): Promise<LoginResult> => {
      setStatus('signing-in')
      const result = await authenticationService.loginWithEmail(email, password, rememberMe)
      if (result.success) {
        saveAuthSession(result.user, rememberMe)
        setUser(result.user)
        setStatus('authenticated')
      } else {
        setStatus(user ? 'authenticated' : 'unauthenticated')
      }
      return result
    },
    [user],
  )

  const sendOtp = useCallback(async (mobile: string): Promise<OtpSendResult> => {
    setStatus('sending-otp')
    const result = await authenticationService.sendOtp(mobile)
    setStatus(result.success ? 'unauthenticated' : user ? 'authenticated' : 'unauthenticated')
    return result
  }, [user])

  const verifyOtp = useCallback(
    async (code: string, rememberMe: boolean): Promise<LoginResult> => {
      setStatus('verifying-otp')
      const result = await authenticationService.verifyOtp(code, rememberMe)
      if (result.success) {
        saveAuthSession(result.user, rememberMe)
        setUser(result.user)
        setStatus('authenticated')
      } else {
        setStatus(user ? 'authenticated' : 'unauthenticated')
      }
      return result
    },
    [user],
  )

  const resendOtp = useCallback(async (mobile: string): Promise<OtpSendResult> => {
    setStatus('sending-otp')
    const result = await authenticationService.resendOtp(mobile)
    setStatus(user ? 'authenticated' : 'unauthenticated')
    return result
  }, [user])

  const resetPassword = useCallback(async (email: string): Promise<PasswordResetResult> => {
    return authenticationService.resetPassword(email)
  }, [])

  const reauthenticateWithPassword = useCallback(async (password: string): Promise<boolean> => {
    return authenticationService.reauthenticateWithPassword(password)
  }, [])

  const logout = useCallback(async () => {
    await authenticationService.logout()
    clearAuthSession()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: user !== null,
      isInitializing: status === 'initializing',
      loginWithEmail,
      sendOtp,
      verifyOtp,
      resendOtp,
      resetPassword,
      reauthenticateWithPassword,
      logout,
    }),
    [
      user,
      status,
      loginWithEmail,
      sendOtp,
      verifyOtp,
      resendOtp,
      resetPassword,
      reauthenticateWithPassword,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
