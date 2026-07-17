/**
 * Runtime container (KC-004 Sprint 1.6).
 *
 * Purpose: Hold the assembled ConversationRuntime and expose a health API.
 * Ownership: Created only by Runtime Builder; consumers should not mutate module wiring.
 * Future extensions: Additional services register through the builder, then appear here.
 */

import type { AdapterRegistry } from '../adapters'
import type { CommunicationEngine } from '../communication'
import type { ContextManager } from '../context'
import type { ConversationEngine } from '../ConversationEngine'
import type { GuidanceEngine } from '../guidance'
import type { KnowledgeManager } from '../knowledge'
import type { RuntimeConfiguration } from './RuntimeConfiguration'
import {
  createRuntimeHealthApi,
  type RuntimeHealthApi,
  type RuntimeHealthReport,
} from './RuntimeHealth'
import type { RuntimeValidationResult } from './RuntimeValidation'
import type {
  ConversationRuntime,
  RuntimeBuildInformation,
  RuntimeLifecycleState,
} from './RuntimeTypes'

export type RuntimeContainerParts = {
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

/**
 * RuntimeContainer — single object exposing the composed Digital Rafeeq runtime.
 */
export class RuntimeContainer implements ConversationRuntime {
  readonly conversationEngine: ConversationEngine
  readonly contextManager: ContextManager
  readonly knowledgeManager: KnowledgeManager
  readonly guidanceEngine: GuidanceEngine
  readonly communicationEngine: CommunicationEngine
  readonly adapterRegistry: AdapterRegistry
  readonly configuration: RuntimeConfiguration
  readonly health: RuntimeHealthReport
  readonly validation: RuntimeValidationResult
  readonly lifecycleState: RuntimeLifecycleState
  readonly buildInformation: RuntimeBuildInformation
  private readonly healthApi: RuntimeHealthApi

  constructor(parts: RuntimeContainerParts) {
    this.conversationEngine = parts.conversationEngine
    this.contextManager = parts.contextManager
    this.knowledgeManager = parts.knowledgeManager
    this.guidanceEngine = parts.guidanceEngine
    this.communicationEngine = parts.communicationEngine
    this.adapterRegistry = parts.adapterRegistry
    this.configuration = parts.configuration
    this.health = parts.health
    this.validation = parts.validation
    this.lifecycleState = parts.lifecycleState
    this.buildInformation = parts.buildInformation
    this.healthApi = createRuntimeHealthApi(parts.health)
  }

  isHealthy(): boolean {
    return this.healthApi.isHealthy()
  }

  runtimeVersion(): string {
    return this.healthApi.runtimeVersion()
  }

  getBuildInformation(): RuntimeBuildInformation {
    return this.healthApi.buildInformation()
  }

  registeredPolicies(): readonly string[] {
    return this.healthApi.registeredPolicies()
  }

  registeredTemplates(): readonly string[] {
    return this.healthApi.registeredTemplates()
  }

  registeredAdapters(): readonly string[] {
    return this.healthApi.registeredAdapters()
  }

  missingDependencies(): readonly string[] {
    return this.healthApi.missingDependencies()
  }

  configurationSummary() {
    return this.healthApi.configurationSummary()
  }

  toRuntime(): ConversationRuntime {
    return {
      conversationEngine: this.conversationEngine,
      contextManager: this.contextManager,
      knowledgeManager: this.knowledgeManager,
      guidanceEngine: this.guidanceEngine,
      communicationEngine: this.communicationEngine,
      adapterRegistry: this.adapterRegistry,
      configuration: this.configuration,
      health: this.health,
      validation: this.validation,
      lifecycleState: this.lifecycleState,
      buildInformation: this.buildInformation,
    }
  }
}
