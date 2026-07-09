import {
  EmailAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth'
import { RecaptchaVerifier } from 'firebase/auth'
import { mapFirebaseAuthError, isOfflineError } from '@/lib/auth/authErrors'
import { resolveAuthUser, toE164IndianPhone } from '@/lib/auth/roleResolver'
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/firebase'
import { isValidMobileFormat } from '@/lib/mobileValidation'
import type { AuthUser, LoginResult, OtpSendResult, PasswordResetResult } from '@/types/auth.types'

export type AuthStateListener = (user: AuthUser | null) => void

type OtpSession = {
  mobile: string
  confirmation: ConfirmationResult
}

let recaptchaVerifier: RecaptchaVerifier | null = null
let otpSession: OtpSession | null = null
let rememberMePreference = true

function ensureFirebaseReady(): void {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase authentication is not configured.')
  }
}

function mapFirebaseUser(user: User): Promise<AuthUser | null> {
  return user.getIdTokenResult().then((tokenResult) =>
    resolveAuthUser({
      uid: user.uid,
      email: user.email,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName,
      customClaims: tokenResult.claims as Record<string, unknown>,
    }),
  )
}

async function finalizeLogin(user: User): Promise<LoginResult> {
  const authUser = await mapFirebaseUser(user)
  if (!authUser) {
    await signOut(getFirebaseAuth())
    return {
      success: false,
      error: 'Your account is not authorized for Karkun Connect. Contact your administrator.',
    }
  }

  return { success: true, user: authUser }
}

function getRecaptchaVerifier(): RecaptchaVerifier {
  ensureFirebaseReady()
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(getFirebaseAuth(), 'kc-recaptcha-container', {
      size: 'invisible',
    })
  }
  return recaptchaVerifier
}

function resetRecaptcha(): void {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear()
    recaptchaVerifier = null
  }
}

async function applyPersistence(rememberMe: boolean): Promise<void> {
  rememberMePreference = rememberMe
  await getFirebaseAuth().setPersistence(
    rememberMe ? browserLocalPersistence : browserSessionPersistence,
  )
}

export const authenticationService = {
  isConfigured(): boolean {
    return isFirebaseConfigured()
  },

  subscribe(listener: AuthStateListener): () => void {
    if (!isFirebaseConfigured()) {
      listener(null)
      return () => undefined
    }

    const auth = getFirebaseAuth()
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        listener(null)
        return
      }

      try {
        const authUser = await mapFirebaseUser(firebaseUser)
        if (!authUser) {
          await signOut(auth)
          listener(null)
          return
        }
        listener(authUser)
      } catch {
        listener(null)
      }
    })
  },

  async restoreSession(): Promise<AuthUser | null> {
    if (!isFirebaseConfigured()) {
      return null
    }

    const current = getFirebaseAuth().currentUser
    if (!current) {
      return null
    }

    return mapFirebaseUser(current)
  },

  async loginWithEmail(
    email: string,
    password: string,
    rememberMe: boolean,
  ): Promise<LoginResult> {
    try {
      ensureFirebaseReady()
      await applyPersistence(rememberMe)
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        password,
      )
      return finalizeLogin(credential.user)
    } catch (error) {
      return { success: false, error: mapFirebaseAuthError(error) }
    }
  },

  async sendOtp(mobile: string): Promise<OtpSendResult> {
    try {
      ensureFirebaseReady()
      if (!isValidMobileFormat(mobile)) {
        return { success: false, error: 'Mobile number must be exactly 10 digits.' }
      }

      await applyPersistence(rememberMePreference)
      const phoneNumber = toE164IndianPhone(mobile)
      const confirmation = await signInWithPhoneNumber(
        getFirebaseAuth(),
        phoneNumber,
        getRecaptchaVerifier(),
      )
      otpSession = { mobile, confirmation }
      return { success: true }
    } catch (error) {
      resetRecaptcha()
      return { success: false, error: mapFirebaseAuthError(error) }
    }
  },

  async verifyOtp(code: string, rememberMe: boolean): Promise<LoginResult> {
    try {
      ensureFirebaseReady()
      if (!otpSession) {
        return { success: false, error: 'Request an OTP before verifying.' }
      }

      await applyPersistence(rememberMe)
      const result = await otpSession.confirmation.confirm(code.trim())
      otpSession = null
      resetRecaptcha()
      return finalizeLogin(result.user)
    } catch (error) {
      if (isOfflineError(error)) {
        return { success: false, error: mapFirebaseAuthError(error) }
      }
      return { success: false, error: mapFirebaseAuthError(error) }
    }
  },

  async resendOtp(mobile: string): Promise<OtpSendResult> {
    otpSession = null
    resetRecaptcha()
    return this.sendOtp(mobile)
  },

  async resetPassword(email: string): Promise<PasswordResetResult> {
    try {
      ensureFirebaseReady()
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim())
      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseAuthError(error) }
    }
  },

  async reauthenticateWithPassword(password: string): Promise<boolean> {
    try {
      ensureFirebaseReady()
      const current = getFirebaseAuth().currentUser
      if (!current?.email) {
        return false
      }

      const credential = EmailAuthProvider.credential(current.email, password)
      await reauthenticateWithCredential(current, credential)
      return true
    } catch {
      return false
    }
  },

  async logout(): Promise<void> {
    otpSession = null
    resetRecaptcha()
    if (isFirebaseConfigured()) {
      await signOut(getFirebaseAuth())
    }
  },

  getRememberMePreference(): boolean {
    return rememberMePreference
  },

  clearOtpSession(): void {
    otpSession = null
    resetRecaptcha()
  },

  /** Test-only reset — not used in production UI. */
  resetForTests(): void {
    otpSession = null
    resetRecaptcha()
    rememberMePreference = true
  },
}

export type AuthenticationService = typeof authenticationService
