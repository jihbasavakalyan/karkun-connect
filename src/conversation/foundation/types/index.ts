/**
 * Foundation type barrel (KC-0131.1).
 */

export {
  FOUNDATION_CONVERSATION_STATES,
  FOUNDATION_LIFECYCLE_TRANSITIONS,
  isLegalFoundationTransition,
  type ConfirmationDecision,
  type ConversationChannel,
  type ConversationResponseKind,
  type ConversationRole,
  type ConversationState,
  type ExecutionPlanStepStatus,
  type IntentStatus,
  type SessionEndReason,
} from './ConversationState'

export {
  createIntent,
  createIntentCollection,
  type Intent,
  type IntentCollection,
  type IntentId,
} from './Intent'

export {
  createExecutionPlan,
  createExecutionPlanStep,
  type ExecutionPlan,
  type ExecutionPlanId,
  type ExecutionPlanStep,
  type ExecutionPlanStepId,
} from './ExecutionPlan'

export {
  createConfirmationRequest,
  withConfirmationDecision,
  type ConfirmationRequest,
  type ConfirmationRequestId,
} from './Confirmation'

export {
  createConversationResponse,
  type ConversationResponse,
  type ConversationResponseId,
} from './Response'

export {
  createConversationTurn,
  createEmptyConversationContext,
  type ConversationContext,
  type ConversationTurn,
  type ConversationTurnId,
} from './Context'

export type {
  ConversationSession,
  ConversationSessionId,
  ConversationSessionSnapshot,
} from './Session'
