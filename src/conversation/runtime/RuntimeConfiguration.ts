/**
 * Runtime configuration model (KC-004 Sprint 1.6).
 *
 * Purpose: Configuration-only knobs for assembling the conversation runtime.
 * Ownership: Runtime Builder applies configuration; no business logic lives here.
 * Future extensions: AI adapter and notification packs register as feature flags / sections.
 */

import type { CommunicationChannel, LocalizationPreferences } from '../communication'
import type { RuntimeEnvironment } from './RuntimeTypes'

export type ConversationRuntimeConfig = {
  registerDefaultPolicies: boolean
  registerDefaultTemplates: boolean
  defaultChannel: CommunicationChannel
}

export type CommunicationRuntimeConfig = {
  registerDefaults: boolean
  defaultLocalization: LocalizationPreferences
}

export type AdapterRuntimeConfig = {
  /** Adapters are registered externally; this only describes expected domains. */
  expectedAdapterIds: readonly string[]
  requireAdaptersAtStartup: boolean
}

export type FutureAiRuntimeConfig = {
  enabled: boolean
  providerId?: string
}

export type LocalizationRuntimeConfig = {
  defaultLocale: string
  fallbackLocale: string
  formality: 'formal' | 'informal'
}

export type LoggingRuntimeConfig = {
  enabled: boolean
  level: 'error' | 'warn' | 'info' | 'debug'
}

export type TracingRuntimeConfig = {
  enabled: boolean
  sampleRate: number
}

export type FeatureFlagsRuntimeConfig = {
  enableGuidanceDefaults: boolean
  enableCommunicationDefaults: boolean
  enableAdapterAvailabilityReporting: boolean
  enableFutureAi: boolean
}

/**
 * Full runtime configuration — composition only, no business decisions.
 */
export type RuntimeConfiguration = {
  environment: RuntimeEnvironment
  conversation: ConversationRuntimeConfig
  communication: CommunicationRuntimeConfig
  adapters: AdapterRuntimeConfig
  futureAi: FutureAiRuntimeConfig
  localization: LocalizationRuntimeConfig
  logging: LoggingRuntimeConfig
  tracing: TracingRuntimeConfig
  featureFlags: FeatureFlagsRuntimeConfig
}

export type RuntimeConfigurationOverrides = {
  environment?: RuntimeEnvironment
  conversation?: Partial<ConversationRuntimeConfig>
  communication?: Partial<CommunicationRuntimeConfig>
  adapters?: Partial<AdapterRuntimeConfig>
  futureAi?: Partial<FutureAiRuntimeConfig>
  localization?: Partial<LocalizationRuntimeConfig>
  logging?: Partial<LoggingRuntimeConfig>
  tracing?: Partial<TracingRuntimeConfig>
  featureFlags?: Partial<FeatureFlagsRuntimeConfig>
}

export function createDefaultRuntimeConfiguration(
  environment: RuntimeEnvironment = 'custom',
): RuntimeConfiguration {
  return {
    environment,
    conversation: {
      registerDefaultPolicies: true,
      registerDefaultTemplates: true,
      defaultChannel: 'conversation',
    },
    communication: {
      registerDefaults: true,
      defaultLocalization: {
        locale: 'ur',
        fallbackLocale: 'en',
        script: 'arabic',
        formality: 'formal',
      },
    },
    adapters: {
      expectedAdapterIds: ['campaign', 'karkun', 'meeting', 'compliance', 'report'],
      requireAdaptersAtStartup: false,
    },
    futureAi: {
      enabled: false,
    },
    localization: {
      defaultLocale: 'ur',
      fallbackLocale: 'en',
      formality: 'formal',
    },
    logging: {
      enabled: environment === 'development',
      level: environment === 'production' ? 'warn' : 'debug',
    },
    tracing: {
      enabled: environment === 'development',
      sampleRate: environment === 'production' ? 0.1 : 1,
    },
    featureFlags: {
      enableGuidanceDefaults: true,
      enableCommunicationDefaults: true,
      enableAdapterAvailabilityReporting: true,
      enableFutureAi: false,
    },
  }
}

export function mergeRuntimeConfiguration(
  base: RuntimeConfiguration,
  overrides?: RuntimeConfigurationOverrides,
): RuntimeConfiguration {
  if (!overrides) return base

  return {
    environment: overrides.environment ?? base.environment,
    conversation: { ...base.conversation, ...overrides.conversation },
    communication: {
      ...base.communication,
      ...overrides.communication,
      defaultLocalization: {
        ...base.communication.defaultLocalization,
        ...overrides.communication?.defaultLocalization,
      },
    },
    adapters: { ...base.adapters, ...overrides.adapters },
    futureAi: { ...base.futureAi, ...overrides.futureAi },
    localization: { ...base.localization, ...overrides.localization },
    logging: { ...base.logging, ...overrides.logging },
    tracing: { ...base.tracing, ...overrides.tracing },
    featureFlags: { ...base.featureFlags, ...overrides.featureFlags },
  }
}
