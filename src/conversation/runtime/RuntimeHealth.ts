/**
 * Runtime health model (KC-004 Sprint 1.6).
 *
 * Purpose: Report composition health — not repository or Firestore status.
 * Ownership: Runtime Builder produces health after validation.
 * Future extensions: Optional AI adapter registration counts under feature flags.
 */

import type { AdapterRegistry } from '../adapters'
import type { CommunicationEngine } from '../communication'
import type { GuidanceEngine } from '../guidance'
import type { RuntimeBuildInformation, RuntimeLifecycleState } from './RuntimeTypes'
import type { RuntimeConfiguration } from './RuntimeConfiguration'
import type { RuntimeValidationResult } from './RuntimeValidation'
import { RUNTIME_VERSION } from './RuntimeTypes'

export type RuntimeHealthReport = {
  healthy: boolean
  runtimeVersion: string
  buildInformation: RuntimeBuildInformation
  lifecycleState: RuntimeLifecycleState
  registeredPolicies: readonly string[]
  registeredTemplates: readonly string[]
  registeredAdapters: readonly string[]
  missingDependencies: readonly string[]
  configurationSummary: RuntimeConfigurationSummary
}

export type RuntimeConfigurationSummary = {
  environment: string
  defaultLocale: string
  defaultChannel: string
  guidanceDefaults: boolean
  communicationDefaults: boolean
  futureAiEnabled: boolean
  loggingEnabled: boolean
  tracingEnabled: boolean
  expectedAdapterCount: number
  registeredAdapterCount: number
}

export type RuntimeHealthInput = {
  buildInformation: RuntimeBuildInformation
  lifecycleState: RuntimeLifecycleState
  validation: RuntimeValidationResult
  configuration: RuntimeConfiguration
  guidanceEngine: GuidanceEngine
  communicationEngine: CommunicationEngine
  adapterRegistry: AdapterRegistry
}

export function createRuntimeHealthReport(input: RuntimeHealthInput): RuntimeHealthReport {
  const registeredPolicies = input.guidanceEngine
    .getRegistry()
    .getPolicies()
    .map((policy) => policy.policyId)

  const registeredTemplates = input.communicationEngine
    .getRegistry()
    .getAll()
    .map((template) => template.templateKey)

  const registeredAdapters = [...input.adapterRegistry.getRegisteredAdapterIds()]

  const missingDependencies = [
    ...input.validation.missingModules,
    ...input.validation.issues
      .filter((issue) => issue.code === 'ExpectedAdapterMissing')
      .map((issue) => issue.message),
  ]

  return {
    healthy: input.validation.valid && input.lifecycleState === 'ready',
    runtimeVersion: RUNTIME_VERSION,
    buildInformation: input.buildInformation,
    lifecycleState: input.lifecycleState,
    registeredPolicies,
    registeredTemplates,
    registeredAdapters,
    missingDependencies,
    configurationSummary: {
      environment: input.configuration.environment,
      defaultLocale: input.configuration.localization.defaultLocale,
      defaultChannel: input.configuration.conversation.defaultChannel,
      guidanceDefaults: input.configuration.featureFlags.enableGuidanceDefaults,
      communicationDefaults: input.configuration.featureFlags.enableCommunicationDefaults,
      futureAiEnabled: input.configuration.featureFlags.enableFutureAi,
      loggingEnabled: input.configuration.logging.enabled,
      tracingEnabled: input.configuration.tracing.enabled,
      expectedAdapterCount: input.configuration.adapters.expectedAdapterIds.length,
      registeredAdapterCount: registeredAdapters.length,
    },
  }
}

export type RuntimeHealthApi = {
  isHealthy(): boolean
  runtimeVersion(): string
  buildInformation(): RuntimeBuildInformation
  registeredPolicies(): readonly string[]
  registeredTemplates(): readonly string[]
  registeredAdapters(): readonly string[]
  missingDependencies(): readonly string[]
  configurationSummary(): RuntimeConfigurationSummary
}

export function createRuntimeHealthApi(report: RuntimeHealthReport): RuntimeHealthApi {
  return {
    isHealthy: () => report.healthy,
    runtimeVersion: () => report.runtimeVersion,
    buildInformation: () => report.buildInformation,
    registeredPolicies: () => report.registeredPolicies,
    registeredTemplates: () => report.registeredTemplates,
    registeredAdapters: () => report.registeredAdapters,
    missingDependencies: () => report.missingDependencies,
    configurationSummary: () => report.configurationSummary,
  }
}
