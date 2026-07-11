const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact your administrator.',
  'auth/user-not-found': 'Invalid email or password. Please try again.',
  'auth/wrong-password': 'Invalid email or password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/invalid-login-credentials': 'Invalid email or password. Please try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'You appear to be offline. Check your connection and try again.',
  'auth/invalid-phone-number': 'Please enter a valid 10-digit mobile number.',
  'auth/invalid-verification-code': 'The OTP you entered is incorrect. Please try again.',
  'auth/code-expired': 'This OTP has expired. Request a new code.',
  'auth/missing-verification-code': 'Please enter the OTP sent to your mobile.',
  'auth/session-expired': 'Your session has expired. Please sign in again.',
  'auth/requires-recent-login': 'For security, please sign in again to continue.',
  'auth/operation-not-allowed': 'Unable to send OTP. Please try again in a moment.',
  'auth/billing-not-enabled': 'Unable to send OTP. Please try again in a moment.',
  'auth/quota-exceeded': 'Service is temporarily unavailable. Please try again later.',
  'auth/captcha-check-failed': 'Unable to send OTP. Please try again in a moment.',
}

export function mapFirebaseAuthError(error: unknown): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return AUTH_ERROR_MESSAGES['auth/network-request-failed']!
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: string }).code)
    if (AUTH_ERROR_MESSAGES[code]) {
      return AUTH_ERROR_MESSAGES[code]!
    }
  }

  if (import.meta.env.DEV && typeof error === 'object' && error !== null && 'code' in error) {
    console.warn('[auth]', (error as { code: string }).code, (error as { message?: string }).message)
  }

  return 'Something went wrong. Please try again.'
}

export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true
  }

  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code: string }).code) === 'auth/network-request-failed'
  )
}
