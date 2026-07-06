const MOBILE_DIGITS = 10

export function normalizeMobile(mobile: string): string {
  return mobile.trim().replace(/\D/g, '')
}

export function isValidMobileFormat(mobile: string): boolean {
  const digits = normalizeMobile(mobile)
  return digits.length === MOBILE_DIGITS && /^\d+$/.test(digits)
}

export function formatMobileValidationError(): string {
  return 'Mobile number must be exactly 10 digits (numbers only).'
}

export function mobilesMatch(a: string, b: string): boolean {
  const normalizedA = normalizeMobile(a)
  const normalizedB = normalizeMobile(b)
  if (!normalizedA || !normalizedB) {
    return false
  }
  return normalizedA === normalizedB
}
