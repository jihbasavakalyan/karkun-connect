const MOBILE_DIGITS_MIN = 10
const MOBILE_DIGITS_MAX = 15

export function normalizeMobile(mobile: string): string {
  return mobile.replace(/\D/g, '')
}

export function isValidMobileFormat(mobile: string): boolean {
  const digits = normalizeMobile(mobile)
  return digits.length >= MOBILE_DIGITS_MIN && digits.length <= MOBILE_DIGITS_MAX
}

export function formatMobileValidationError(): string {
  return `Mobile number must contain ${MOBILE_DIGITS_MIN}–${MOBILE_DIGITS_MAX} digits.`
}

export function mobilesMatch(a: string, b: string): boolean {
  const normalizedA = normalizeMobile(a)
  const normalizedB = normalizeMobile(b)
  if (!normalizedA || !normalizedB) {
    return false
  }
  return normalizedA === normalizedB
}
