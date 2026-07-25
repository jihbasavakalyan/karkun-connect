/**
 * KC-0119 — Editorial Validator for context-aware communication.
 * Automatic validation before Preview; revalidate after edits.
 */

export const EDITORIAL_GREETING = 'السلام علیکم ورحمۃ اللہ وبرکاتہ'
export const EDITORIAL_DUA = 'اللہ تعالیٰ آپ کی کوششوں کو قبول فرمائے۔'
export const EDITORIAL_CLOSING = 'والسلام'

/** Prohibited machine / bureaucratic wording (KC-0118 / KC-0119). */
export const EDITORIAL_PROHIBITED = [
  'اپ ڈیٹس',
  'کارروائی',
  'ٹاسک',
  'اسٹیٹس',
  'ریمائنڈر',
  'بہ سہولت',
  'اگر ممکن ہو',
] as const

export type EditorialRuleId =
  | 'greeting'
  | 'closing'
  | 'dua'
  | 'prohibited-vocabulary'
  | 'english-numerals'
  | 'bullet-formatting'
  | 'mobile-length'
  | 'empty-sections'
  | 'duplicate-paragraphs'

export type EditorialRuleResult = {
  id: EditorialRuleId
  label: string
  passed: boolean
  detail: string
}

export type EditorialValidationResult = {
  ok: boolean
  status: 'Editorial Approved' | 'Editorial Review Required'
  failedRules: EditorialRuleResult[]
  allRules: EditorialRuleResult[]
}

const ARABIC_INDIC_DIGIT = /[٠-٩۰-۹]/
const MAX_MOBILE_CHARS = 1600
const MIN_MOBILE_CHARS = 80

export function validateEditorialMessage(
  message: string,
  options?: { pendingMatterCount?: number },
): EditorialValidationResult {
  const text = message.trim()
  const pendingMatterCount = options?.pendingMatterCount ?? 0
  const rules: EditorialRuleResult[] = []

  const hasGreeting = text.includes(EDITORIAL_GREETING)
  rules.push({
    id: 'greeting',
    label: 'Mandatory greeting',
    passed: hasGreeting,
    detail: hasGreeting
      ? 'Greeting present'
      : `Missing required greeting: ${EDITORIAL_GREETING}`,
  })

  const hasClosing = text.includes(EDITORIAL_CLOSING)
  rules.push({
    id: 'closing',
    label: 'Mandatory closing',
    passed: hasClosing,
    detail: hasClosing
      ? 'Closing present'
      : `Missing required closing: ${EDITORIAL_CLOSING}`,
  })

  const hasDua = text.includes(EDITORIAL_DUA)
  rules.push({
    id: 'dua',
    label: 'Mandatory dua',
    passed: hasDua,
    detail: hasDua ? 'Dua present' : `Missing required dua: ${EDITORIAL_DUA}`,
  })

  const prohibitedHit = EDITORIAL_PROHIBITED.find((word) => text.includes(word))
  rules.push({
    id: 'prohibited-vocabulary',
    label: 'Prohibited vocabulary',
    passed: !prohibitedHit,
    detail: prohibitedHit
      ? `Contains prohibited wording: ${prohibitedHit}`
      : 'No prohibited wording found',
  })

  const hasArabicIndic = ARABIC_INDIC_DIGIT.test(text)
  rules.push({
    id: 'english-numerals',
    label: 'English numerals',
    passed: !hasArabicIndic,
    detail: hasArabicIndic
      ? 'Use English numerals (0–9), not Arabic-Indic digits'
      : 'English numerals used (or no digits)',
  })

  const bulletCount = (text.match(/•/g) ?? []).length
  const bulletsOk = pendingMatterCount <= 1 || bulletCount >= Math.min(pendingMatterCount, 2)
  rules.push({
    id: 'bullet-formatting',
    label: 'Bullet formatting',
    passed: bulletsOk,
    detail: bulletsOk
      ? 'Bullet formatting acceptable'
      : 'Multiple pending matters should use bullet points (•)',
  })

  const lengthOk = text.length >= MIN_MOBILE_CHARS && text.length <= MAX_MOBILE_CHARS
  rules.push({
    id: 'mobile-length',
    label: 'Mobile-readable length',
    passed: lengthOk,
    detail: lengthOk
      ? `Length ${text.length} characters`
      : `Message length ${text.length} is outside ${MIN_MOBILE_CHARS}–${MAX_MOBILE_CHARS} characters`,
  })

  const paragraphs = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  const hasEmptyGapIssue = /\n{4,}/.test(message)
  rules.push({
    id: 'empty-sections',
    label: 'No empty sections',
    passed: paragraphs.length > 0 && !hasEmptyGapIssue,
    detail:
      paragraphs.length === 0
        ? 'Message is empty'
        : hasEmptyGapIssue
          ? 'Excessive blank sections detected'
          : 'Sections present',
  })

  const seen = new Set<string>()
  let duplicate = false
  for (const paragraph of paragraphs) {
    const key = paragraph.replace(/\s+/g, ' ')
    if (seen.has(key)) {
      duplicate = true
      break
    }
    seen.add(key)
  }
  rules.push({
    id: 'duplicate-paragraphs',
    label: 'No duplicate paragraphs',
    passed: !duplicate,
    detail: duplicate ? 'Duplicate paragraphs found' : 'No duplicate paragraphs',
  })

  const failedRules = rules.filter((rule) => !rule.passed)
  const ok = failedRules.length === 0
  return {
    ok,
    status: ok ? 'Editorial Approved' : 'Editorial Review Required',
    failedRules,
    allRules: rules,
  }
}
