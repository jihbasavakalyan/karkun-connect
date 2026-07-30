/**
 * KC-035A — Reusable clarification builders (no intent hard-coding).
 */

import { SECRETARY_URDU } from '../style/secretaryUrduCopy'
import type {
  ClarificationOption,
  ClarificationReason,
  ClarificationRequest,
} from '../types/Clarification'

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export type BuildPersonClarificationInput = {
  readonly options: readonly ClarificationOption[]
  readonly reason?: ClarificationReason
}

/**
 * Build a natural Jamaat-secretary clarification for ambiguous people.
 * Callers supply options; this framework only formats the prompt.
 */
export function buildPersonClarification(
  input: BuildPersonClarificationInput,
): ClarificationRequest {
  const options = input.options
  const header =
    options.length === 2
      ? SECRETARY_URDU.ambiguousPersonHeader
      : SECRETARY_URDU.ambiguousManyHeader

  const lines = options.map((opt) => {
    if (opt.subtitle) return `${opt.label} (${opt.subtitle})`
    return opt.label
  })

  const promptUrdu = [header, ...lines, SECRETARY_URDU.askWhichPerson].join('\n')

  return {
    id: newId('clar'),
    reason: input.reason ?? 'ambiguous_person',
    promptUrdu,
    options,
    createdAt: Date.now(),
  }
}

export function buildMissingContextClarification(promptUrdu: string): ClarificationRequest {
  return {
    id: newId('clar'),
    reason: 'missing_context',
    promptUrdu,
    options: [],
    createdAt: Date.now(),
  }
}

export function buildCustomClarification(input: {
  readonly promptUrdu: string
  readonly options?: readonly ClarificationOption[]
  readonly reason?: ClarificationReason
}): ClarificationRequest {
  return {
    id: newId('clar'),
    reason: input.reason ?? 'custom',
    promptUrdu: input.promptUrdu,
    options: input.options ?? [],
    createdAt: Date.now(),
  }
}

export type ClarificationFramework = {
  buildPersonClarification: typeof buildPersonClarification
  buildMissingContextClarification: typeof buildMissingContextClarification
  buildCustomClarification: typeof buildCustomClarification
}

export function createClarificationFramework(): ClarificationFramework {
  return {
    buildPersonClarification,
    buildMissingContextClarification,
    buildCustomClarification,
  }
}
