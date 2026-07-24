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
import {
  formatRuknClaimsValidationFailure,
  validateRuknJwtClaimsAgainstMaster,
} from '@/lib/auth/ruknClaimsValidation'
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/firebase'
import { logRuknAuthAttempt } from '@/services/ruknAuthAttemptLogger'
import {
  findByMobile,
  phonesMatchRukn,
  RUKN_AUTH_VERIFICATION_FAILED_MESSAGE,
  RUKN_DUPLICATE_MOBILE_MESSAGE,
  RUKN_INVALID_MOBILE_MESSAGE,
  RUKN_NOT_REGISTERED_MESSAGE,
} from '@/services/ruknIdentityService'
import type { AuthUser, LoginResult, OtpSendResult, PasswordResetResult } from '@/types/auth.types'
import type { Rukn } from '@/data/ruknMaster'

export type AuthStateListener = (user: AuthUser | null) => void

type OtpSession = {
  mobile: string
  expectedRukn: Rukn
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

export const MISSING_RUKN_JWT_CLAIMS_ERROR =
  'Your Rukn access is not activated yet. Please contact your administrator to activate your account, then sign in again.'

function mapFirebaseUser(user: User): Promise<AuthUser | null> {
  return user.getIdTokenResult().then(async (tokenResult) => {
    let authUser = resolveAuthUser({
      uid: user.uid,
      email: user.email,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName,
      customClaims: tokenResult.claims as Record<string, unknown>,
    })

    // KC-0061 Phase 2 — App may resolve Admin (email allowlist) or Rukn (phone master)
    // while the JWT still lacks role claims. Firestore requires token.role for assign + hydrate.
    const appRole = authUser?.role
    const claimRole = tokenResult.claims.role
    const claimRuknId =
      typeof tokenResult.claims.ruknId === 'string' ? tokenResult.claims.ruknId : null
    const claimsMatchAppRole =
      (appRole === 'administrator' && claimRole === 'administrator') ||
      (appRole === 'rukn' && claimRole === 'rukn' && Boolean(claimRuknId))

    if (authUser && !claimsMatchAppRole) {
      console.warn('[KC-0061] ID token role claim mismatch; force-refreshing', {
        uid: user.uid,
        appRole,
        claimRole: claimRole ?? null,
        claimRuknId,
      })
      const refreshed = await user.getIdTokenResult(true)
      authUser = resolveAuthUser({
        uid: user.uid,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
        customClaims: refreshed.claims as Record<string, unknown>,
      })
      console.info('[KC-0061] after token refresh', {
        claimRole: refreshed.claims.role ?? null,
        claimRuknId: refreshed.claims.ruknId ?? null,
        resolvedRole: authUser?.role ?? null,
      })

      // KC-0100 — phone→master can resolve a Rukn AuthUser while JWT still lacks ruknId.
      // That path hydrates empty scoped data and shows Connected=0. Fail closed instead.
      if (authUser?.role === 'rukn') {
        const refreshedRuknId =
          typeof refreshed.claims.ruknId === 'string' ? refreshed.claims.ruknId : null
        if (refreshed.claims.role !== 'rukn' || !refreshedRuknId) {
          console.error('[KC-0100] Rukn session rejected — JWT missing role/ruknId claims', {
            uid: user.uid,
            appRuknId: authUser.ruknId,
            claimRole: refreshed.claims.role ?? null,
            claimRuknId: refreshedRuknId,
          })
          return null
        }
        authUser = { ...authUser, ruknId: refreshedRuknId }
      }
    } else if (authUser?.role === 'rukn' && claimRuknId) {
      // Single source of truth: JWT ruknId (must match Firestore connection.ruknId).
      authUser = { ...authUser, ruknId: claimRuknId }
    }

    return authUser
  })
}

async function finalizeLogin(
  user: User,
  expectedRukn?: Pick<Rukn, 'id' | 'mobile' | 'name'>,
): Promise<LoginResult> {
  // Capture claims before any sign-out so we can distinguish missing Rukn claims.
  const tokenBefore = await user.getIdTokenResult(false).catch(() => null)
  const authUser = await mapFirebaseUser(user)
  if (!authUser) {
    const phone = user.phoneNumber
    const missingRuknClaims =
      Boolean(phone) &&
      (!tokenBefore ||
        tokenBefore.claims.role !== 'rukn' ||
        typeof tokenBefore.claims.ruknId !== 'string')

    // KC-0100.2 — first-OTP / claims-mismatch safeguard: log exact expected vs actual.
    // Does not provision claims (Admin SDK only); preserves KC-0100 fail-closed.
    if (expectedRukn && missingRuknClaims) {
      const validation = validateRuknJwtClaimsAgainstMaster(
        {
          ruknId: expectedRukn.id,
          mobile: expectedRukn.mobile,
          name: expectedRukn.name,
        },
        {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          role: tokenBefore?.claims.role ?? null,
          ruknId: tokenBefore?.claims.ruknId ?? null,
        },
      )
      console.error('[KC-0100.2] Rukn claims validation failed after OTP', {
        uid: user.uid,
        phone: user.phoneNumber,
        expectedRuknId: expectedRukn.id,
        expectedMobile: expectedRukn.mobile,
        reasons: validation.reasons,
        expected: validation.expected,
        actual: validation.actual,
        detail: formatRuknClaimsValidationFailure(validation),
      })
      logRuknAuthAttempt({
        mobile: expectedRukn.mobile,
        result: 'otp_failed',
        registered: true,
        otpOutcome: 'failure',
        detail: `claims_validation: ${formatRuknClaimsValidationFailure(validation)}`,
      })
    }

    await signOut(getFirebaseAuth())
    return {
      success: false,
      error: missingRuknClaims
        ? MISSING_RUKN_JWT_CLAIMS_ERROR
        : 'Your account is not authorized for Karkun Connect. Contact your administrator.',
    }
  }

  // KC-0100.2 — successful OTP path: confirm JWT claims match Rukn Master identity.
  if (expectedRukn && authUser.role === 'rukn') {
    const tokenAfter = await user.getIdTokenResult(false).catch(() => null)
    const validation = validateRuknJwtClaimsAgainstMaster(
      {
        ruknId: expectedRukn.id,
        mobile: expectedRukn.mobile,
        name: expectedRukn.name,
      },
      {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        role: tokenAfter?.claims.role ?? authUser.role,
        ruknId: tokenAfter?.claims.ruknId ?? authUser.ruknId ?? null,
      },
    )
    if (!validation.ok) {
      console.error('[KC-0100.2] Rukn claims mismatch after successful mapFirebaseUser', {
        uid: user.uid,
        reasons: validation.reasons,
        expected: validation.expected,
        actual: validation.actual,
        detail: formatRuknClaimsValidationFailure(validation),
      })
      logRuknAuthAttempt({
        mobile: expectedRukn.mobile,
        result: 'otp_failed',
        registered: true,
        otpOutcome: 'failure',
        detail: `claims_validation: ${formatRuknClaimsValidationFailure(validation)}`,
      })
      await signOut(getFirebaseAuth())
      return {
        success: false,
        error: MISSING_RUKN_JWT_CLAIMS_ERROR,
      }
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
      const identity = await findByMobile(mobile)

      if (!identity.allowed) {
        if (identity.reason === 'INVALID_FORMAT') {
          logRuknAuthAttempt({
            mobile,
            result: 'invalid_format',
            registered: false,
          })
          return { success: false, error: RUKN_INVALID_MOBILE_MESSAGE }
        }

        if (identity.reason === 'NOT_REGISTERED') {
          logRuknAuthAttempt({
            mobile,
            result: 'unregistered',
            registered: false,
          })
          return { success: false, error: RUKN_NOT_REGISTERED_MESSAGE }
        }

        logRuknAuthAttempt({
          mobile,
          result: 'duplicate_mobile',
          registered: false,
          detail: identity.reason,
        })
        return { success: false, error: RUKN_DUPLICATE_MOBILE_MESSAGE }
      }

      ensureFirebaseReady()
      await applyPersistence(rememberMePreference)
      const phoneNumber = toE164IndianPhone(mobile)
      const confirmation = await signInWithPhoneNumber(
        getFirebaseAuth(),
        phoneNumber,
        getRecaptchaVerifier(),
      )
      otpSession = { mobile, expectedRukn: identity.rukn, confirmation }
      logRuknAuthAttempt({
        mobile,
        result: 'otp_sent',
        registered: true,
      })
      return { success: true }
    } catch (error) {
      resetRecaptcha()
      logRuknAuthAttempt({
        mobile,
        result: 'otp_send_failed',
        registered: true,
        otpOutcome: 'failure',
        detail: error instanceof Error ? error.message : String(error),
      })
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
      const { expectedRukn, confirmation, mobile: sessionMobile } = otpSession
      const result = await confirmation.confirm(code.trim())

      if (!phonesMatchRukn(result.user.phoneNumber, expectedRukn)) {
        otpSession = null
        resetRecaptcha()
        await signOut(getFirebaseAuth())
        logRuknAuthAttempt({
          mobile: sessionMobile,
          result: 'verification_mismatch',
          registered: true,
          otpOutcome: 'failure',
        })
        return { success: false, error: RUKN_AUTH_VERIFICATION_FAILED_MESSAGE }
      }

      otpSession = null
      resetRecaptcha()
      const loginResult = await finalizeLogin(result.user, expectedRukn)
      if (loginResult.success) {
        logRuknAuthAttempt({
          mobile: expectedRukn.mobile,
          result: 'otp_success',
          registered: true,
          otpOutcome: 'success',
        })
      } else if (!loginResult.error?.includes('not activated yet')) {
        // Missing-claims path already logged structured [KC-0100.2] + claims_validation detail.
        logRuknAuthAttempt({
          mobile: expectedRukn.mobile,
          result: 'otp_failed',
          registered: true,
          otpOutcome: 'failure',
          detail: loginResult.error,
        })
      }
      return loginResult
    } catch (error) {
      logRuknAuthAttempt({
        mobile: otpSession?.mobile ?? '',
        result: 'otp_failed',
        registered: true,
        otpOutcome: 'failure',
        detail: error instanceof Error ? error.message : String(error),
      })
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
