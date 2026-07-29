/**
 * Canonical intent type codes — registry keys only (KC-0131.3).
 * Metadata definitions live in the registry. No execution behaviour.
 */

export type IntentTypeCode =
  | 'VISIT_UPDATE'
  | 'FOLLOW_UP'
  | 'IJTEMA_ATTENDANCE'
  | 'BAITUL_MAAL'
  | 'APP_REGISTRATION'
  | 'CALL'
  | 'WHATSAPP'
  | 'REMINDER'
  | 'SEARCH'
  | 'NAVIGATION'
  | 'REPORT'
  | 'UNKNOWN'

export const INTENT_TYPE_CODES: readonly IntentTypeCode[] = [
  'VISIT_UPDATE',
  'FOLLOW_UP',
  'IJTEMA_ATTENDANCE',
  'BAITUL_MAAL',
  'APP_REGISTRATION',
  'CALL',
  'WHATSAPP',
  'REMINDER',
  'SEARCH',
  'NAVIGATION',
  'REPORT',
  'UNKNOWN',
] as const

export function isIntentTypeCode(value: string): value is IntentTypeCode {
  return (INTENT_TYPE_CODES as readonly string[]).includes(value)
}
