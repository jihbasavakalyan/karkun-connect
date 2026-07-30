/**
 * KC-035D — Dialogue models.
 * @see docs/architecture/kc-035-digital-rafeeq-2.md
 * @see docs/architecture/kc-035d-arch009-gate.md
 */

import type { IntentCode, IntentRecognitionResult } from '@/intents'
import type { WorkflowExecutionResult } from '@/workflows'

export type DialogueMove =
  | 'cancel'
  | 'restart'
  | 'resume'
  | 'repeat'
  | 'help'
  | 'correct'
  | 'switch_person'
  | 'interrupt'
  | 'clarify_answer'
  | 'route_workflow'
  | 'next'
  | 'acknowledge_unknown'

export type DialogueTurnKind =
  | 'responded'
  | 'clarifying'
  | 'awaiting_confirmation'
  | 'executed'
  | 'suggested_next'
  | 'cancelled'
  | 'switched'
  | 'interrupted'
  | 'repaired'
  | 'noop'

export type ParkedDialogueWork = {
  readonly intent: IntentCode
  readonly personId: string
  readonly personName: string
  readonly labelUrdu: string
}

export type DialogueSessionState = {
  readonly sessionId: string
  interruptStack: ParkedDialogueWork[]
  lastMove: DialogueMove | null
  /** Intent that was interrupted / awaiting clarification resolution. */
  repairIntent: IntentCode | null
  updatedAt: number
}

export type DialogueTurnResult = {
  readonly kind: DialogueTurnKind
  readonly move: DialogueMove
  readonly responseUrdu: string
  readonly recognition: IntentRecognitionResult
  readonly workflowResult: WorkflowExecutionResult | null
}
