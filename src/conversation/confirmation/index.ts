/**
 * Digital Rafeeq Confirmation Orchestrator Foundation — KC-0131.8 public API.
 *
 * Decision gate between planning/orchestration and future execution.
 * Never executes business actions. No repositories, Firestore, services, AI, voice, or UI.
 *
 * @see docs/architecture/confirmation-orchestrator-foundation.md
 */

export * from './decisions/vocabulary'
export * from './decisions/models'
export {
  createConfirmationMetadata,
  createConfirmationContext,
  createConfirmationRequirement,
  createConfirmationRequest,
  createConfirmationDecision,
  createConfirmationPolicy,
  createConfirmationPromptContract,
  createConfirmationError,
  createConfirmationResult,
} from './decisions'
export * from './contracts'
export * from './policies'
export * from './contexts'
export * from './prompts'
export * from './responses'
export * from './errors'
export * from './validators'
export * from './services'

import { createConfirmationOrchestratorService } from './services'

export function createConfirmationOrchestratorFoundation() {
  const service = createConfirmationOrchestratorService()
  return {
    service,
    orchestrator: service.orchestrator,
  }
}

export type ConfirmationOrchestratorFoundation = ReturnType<
  typeof createConfirmationOrchestratorFoundation
>
