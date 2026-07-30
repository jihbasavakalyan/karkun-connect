/**
 * KC-035A — Clarification framework (reusable; no hard-coded intents).
 */

export type ClarificationReason =
  | 'ambiguous_person'
  | 'ambiguous_action'
  | 'missing_context'
  | 'confirm'
  | 'custom'

export type ClarificationOption = {
  readonly id: string
  readonly label: string
  /** Secondary line — e.g. ward / role disambiguator. */
  readonly subtitle?: string
  readonly payload?: Readonly<Record<string, unknown>>
}

export type ClarificationRequest = {
  readonly id: string
  readonly reason: ClarificationReason
  /** Full Urdu prompt already composed for secretary voice. */
  readonly promptUrdu: string
  readonly options: readonly ClarificationOption[]
  readonly createdAt: number
}

export type ClarificationSelection = {
  readonly clarificationId: string
  readonly optionId: string
}
