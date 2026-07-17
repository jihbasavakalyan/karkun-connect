/**
 * Runtime startup validation (KC-004 Sprint 1.6).
 *
 * Purpose: Verify all required modules are registered before runtime is ready.
 * Ownership: Runtime Builder invokes validation; failures are typed results, not exceptions.
 * Future extensions: Add optional AI adapter and localization pack checks behind feature flags.
 */

import type { ConversationRuntime, RuntimeModuleId } from './RuntimeTypes'
import { RUNTIME_DEPENDENCY_ORDER } from './RuntimeTypes'
import type { RuntimeConfiguration } from './RuntimeConfiguration'

export type RuntimeValidationIssue = {
  code:
    | 'MissingModule'
    | 'MissingDependency'
    | 'DependencyOrderViolation'
    | 'ConfigurationIncomplete'
    | 'ExpectedAdapterMissing'
  moduleId?: RuntimeModuleId
  message: string
}

export type RuntimeValidationResult = {
  valid: boolean
  issues: readonly RuntimeValidationIssue[]
  registeredModules: readonly RuntimeModuleId[]
  missingModules: readonly RuntimeModuleId[]
}

type RuntimeValidationInput = {
  conversationEngine: unknown | null
  contextManager: unknown | null
  knowledgeManager: unknown | null
  guidanceEngine: unknown | null
  communicationEngine: unknown | null
  adapterRegistry: unknown | null
  configuration: RuntimeConfiguration
  registeredAdapterIds: readonly string[]
}

/**
 * Validate runtime composition — no exceptions for expected failures.
 */
export function validateRuntimeComposition(
  input: RuntimeValidationInput,
): RuntimeValidationResult {
  const issues: RuntimeValidationIssue[] = []
  const registeredModules: RuntimeModuleId[] = []
  const missingModules: RuntimeModuleId[] = []

  const modulePresence: Record<RuntimeModuleId, unknown | null> = {
    adapterRegistry: input.adapterRegistry,
    communicationEngine: input.communicationEngine,
    guidanceEngine: input.guidanceEngine,
    knowledgeManager: input.knowledgeManager,
    contextManager: input.contextManager,
    conversationEngine: input.conversationEngine,
  }

  for (const moduleId of RUNTIME_DEPENDENCY_ORDER) {
    if (modulePresence[moduleId]) {
      registeredModules.push(moduleId)
    } else {
      missingModules.push(moduleId)
      issues.push({
        code: 'MissingModule',
        moduleId,
        message: `Required module "${moduleId}" is not registered.`,
      })
    }
  }

  // Dependency graph: each module after the first requires prior modules present.
  for (let index = 1; index < RUNTIME_DEPENDENCY_ORDER.length; index += 1) {
    const moduleId = RUNTIME_DEPENDENCY_ORDER[index]
    const dependencyId = RUNTIME_DEPENDENCY_ORDER[index - 1]
    if (modulePresence[moduleId] && !modulePresence[dependencyId]) {
      issues.push({
        code: 'MissingDependency',
        moduleId,
        message: `Module "${moduleId}" requires dependency "${dependencyId}".`,
      })
    }
  }

  if (!input.configuration.localization.defaultLocale) {
    issues.push({
      code: 'ConfigurationIncomplete',
      message: 'Localization defaultLocale is required.',
    })
  }

  if (input.configuration.adapters.requireAdaptersAtStartup) {
    for (const expectedId of input.configuration.adapters.expectedAdapterIds) {
      if (!input.registeredAdapterIds.includes(expectedId)) {
        issues.push({
          code: 'ExpectedAdapterMissing',
          message: `Expected adapter "${expectedId}" is not registered.`,
        })
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    registeredModules,
    missingModules,
  }
}

export function validateConversationRuntime(
  runtime: Pick<
    ConversationRuntime,
    | 'conversationEngine'
    | 'contextManager'
    | 'knowledgeManager'
    | 'guidanceEngine'
    | 'communicationEngine'
    | 'adapterRegistry'
    | 'configuration'
  >,
): RuntimeValidationResult {
  return validateRuntimeComposition({
    conversationEngine: runtime.conversationEngine,
    contextManager: runtime.contextManager,
    knowledgeManager: runtime.knowledgeManager,
    guidanceEngine: runtime.guidanceEngine,
    communicationEngine: runtime.communicationEngine,
    adapterRegistry: runtime.adapterRegistry,
    configuration: runtime.configuration,
    registeredAdapterIds: runtime.adapterRegistry.getRegisteredAdapterIds(),
  })
}
