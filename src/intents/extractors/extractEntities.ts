/**
 * KC-035B — Entity extraction (no repository lookups).
 * Relative pronouns resolve via conversation context when present.
 */

import {
  emptyIntentEntities,
  type IntentEntities,
  type RelativePersonRef,
} from '../models/Entities'
import type { IntentConversationInput } from '../models/IntentResult'
import { normalizeUrdu } from '../urdu/normalizeUrdu'

const RELATIVE_MAP: ReadonlyArray<{ readonly needle: string; readonly ref: RelativePersonRef }> = [
  { needle: 'اسکارکن', ref: 'this_worker' },
  { needle: 'اسے', ref: 'him_her' },
  { needle: 'اسکو', ref: 'him_her' },
  { needle: 'اسیے', ref: 'him_her' },
  { needle: 'یہ', ref: 'this' },
  { needle: 'وہ', ref: 'that' },
  { needle: 'اگلا', ref: 'next' },
  { needle: 'اگلی', ref: 'next' },
  { needle: 'پچھلا', ref: 'previous' },
  { needle: 'پچھلی', ref: 'previous' },
]

const WARD_RE = /وارڈ\s*([٠-٩0-9]+)|ward\s*([0-9]+)/i
const NUMBER_RE = /(?:^|\s)([٠-٩0-9]{1,4})(?:\s|$)/
const DATE_HINTS = ['آج', 'کل', 'پرسوں', 'ہفتہ', 'مہینہ']

function arabicIndicToAscii(digit: string): string {
  const map: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  }
  return digit.replace(/[٠-٩]/g, (d) => map[d] ?? d)
}

function detectRelative(normalized: string): RelativePersonRef | null {
  for (const row of RELATIVE_MAP) {
    if (normalized.includes(row.needle)) return row.ref
  }
  // "اس کی / اس کا" after phrase map → اسکی / اسک
  if (/\bاسکی\b|\bاسکا\b|\bاسکے\b/.test(` ${normalized} `) || normalized.includes('اسکی') || normalized.includes('اسکا')) {
    return 'him_her'
  }
  return null
}

function extractPersonName(original: string, normalized: string): string | null {
  // "نام X تلاش" / search patterns
  const named = original.match(/(?:نام|تلاش|ڈھونڈو)\s+([^\s،۔.]{2,40})/u)
  if (named?.[1]) return named[1].trim()

  // Avoid treating relative-only phrases as names
  if (detectRelative(normalized)) return null
  return null
}

function extractActivity(normalized: string): string | null {
  if (normalized.includes('ملاقات')) return 'visit'
  if (normalized.includes('رابطہ')) return 'connection'
  if (normalized.includes('حاضری') || normalized.includes('اجتماع')) return 'weekly_ijtema'
  if (normalized.includes('ایپ') || normalized.includes('ایپرجسٹریشن')) return 'app_registration'
  if (normalized.includes('بیتمال') || (normalized.includes('بیت') && normalized.includes('المال'))) {
    return 'baitul_maal'
  }
  return null
}

function extractNavigationTarget(normalized: string): string | null {
  if (normalized.includes('ڈیشبورڈ')) return 'dashboard'
  if (normalized.includes('مہم')) return 'campaign'
  if (normalized.includes('رپورٹ')) return 'reports'
  if (normalized.includes('ترتیبات')) return 'settings'
  if (normalized.includes('سرگرمی')) return 'activities'
  if (normalized.includes('کارکن')) return 'workers'
  return null
}

/**
 * Extract entities from utterance + optional conversation context.
 * Does not mutate context.
 */
export function extractEntities(
  originalUtterance: string,
  normalizedUtterance: string,
  conversation?: IntentConversationInput | null,
): IntentEntities {
  const normalized = normalizedUtterance || normalizeUrdu(originalUtterance)
  const relative = detectRelative(normalized)

  let personId: string | null = null
  let personName: string | null = extractPersonName(originalUtterance, normalized)

  if (
    relative &&
    conversation?.activePerson &&
    (relative === 'this' ||
      relative === 'that' ||
      relative === 'him_her' ||
      relative === 'this_worker')
  ) {
    personId = conversation.activePerson.personId
    personName = conversation.activePerson.displayName
  }

  const wardMatch = originalUtterance.match(WARD_RE) || normalized.match(WARD_RE)
  const wardRaw = wardMatch?.[1] || wardMatch?.[2] || null
  const ward = wardRaw ? arabicIndicToAscii(wardRaw) : null

  const numMatch = normalized.match(NUMBER_RE)
  const number = numMatch?.[1] ? Number(arabicIndicToAscii(numMatch[1])) : null

  let dateText: string | null = null
  for (const hint of DATE_HINTS) {
    if (normalized.includes(hint) || originalUtterance.includes(hint)) {
      dateText = hint
      break
    }
  }

  const campaignId = conversation?.activeCampaignId ?? null
  let campaignName = conversation?.activeCampaignName ?? null
  if (normalized.includes('مہم') && !campaignName) {
    const camp = originalUtterance.match(/مہم\s+([^\s،۔.]{2,40})/u)
    if (camp?.[1]) campaignName = camp[1].trim()
  }

  return {
    ...emptyIntentEntities(),
    personName,
    personId,
    relativePerson: relative,
    campaignName,
    campaignId,
    ward,
    activity: extractActivity(normalized),
    number: Number.isFinite(number) ? number : null,
    dateText,
    navigationTarget: extractNavigationTarget(normalized),
  }
}
