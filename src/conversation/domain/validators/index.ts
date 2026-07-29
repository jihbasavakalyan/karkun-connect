/**
 * Structural validators only (KC-0131.2).
 * No business validation, authz, or repository checks.
 */

import {
  CONFIRMATION_STATES,
  CONVERSATION_PHASES,
  CONVERSATION_STATES,
  INTENT_ORIGINS,
  MESSAGE_TYPES,
  RESOLUTION_STATES,
  RESPONSE_TYPES,
  SPEAKER_TYPES,
  conversationStateToPhase,
} from '../enums'
import type {
  ConfirmationReference,
  Conversation,
  ConversationDomainGraph,
  ConversationSession,
  ConversationTurn,
  ExecutionReference,
  IntentReference,
  Message,
  Participant,
  Speaker,
} from '../entities'

export type StructuralValidationIssue = {
  readonly path: string
  readonly code: string
  readonly message: string
}

export type StructuralValidationResult = {
  readonly valid: boolean
  readonly issues: readonly StructuralValidationIssue[]
}

function issue(path: string, code: string, message: string): StructuralValidationIssue {
  return { path, code, message }
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function validateSpeaker(speaker: Speaker): StructuralValidationResult {
  const issues: StructuralValidationIssue[] = []
  if (!nonEmptyString(speaker.id)) {
    issues.push(issue('speaker.id', 'required', 'Speaker id is required'))
  }
  if (!SPEAKER_TYPES.includes(speaker.type)) {
    issues.push(issue('speaker.type', 'enum', `Unknown speaker type: ${String(speaker.type)}`))
  }
  if (speaker.role !== speaker.type) {
    issues.push(issue('speaker.role', 'mismatch', 'Speaker role must match speaker type'))
  }
  return { valid: issues.length === 0, issues }
}

export function validateParticipant(participant: Participant): StructuralValidationResult {
  const issues: StructuralValidationIssue[] = []
  if (!nonEmptyString(participant.id)) {
    issues.push(issue('participant.id', 'required', 'Participant id is required'))
  }
  if (participant.locale !== 'ur' && participant.locale !== 'en') {
    issues.push(issue('participant.locale', 'enum', 'Locale must be ur or en'))
  }
  if (!nonEmptyString(participant.language)) {
    issues.push(issue('participant.language', 'required', 'Language is required'))
  }
  return { valid: issues.length === 0, issues }
}

export function validateMessage(message: Message): StructuralValidationResult {
  const issues: StructuralValidationIssue[] = []
  if (!nonEmptyString(message.id)) {
    issues.push(issue('message.id', 'required', 'Message id is required'))
  }
  if (!nonEmptyString(message.speakerId)) {
    issues.push(issue('message.speakerId', 'required', 'Message speakerId is required'))
  }
  if (!MESSAGE_TYPES.includes(message.type)) {
    issues.push(issue('message.type', 'enum', `Unknown message type: ${String(message.type)}`))
  }
  if (typeof message.text !== 'string') {
    issues.push(issue('message.text', 'type', 'Message text must be a string'))
  }
  if (message.responseType !== null && !RESPONSE_TYPES.includes(message.responseType)) {
    issues.push(issue('message.responseType', 'enum', 'Unknown response type'))
  }
  if (!isFiniteNumber(message.createdAt)) {
    issues.push(issue('message.createdAt', 'type', 'createdAt must be a finite timestamp'))
  }
  return { valid: issues.length === 0, issues }
}

export function validateIntentReference(intent: IntentReference): StructuralValidationResult {
  const issues: StructuralValidationIssue[] = []
  if (!nonEmptyString(intent.id)) {
    issues.push(issue('intent.id', 'required', 'Intent reference id is required'))
  }
  if (!nonEmptyString(intent.code)) {
    issues.push(issue('intent.code', 'required', 'Intent code is required'))
  }
  if (!INTENT_ORIGINS.includes(intent.origin)) {
    issues.push(issue('intent.origin', 'enum', 'Unknown intent origin'))
  }
  if (!RESOLUTION_STATES.includes(intent.resolution)) {
    issues.push(issue('intent.resolution', 'enum', 'Unknown resolution state'))
  }
  if (
    intent.confidence !== null &&
    (!isFiniteNumber(intent.confidence) || intent.confidence < 0 || intent.confidence > 1)
  ) {
    issues.push(issue('intent.confidence', 'range', 'Confidence must be between 0 and 1'))
  }
  return { valid: issues.length === 0, issues }
}

export function validateExecutionReference(
  execution: ExecutionReference,
): StructuralValidationResult {
  const issues: StructuralValidationIssue[] = []
  if (!nonEmptyString(execution.id)) {
    issues.push(issue('execution.id', 'required', 'Execution reference id is required'))
  }
  if (!nonEmptyString(execution.operationCode)) {
    issues.push(issue('execution.operationCode', 'required', 'operationCode is required'))
  }
  if (!nonEmptyString(execution.summary)) {
    issues.push(issue('execution.summary', 'required', 'summary is required'))
  }
  if (!RESOLUTION_STATES.includes(execution.resolution)) {
    issues.push(issue('execution.resolution', 'enum', 'Unknown resolution state'))
  }
  return { valid: issues.length === 0, issues }
}

export function validateConfirmationReference(
  confirmation: ConfirmationReference,
): StructuralValidationResult {
  const issues: StructuralValidationIssue[] = []
  if (!nonEmptyString(confirmation.id)) {
    issues.push(issue('confirmation.id', 'required', 'Confirmation id is required'))
  }
  if (!CONFIRMATION_STATES.includes(confirmation.state)) {
    issues.push(issue('confirmation.state', 'enum', 'Unknown confirmation state'))
  }
  if (typeof confirmation.prompt !== 'string') {
    issues.push(issue('confirmation.prompt', 'type', 'prompt must be a string'))
  }
  if (!isFiniteNumber(confirmation.createdAt)) {
    issues.push(issue('confirmation.createdAt', 'type', 'createdAt must be finite'))
  }
  return { valid: issues.length === 0, issues }
}

export function validateConversationTurn(turn: ConversationTurn): StructuralValidationResult {
  const issues: StructuralValidationIssue[] = []
  if (!nonEmptyString(turn.id)) {
    issues.push(issue('turn.id', 'required', 'Turn id is required'))
  }
  if (!nonEmptyString(turn.sessionId)) {
    issues.push(issue('turn.sessionId', 'required', 'sessionId is required'))
  }
  if (!Number.isInteger(turn.index) || turn.index < 0) {
    issues.push(issue('turn.index', 'range', 'index must be a non-negative integer'))
  }
  if (!nonEmptyString(turn.speakerId)) {
    issues.push(issue('turn.speakerId', 'required', 'speakerId is required'))
  }
  if (
    turn.completedAt !== null &&
    (!isFiniteNumber(turn.completedAt) || turn.completedAt < turn.startedAt)
  ) {
    issues.push(issue('turn.completedAt', 'range', 'completedAt must be >= startedAt'))
  }
  return { valid: issues.length === 0, issues }
}

export function validateConversationSession(
  session: ConversationSession,
): StructuralValidationResult {
  const issues: StructuralValidationIssue[] = []
  if (!nonEmptyString(session.id)) {
    issues.push(issue('session.id', 'required', 'Session id is required'))
  }
  if (!nonEmptyString(session.conversationId)) {
    issues.push(issue('session.conversationId', 'required', 'conversationId is required'))
  }
  if (!CONVERSATION_STATES.includes(session.state)) {
    issues.push(issue('session.state', 'enum', 'Unknown conversation state'))
  }
  if (!CONVERSATION_PHASES.includes(session.phase)) {
    issues.push(issue('session.phase', 'enum', 'Unknown conversation phase'))
  }
  if (session.phase !== conversationStateToPhase(session.state)) {
    issues.push(
      issue('session.phase', 'mismatch', 'phase must align with conversationStateToPhase(state)'),
    )
  }
  if (
    session.endedAt !== null &&
    (!isFiniteNumber(session.endedAt) || session.endedAt < session.createdAt)
  ) {
    issues.push(issue('session.endedAt', 'range', 'endedAt must be >= createdAt'))
  }
  return { valid: issues.length === 0, issues }
}

export function validateConversation(conversation: Conversation): StructuralValidationResult {
  const issues: StructuralValidationIssue[] = []
  if (!nonEmptyString(conversation.id)) {
    issues.push(issue('conversation.id', 'required', 'Conversation id is required'))
  }
  if (conversation.locale !== 'ur' && conversation.locale !== 'en') {
    issues.push(issue('conversation.locale', 'enum', 'Locale must be ur or en'))
  }
  if (
    conversation.activeSessionId !== null &&
    !conversation.sessionIds.includes(conversation.activeSessionId)
  ) {
    issues.push(
      issue(
        'conversation.activeSessionId',
        'reference',
        'activeSessionId must be listed in sessionIds',
      ),
    )
  }
  if (conversation.updatedAt < conversation.createdAt) {
    issues.push(issue('conversation.updatedAt', 'range', 'updatedAt must be >= createdAt'))
  }
  return { valid: issues.length === 0, issues }
}

export function validateConversationDomainGraph(
  graph: ConversationDomainGraph,
): StructuralValidationResult {
  const issues: StructuralValidationIssue[] = [
    ...validateConversation(graph.conversation).issues,
  ]

  for (const session of Object.values(graph.sessions)) {
    issues.push(...validateConversationSession(session).issues)
    if (session.conversationId !== graph.conversation.id) {
      issues.push(
        issue(
          `sessions.${session.id}.conversationId`,
          'reference',
          'Session conversationId mismatch',
        ),
      )
    }
  }

  for (const turn of Object.values(graph.turns)) {
    issues.push(...validateConversationTurn(turn).issues)
    if (!graph.sessions[turn.sessionId]) {
      issues.push(
        issue(`turns.${turn.id}.sessionId`, 'reference', 'Turn references unknown session'),
      )
    }
  }

  for (const speaker of Object.values(graph.speakers)) {
    issues.push(...validateSpeaker(speaker).issues)
  }
  for (const participant of Object.values(graph.participants)) {
    issues.push(...validateParticipant(participant).issues)
  }
  for (const message of Object.values(graph.messages)) {
    issues.push(...validateMessage(message).issues)
  }
  for (const intent of Object.values(graph.intents)) {
    issues.push(...validateIntentReference(intent).issues)
  }
  for (const execution of Object.values(graph.executions)) {
    issues.push(...validateExecutionReference(execution).issues)
  }
  for (const confirmation of Object.values(graph.confirmations)) {
    issues.push(...validateConfirmationReference(confirmation).issues)
  }

  return { valid: issues.length === 0, issues }
}
