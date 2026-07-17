/**
 * Runtime composition types (KC-004 Sprint 1.6).
 *
 * Purpose: Shared contracts for the Digital Rafeeq runtime composition root.
 * Ownership: Runtime Builder owns assembly; individual engines remain independent.
 * Future extensions: AI adapters, localization packs, and analytics plug into configuration.
 */

import type { AdapterRegistry } from '../adapters'
import type { CommunicationEngine } from '../communication'
import type { ContextManager } from '../context'
import type { ConversationEngine } from '../ConversationEngine'
import type { GuidanceEngine } from '../guidance'
import type { KnowledgeManager } from '../knowledge'
import type { RuntimeConfiguration } from './RuntimeConfiguration'
import type { RuntimeHealthReport } from './RuntimeHealth'
import type { RuntimeValidationResult } from './RuntimeValidation'

export type RuntimeEnvironment = 'development' | 'testing' | 'production' | 'custom'

export type RuntimeLifecycleState =
  | 'uninitialized'
  | 'building'
  | 'validating'
  | 'ready'
  | 'unhealthy'
  | 'stopped'

export type RuntimeBuildInformation = {
  runtimeVersion: string
  packageVersion: string
  environment: RuntimeEnvironment
  builtAt: number
}

/**
 * Assembled Digital Rafeeq conversation runtime.
 *
 * Purpose: Single entry object exposing all composed modules.
 * Typical usage: Obtained from RuntimeFactory; never constructed ad hoc.
 */
export type ConversationRuntime = {
  conversationEngine: ConversationEngine
  contextManager: ContextManager
  knowledgeManager: KnowledgeManager
  guidanceEngine: GuidanceEngine
  communicationEngine: CommunicationEngine
  adapterRegistry: AdapterRegistry
  configuration: RuntimeConfiguration
  health: RuntimeHealthReport
  validation: RuntimeValidationResult
  lifecycleState: RuntimeLifecycleState
  buildInformation: RuntimeBuildInformation
}

export type RuntimeModuleId =
  | 'conversationEngine'
  | 'contextManager'
  | 'knowledgeManager'
  | 'guidanceEngine'
  | 'communicationEngine'
  | 'adapterRegistry'

export const RUNTIME_DEPENDENCY_ORDER: readonly RuntimeModuleId[] = [
  'adapterRegistry',
  'communicationEngine',
  'guidanceEngine',
  'knowledgeManager',
  'contextManager',
  'conversationEngine',
] as const

export const RUNTIME_VERSION = '1.6.0'
