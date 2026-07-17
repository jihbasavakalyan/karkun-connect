/**
 * Runtime Builder — dependency injection composition root (KC-004 Sprint 1.6).
 *
 * Purpose: Construct and wire all conversation modules without modules instantiating each other.
 * Ownership: Object construction, DI, configuration, startup validation, lifecycle, health.
 * Future extensions: Register AI adapters, localization packs, and analytics via configuration hooks.
 *
 * Dependency order (bottom-up):
 * Adapter Registry → Communication Engine → Guidance Engine →
 * Knowledge Manager → Context Manager → Conversation Engine
 */

import { AdapterRegistry, createAdapterRegistry } from '../adapters'
import { createCommunicationEngine } from '../communication'
import { createContextManager } from '../context'
import { createConversationEngine } from '../ConversationEngine'
import { createGuidanceEngine } from '../guidance'
import { createKnowledgeManager } from '../knowledge'
import {
  createDefaultRuntimeConfiguration,
  mergeRuntimeConfiguration,
  type RuntimeConfiguration,
  type RuntimeConfigurationOverrides,
} from './RuntimeConfiguration'
import { RuntimeContainer } from './RuntimeContainer'
import { createRuntimeHealthReport } from './RuntimeHealth'
import { validateRuntimeComposition } from './RuntimeValidation'
import type {
  RuntimeBuildInformation,
  RuntimeEnvironment,
  RuntimeLifecycleState,
} from './RuntimeTypes'
import { RUNTIME_VERSION } from './RuntimeTypes'

export type RuntimeBuilderOptions = {
  configuration?: RuntimeConfiguration
  configurationOverrides?: RuntimeConfigurationOverrides
  environment?: RuntimeEnvironment
  packageVersion?: string
  /** Optional pre-built adapter registry (e.g. with adapters registered externally). */
  adapterRegistry?: AdapterRegistry
}

/**
 * RuntimeBuilder — assembles ConversationRuntime via dependency injection only.
 */
export class RuntimeBuilder {
  private readonly options: RuntimeBuilderOptions

  constructor(options: RuntimeBuilderOptions = {}) {
    this.options = options
  }

  build(): RuntimeContainer {
    const environment =
      this.options.environment ??
      this.options.configuration?.environment ??
      this.options.configurationOverrides?.environment ??
      'custom'

    const configuration = mergeRuntimeConfiguration(
      this.options.configuration ?? createDefaultRuntimeConfiguration(environment),
      this.options.configurationOverrides,
    )

    const buildInformation: RuntimeBuildInformation = {
      runtimeVersion: RUNTIME_VERSION,
      packageVersion: this.options.packageVersion ?? '1.0.0-rc.1',
      environment: configuration.environment,
      builtAt: Date.now(),
    }

    // 1. Adapter Registry (leaf)
    const adapterRegistry =
      this.options.adapterRegistry ?? createAdapterRegistry()

    // 2. Communication Engine
    const communicationEngine = createCommunicationEngine({
      registerDefaults:
        configuration.featureFlags.enableCommunicationDefaults &&
        configuration.communication.registerDefaults &&
        configuration.conversation.registerDefaultTemplates,
    })

    // 3. Guidance Engine ← Communication Engine
    const guidanceEngine = createGuidanceEngine({
      registerDefaults:
        configuration.featureFlags.enableGuidanceDefaults &&
        configuration.conversation.registerDefaultPolicies,
      communicationManager: communicationEngine,
    })

    // 4. Knowledge Manager ← Guidance Engine + Adapter Registry
    const knowledgeManager = createKnowledgeManager({
      guidanceManager: guidanceEngine,
      adapterRegistry,
    })

    // 5. Context Manager ← Knowledge Manager
    const contextManager = createContextManager({
      knowledgeManager,
    })

    // 6. Conversation Engine ← Context Manager
    const conversationEngine = createConversationEngine({
      contextManager,
    })

    const validation = validateRuntimeComposition({
      conversationEngine,
      contextManager,
      knowledgeManager,
      guidanceEngine,
      communicationEngine,
      adapterRegistry,
      configuration,
      registeredAdapterIds: adapterRegistry.getRegisteredAdapterIds(),
    })

    const lifecycleState: RuntimeLifecycleState = validation.valid
      ? 'ready'
      : 'unhealthy'

    const health = createRuntimeHealthReport({
      buildInformation,
      lifecycleState,
      validation,
      configuration,
      guidanceEngine,
      communicationEngine,
      adapterRegistry,
    })

    return new RuntimeContainer({
      conversationEngine,
      contextManager,
      knowledgeManager,
      guidanceEngine,
      communicationEngine,
      adapterRegistry,
      configuration,
      health,
      validation,
      lifecycleState,
      buildInformation,
    })
  }
}

export function createRuntimeBuilder(
  options?: RuntimeBuilderOptions,
): RuntimeBuilder {
  return new RuntimeBuilder(options)
}
