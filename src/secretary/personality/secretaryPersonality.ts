/**
 * KC-035G — Secretary personality templates & light variation.
 * Administrative Urdu only — no AI / software wording.
 */

export const SECRETARY_ACK_VARIANTS = ['جی۔', 'بالکل۔', 'جی، حاضر۔'] as const

export const SECRETARY_TEMPLATES = {
  saved: 'محفوظ کر دیا گیا۔',
  completed: 'یہ کارروائی مکمل ہو گئی۔',
  nextStep: 'اب اگلا مناسب قدم یہ ہے۔',
  situation: (name: string) => `${name} کی موجودہ صورتحال یہ ہے۔`,
  oneMore: 'مزید ایک کارروائی باقی ہے۔',
  onlyRemaining: (label: string) => `اب صرف ${label} باقی ہے۔`,
  guided: (label: string) => `کیا ${label} بھی درج کر دوں؟`,
  recovered: 'ٹھیک ہے، دوبارہ کوشش کرتے ہیں۔',
  brief: 'پیش خدمت ہے۔',
} as const

let ackCursor = 0

/** Deterministic rotation — avoids robotic identical acknowledgements. */
export function nextAcknowledgement(seed?: number): string {
  if (typeof seed === 'number') {
    return SECRETARY_ACK_VARIANTS[
      Math.abs(seed) % SECRETARY_ACK_VARIANTS.length
    ]!
  }
  const line = SECRETARY_ACK_VARIANTS[ackCursor % SECRETARY_ACK_VARIANTS.length]!
  ackCursor += 1
  return line
}

export function resetSecretaryVariationForTests(): void {
  ackCursor = 0
}

export function composeSecretaryResponse(parts: {
  readonly acknowledge?: boolean
  readonly body: string
  readonly seed?: number
}): string {
  const body = parts.body.trim()
  if (!parts.acknowledge) return body
  const ack = nextAcknowledgement(parts.seed)
  if (body.startsWith('جی') || body.startsWith('بالکل')) return body
  return `${ack}\n${body}`
}

export function polishSavedLine(detail?: string): string {
  const base = `جی، ${SECRETARY_TEMPLATES.saved}`
  return detail?.trim() ? `${base} ${detail.trim()}` : base
}

export function polishCompletedWithNext(nextLabel?: string | null): string {
  if (!nextLabel) {
    return `${SECRETARY_TEMPLATES.completed}\nالحمد للہ۔`
  }
  return [
    SECRETARY_TEMPLATES.completed,
    SECRETARY_TEMPLATES.onlyRemaining(nextLabel),
    SECRETARY_TEMPLATES.guided(nextLabel),
  ].join('\n')
}
