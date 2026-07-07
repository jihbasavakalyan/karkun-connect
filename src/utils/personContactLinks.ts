import { normalizeMobile } from '@/lib/mobileValidation'

export const MOBILE_INPUT_PLACEHOLDER = '+91 9876543210'

export function buildTelLink(mobile: string): string | null {
  const digits = normalizeMobile(mobile)
  if (!digits) {
    return null
  }
  return `tel:+91${digits}`
}

export function buildSmsLink(mobile: string, message?: string): string | null {
  const digits = normalizeMobile(mobile)
  if (!digits) {
    return null
  }
  const base = `sms:+91${digits}`
  if (message && message.trim()) {
    return `${base}?body=${encodeURIComponent(message)}`
  }
  return base
}

export function buildWhatsAppLink(number: string, message?: string): string | null {
  const digits = normalizeMobile(number)
  if (!digits) {
    return null
  }
  const base = `https://wa.me/91${digits}`
  if (message && message.trim()) {
    return `${base}?text=${encodeURIComponent(message)}`
  }
  return base
}

export function buildMailtoLink(
  email: string | undefined,
  subject?: string,
  body?: string,
): string | null {
  const trimmed = email?.trim()
  if (!trimmed) {
    return null
  }
  const params = new URLSearchParams()
  if (subject && subject.trim()) {
    params.set('subject', subject)
  }
  if (body && body.trim()) {
    params.set('body', body)
  }
  const query = params.toString()
  return query ? `mailto:${trimmed}?${query}` : `mailto:${trimmed}`
}

/** Best-effort detection of a touch/mobile device (for tel: launch guidance). */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  return /Android|iPhone|iPad|iPod|Mobile|BlackBerry|Opera Mini|IEMobile/i.test(
    navigator.userAgent,
  )
}
