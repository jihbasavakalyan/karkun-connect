/**
 * KC-035B — Natural Urdu utterance normalization.
 */

import { URDU_PHRASE_MAP, URDU_SYNONYM_MAP } from './synonymMap'

const PUNCT_RE = /[.,!?;:،۔؟…"'"`~()[\]{}<>|/\\+=_*&^%$#@]/g

/** Common Arabic/Urdu letter variants → canonical forms. Keep آ (madda) for آج. */
function normalizeLetters(text: string): string {
  return text
    .replace(/\u0649/g, '\u06cc') // ى → ی
    .replace(/\u064a/g, '\u06cc') // ي → ی
    .replace(/\u0623|\u0625/g, '\u0627') // أ إ → ا (not آ)
    .replace(/\u0629/g, '\u06c1') // ة → ہ
    .replace(/\u0643/g, '\u06a9') // ك → ک
}

function applyPhrases(text: string): string {
  let out = text
  for (const [from, to] of URDU_PHRASE_MAP) {
    out = out.split(from).join(to)
  }
  return out
}

function applySynonyms(text: string): string {
  const keys = Object.keys(URDU_SYNONYM_MAP).sort((a, b) => b.length - a.length)
  let out = text
  for (const key of keys) {
    const value = URDU_SYNONYM_MAP[key]
    if (!value) continue
    out = out.split(key).join(value)
  }
  return out
}

/**
 * Normalize natural Urdu for matching:
 * punctuation removal, whitespace collapse, letter + synonym normalization.
 */
export function normalizeUrdu(raw: string): string {
  let text = (raw ?? '').trim()
  if (!text) return ''

  text = text.toLowerCase()
  text = text.replace(PUNCT_RE, ' ')
  text = text.replace(/\s+/g, ' ').trim()
  // Phrases before alef folding so "آج کی" is not broken into "اج کی".
  text = applyPhrases(text)
  text = normalizeLetters(text)
  text = applySynonyms(text)
  text = text.replace(/\s+/g, ' ').trim()
  return text
}

export function tokenizeNormalized(normalized: string): readonly string[] {
  if (!normalized) return []
  return normalized.split(' ').filter(Boolean)
}
