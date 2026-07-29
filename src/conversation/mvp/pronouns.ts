/**
 * Resolve Urdu/English pronoun references to the last remembered person.
 */

import type { RafeeqSessionMemory } from './session'

const PRONOUN_ONLY =
  /^(ان کا|ان کی|ان کے|ان کو|اس کا|اس کی|اس کے|اس کو|them|him|her|their|his|her's|it|uska|unki|unka|iska|iski)$/i

const PRONOUN_IN_TEXT =
  /\b(ان کا|ان کی|ان کے|ان کو|اس کا|اس کی|اس کے|اس کو|their|his|her|him|them|it)\b/i

export function isPronounReference(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (PRONOUN_ONLY.test(trimmed)) return true
  return PRONOUN_IN_TEXT.test(trimmed) && trimmed.split(/\s+/).length <= 4
}

/**
 * Prefer an explicit subject; if utterance/subject is a pronoun, use last person name.
 */
export function resolveSubjectAgainstMemory(
  subject: string | null,
  memory: RafeeqSessionMemory,
  utterance: string,
): string | null {
  const explicit = subject?.trim() || null
  if (explicit && !isPronounReference(explicit)) return explicit

  if (
    isPronounReference(utterance) ||
    (explicit !== null && isPronounReference(explicit))
  ) {
    return memory.lastPersonName
  }

  return explicit
}
