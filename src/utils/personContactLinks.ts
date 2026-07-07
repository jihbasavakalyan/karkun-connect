import { normalizeMobile } from '@/lib/mobileValidation'

export const MOBILE_INPUT_PLACEHOLDER = '+91 9876543210'

export function buildTelLink(mobile: string): string | null {
  const digits = normalizeMobile(mobile)
  if (!digits) {
    return null
  }
  return `tel:+91${digits}`
}

export function buildWhatsAppLink(number: string): string | null {
  const digits = normalizeMobile(number)
  if (!digits) {
    return null
  }
  return `https://wa.me/91${digits}`
}
