/**
 * KC-035C — Digital Rafeeq Operational Workflow Engine.
 *
 * Orchestrates intents → workflows → existing services/repositories.
 * Does not embed visit/ijtema/BM/app business rules.
 *
 * @see docs/architecture/kc-035c-arch009-gate.md
 */

export * from './models'
export * from './definitions'
export * from './registry'
export * from './responses'
export * from './policies/nextActionPolicy'
export * from './policies/permissions'
export * from './handlers/serviceAdapters'
export * from './handlers/workflowHandlers'
export * from './steps/personSteps'
export * from './executor/WorkflowExecutor'
export * from './engine/createWorkflowEngine'
