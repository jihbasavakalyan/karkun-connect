/**
 * KC-035A — Digital Rafeeq Voice Conversation Engine (foundation).
 *
 * Infrastructure only: session, context, state machine, resolver,
 * clarification framework, operational memory, secretary Urdu style.
 * No intent recognition, workflow execution, STT/TTS, or repositories.
 *
 * @see docs/architecture/kc-035a-arch009-gate.md
 */

export * from './types'
export * from './state/ConversationStateMachine'
export * from './session/ConversationSessionManager'
export * from './context/ContextResolver'
export * from './clarification/ClarificationFramework'
export * from './memory/ConversationMemory'
export * from './style/secretaryUrduCopy'
export * from './createConversationEngine'
export * from './bridge/mvpSessionBridge'
