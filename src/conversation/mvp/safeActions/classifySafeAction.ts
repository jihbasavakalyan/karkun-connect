/**
 * Classify safe-action utterances (keyword only).
 */

import type { SafeActionKind } from './policy'

const CONFIRM_PATTERNS = [/^(confirm|yes|proceed|ہاں|تصدیق|کریں)$/i, /\bconfirm\b/i, /\bproceed\b/i]
const CANCEL_PATTERNS = [/^(cancel|no|stop|منسوخ|نہیں)$/i, /\bcancel\b/i]

const REMINDER_PATTERNS = [
  /\bremind\b/i,
  /یاد دلاو?/,
  /ریمائنڈر/,
  /remind me (tomorrow|this evening|before weekly ijtema|after maghrib)/i,
]

const WHATSAPP_PATTERNS = [
  /send\s+whatsapp/i,
  /whatsapp\s+(to|him|her|them)/i,
  /\bwhatsapp\b/i,
  /واٹس ایپ/,
  /واٹساپ/,
]

const CALL_PATTERNS = [
  /\bcall\b/i,
  /and call/i,
  /فون کرو?/,
  /کال کرو?/,
]

const OPEN_PROFILE = [/open .+ profile/i, /show .+ profile/i, /open contact/i, /پروفائل کھولو?/]
const OPEN_ASSIGNMENT = [/open .+ assignment/i, /show assignment/i, /تفویض کھولو?/]
const OPEN_ATTENDANCE = [/open attendance/i, /حاضری کھولو?/]
const OPEN_IJTEMA = [/open weekly ijtema/i, /اجتما کھولو?/]
const OPEN_CAMPAIGN = [/open campaign/i, /مہم کھولو?/]
const OPEN_REPORTS = [/open reports?/i, /رپورٹ کھولو?/]

export type ClassifiedSafeAction = {
  readonly kind: SafeActionKind
  readonly subject: string | null
  /** Secondary targets for compound "open campaign and reports" */
  readonly extraKinds: readonly SafeActionKind[]
}

function strip(raw: string, patterns: RegExp[]): string | null {
  let text = raw
  for (const pattern of patterns) text = text.replace(pattern, ' ')
  const cleaned = text
    .replace(/\b(to|for|and|him|her|them|it|me|tomorrow|this evening|before weekly ijtema|after maghrib)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length >= 2 ? cleaned : null
}

function isExplicitOpen(raw: string): boolean {
  return /\bopen\b/i.test(raw) || /کھولو?/.test(raw)
}

export function classifySafeAction(raw: string): ClassifiedSafeAction | null {
  const text = raw.trim()
  if (!text) return null

  if (CONFIRM_PATTERNS.some((p) => p.test(text))) {
    return { kind: 'CONFIRM', subject: null, extraKinds: [] }
  }
  if (CANCEL_PATTERNS.some((p) => p.test(text))) {
    return { kind: 'CANCEL', subject: null, extraKinds: [] }
  }

  if (REMINDER_PATTERNS.some((p) => p.test(text))) {
    return {
      kind: 'REMINDER',
      subject: strip(text, REMINDER_PATTERNS),
      extraKinds: [],
    }
  }

  // Compound: Show X and call him → CALL with subject X
  if (/\band\s+call\b/i.test(text) || /call him|call her|call them/i.test(text)) {
    const subject = strip(
      text.replace(/\band\s+call(\s+him|\s+her|\s+them)?\b/i, ' '),
      [...CALL_PATTERNS, /\bshow\b/i, /\bfind\b/i],
    )
    return { kind: 'CALL', subject, extraKinds: [] }
  }

  if (/\band\s+whatsapp\b/i.test(text) || /whatsapp him|whatsapp her/i.test(text)) {
    const subject = strip(text, [...WHATSAPP_PATTERNS, /\bshow\b/i, /\bfind\b/i, /\band\b/i])
    return { kind: 'WHATSAPP', subject, extraKinds: [] }
  }

  if (WHATSAPP_PATTERNS.some((p) => p.test(text))) {
    return {
      kind: 'WHATSAPP',
      subject: strip(text, WHATSAPP_PATTERNS),
      extraKinds: [],
    }
  }

  if (CALL_PATTERNS.some((p) => p.test(text))) {
    return {
      kind: 'CALL',
      subject: strip(text, CALL_PATTERNS),
      extraKinds: [],
    }
  }

  // Compound open campaign and reports
  if (/open campaign and reports?/i.test(text)) {
    return { kind: 'OPEN_CAMPAIGN', subject: null, extraKinds: ['OPEN_REPORTS'] }
  }

  if (OPEN_ASSIGNMENT.some((p) => p.test(text))) {
    return { kind: 'OPEN_ASSIGNMENT', subject: strip(text, OPEN_ASSIGNMENT), extraKinds: [] }
  }
  if (OPEN_PROFILE.some((p) => p.test(text))) {
    return { kind: 'OPEN_PROFILE', subject: strip(text, OPEN_PROFILE), extraKinds: [] }
  }
  if (OPEN_ATTENDANCE.some((p) => p.test(text)) && isExplicitOpen(text)) {
    return { kind: 'OPEN_ATTENDANCE', subject: null, extraKinds: [] }
  }
  if (OPEN_IJTEMA.some((p) => p.test(text))) {
    return { kind: 'OPEN_IJTEMA', subject: null, extraKinds: [] }
  }
  if (OPEN_CAMPAIGN.some((p) => p.test(text))) {
    return { kind: 'OPEN_CAMPAIGN', subject: null, extraKinds: [] }
  }
  if (OPEN_REPORTS.some((p) => p.test(text))) {
    return { kind: 'OPEN_REPORTS', subject: null, extraKinds: [] }
  }

  // "Open it" / "Show assignment"
  if (/^open it$/i.test(text) || /^کھولو$/i.test(text)) {
    return { kind: 'OPEN_PROFILE', subject: null, extraKinds: [] }
  }
  if (/^show assignment$/i.test(text)) {
    return { kind: 'OPEN_ASSIGNMENT', subject: null, extraKinds: [] }
  }

  return null
}
