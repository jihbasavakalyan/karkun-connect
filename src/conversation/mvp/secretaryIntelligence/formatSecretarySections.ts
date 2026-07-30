/**
 * Shared Urdu section formatter for secretary answers.
 */

const FORBIDDEN_ENGLISH =
  /\b(Status|Pending|Risk|Recommendation|Current Progress|Needs Attention|Healthy|Urgent|Dormant|On Track|Immediate Action|No active module)\b/

export function assertNoChatbotEnglish(text: string): boolean {
  return !FORBIDDEN_ENGLISH.test(text)
}

export function formatSecretarySections(input: {
  situation: string
  progress: readonly string[]
  remaining: readonly string[]
  attention: readonly string[]
  nextPlan: readonly string[]
  advice: string
  /** When true, lead with remaining work (follow-up «کیا باقی ہے؟»). */
  remainingFirst?: boolean
}): string {
  const progressLines =
    input.progress.length > 0
      ? input.progress.map((line) => `✓ ${line}`)
      : ['✓ ابھی کوئی نمایاں پیش رفت درج نہیں۔']
  const remainingLines =
    input.remaining.length > 0
      ? input.remaining.map((line) => `◻ ${line}`)
      : ['◻ اس وقت کوئی واضح باقی کام نہیں۔']
  const attentionLines =
    input.attention.length > 0
      ? input.attention.map((line) => `• ${line}`)
      : ['• کوئی فوری خطرہ نظر نہیں آتا۔']
  const planLines =
    input.nextPlan.length > 0
      ? input.nextPlan.map((line) => `• ${line}`)
      : ['• موجودہ رفتار برقرار رکھیں۔']

  const blocks: string[] = []

  if (input.remainingFirst) {
    blocks.push('باقی کام', '', ...remainingLines, '')
    blocks.push('موجودہ صورتحال', '', input.situation.trim(), '')
  } else {
    blocks.push('موجودہ صورتحال', '', input.situation.trim(), '')
  }

  blocks.push('اہم پیش رفت', '', ...progressLines, '')
  if (!input.remainingFirst) {
    blocks.push('باقی کام', '', ...remainingLines, '')
  }
  blocks.push('قابلِ توجہ امور', '', ...attentionLines, '')
  blocks.push('آئندہ لائحۂ عمل', '', ...planLines, '')
  blocks.push('تجویز', '', input.advice.trim())

  return blocks.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function markCheck(item: { label: string; done: boolean }): string {
  return item.done ? `✓ ${item.label}` : `◻ ${item.label}`
}
