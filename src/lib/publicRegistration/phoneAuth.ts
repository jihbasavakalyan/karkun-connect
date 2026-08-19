/**
 * Public training-registration OTP. Separate from Rukn login.
 * Does not consult ruknMaster, does not provision JWT claims, and does not complete Rukn login.
 */

import {
  RecaptchaVerifier,
  browserSessionPersistence,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/firebase'
import { mapFirebaseAuthError } from '@/lib/auth/authErrors'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import { toE164IndianPhone } from '@/lib/auth/roleResolver'

const RECAPTCHA_CONTAINER_ID = 'kc-public-reg-recaptcha'

let recaptchaVerifier: RecaptchaVerifier | null = null
let confirmation: ConfirmationResult | null = null
let sessionMobile = ''

function getVerifier(): RecaptchaVerifier {
  const auth = getFirebaseAuth()
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: 'invisible',
    })
  }
  return recaptchaVerifier
}

function resetVerifier(): void {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear()
    recaptchaVerifier = null
  }
}

export const publicRegistrationPhoneAuth = {
  recaptchaContainerId: RECAPTCHA_CONTAINER_ID,

  isConfigured(): boolean {
    return isFirebaseConfigured()
  },

  getSessionMobile(): string {
    return sessionMobile
  },

  async sendOtp(mobile: string): Promise<{ success: true } | { success: false; error: string }> {
    const normalized = normalizeMobile(mobile)
    if (!isValidMobileFormat(normalized)) {
      return { success: false, error: 'Enter a valid 10-digit Indian mobile number.' }
    }
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Registration is temporarily unavailable. Please try again later.' }
    }
    try {
      const auth = getFirebaseAuth()
      await auth.setPersistence(browserSessionPersistence)
      const result = await signInWithPhoneNumber(auth, toE164IndianPhone(normalized), getVerifier())
      confirmation = result
      sessionMobile = normalized
      return { success: true }
    } catch (error) {
      resetVerifier()
      confirmation = null
      return { success: false, error: mapFirebaseAuthError(error) }
    }
  },

  async verifyOtp(code: string): Promise<{ success: true } | { success: false; error: string }> {
    const trimmed = code.replace(/\D/g, '')
    if (trimmed.length !== 6) {
      return { success: false, error: 'Enter the 6-digit OTP.' }
    }
    if (!confirmation) {
      return { success: false, error: 'Request an OTP before verifying.' }
    }
    try {
      await confirmation.confirm(trimmed)
      confirmation = null
      resetVerifier()
      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseAuthError(error) }
    }
  },

  async getIdToken(): Promise<string | null> {
    const user = getFirebaseAuth().currentUser
    if (!user) return null
    return user.getIdToken()
  },

  async changeMobile(): Promise<void> {
    confirmation = null
    sessionMobile = ''
    resetVerifier()
    if (isFirebaseConfigured()) {
      try {
        await signOut(getFirebaseAuth())
      } catch {
        // ignore
      }
    }
  },
}
