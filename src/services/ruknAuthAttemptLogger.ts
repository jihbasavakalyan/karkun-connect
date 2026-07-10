export type RuknAuthAttemptResult =
  | 'invalid_format'
  | 'unregistered'
  | 'duplicate_mobile'
  | 'otp_sent'
  | 'otp_send_failed'
  | 'otp_success'
  | 'otp_failed'
  | 'verification_mismatch'

export type RuknAuthAttemptLog = {
  timestamp: string
  mobile: string
  result: RuknAuthAttemptResult
  registered: boolean
  otpOutcome: 'success' | 'failure' | 'not_attempted'
  userAgent: string
  detail?: string
}

export function logRuknAuthAttempt(entry: {
  mobile: string
  result: RuknAuthAttemptResult
  registered: boolean
  otpOutcome?: 'success' | 'failure' | 'not_attempted'
  detail?: string
}): void {
  const record: RuknAuthAttemptLog = {
    timestamp: new Date().toISOString(),
    mobile: entry.mobile,
    result: entry.result,
    registered: entry.registered,
    otpOutcome: entry.otpOutcome ?? 'not_attempted',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
    detail: entry.detail,
  }

  console.info('[rukn-auth]', record)
}
