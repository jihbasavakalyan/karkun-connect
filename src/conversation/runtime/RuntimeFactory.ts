/**
 * Runtime Factory (KC-004 Sprint 1.6).
 *
 * Purpose: Assemble different RuntimeConfiguration profiles only — no environment business logic.
 * Ownership: Factory selects configuration defaults; Runtime Builder performs DI.
 * Future extensions: Add staging or preview profiles without changing engine modules.
 */

import type { AdapterRegistry } from '../adapters'
import {
  createDefaultRuntimeConfiguration,
  type RuntimeConfigurationOverrides,
} from './RuntimeConfiguration'
import { RuntimeBuilder, type RuntimeBuilderOptions } from './RuntimeBuilder'
import type { RuntimeContainer } from './RuntimeContainer'

export type RuntimeFactoryOptions = {
  configurationOverrides?: RuntimeConfigurationOverrides
  adapterRegistry?: AdapterRegistry
  packageVersion?: string
}

/**
 * Create a runtime with custom or default configuration.
 */
export function createRuntime(options?: RuntimeFactoryOptions): RuntimeContainer {
  return new RuntimeBuilder({
    environment: 'custom',
    configuration: createDefaultRuntimeConfiguration('custom'),
    configurationOverrides: options?.configurationOverrides,
    adapterRegistry: options?.adapterRegistry,
    packageVersion: options?.packageVersion,
  }).build()
}

/**
 * Development runtime — defaults enable logging/tracing and default policies/templates.
 */
export function createDevelopmentRuntime(
  options?: RuntimeFactoryOptions,
): RuntimeContainer {
  return new RuntimeBuilder({
    environment: 'development',
    configuration: createDefaultRuntimeConfiguration('development'),
    configurationOverrides: {
      logging: { enabled: true, level: 'debug' },
      tracing: { enabled: true, sampleRate: 1 },
      ...options?.configurationOverrides,
    },
    adapterRegistry: options?.adapterRegistry,
    packageVersion: options?.packageVersion,
  }).build()
}

/**
 * Testing runtime — defaults keep composition light; adapters not required at startup.
 */
export function createTestingRuntime(
  options?: RuntimeFactoryOptions,
): RuntimeContainer {
  return new RuntimeBuilder({
    environment: 'testing',
    configuration: createDefaultRuntimeConfiguration('testing'),
    configurationOverrides: {
      logging: { enabled: false, level: 'error' },
      tracing: { enabled: false, sampleRate: 0 },
      adapters: { requireAdaptersAtStartup: false },
      ...options?.configurationOverrides,
    },
    adapterRegistry: options?.adapterRegistry,
    packageVersion: options?.packageVersion,
  }).build()
}

/**
 * Production runtime — quieter logging; adapters still optional until concrete wiring lands.
 */
export function createProductionRuntime(
  options?: RuntimeFactoryOptions,
): RuntimeContainer {
  return new RuntimeBuilder({
    environment: 'production',
    configuration: createDefaultRuntimeConfiguration('production'),
    configurationOverrides: {
      logging: { enabled: true, level: 'warn' },
      tracing: { enabled: false, sampleRate: 0.1 },
      futureAi: { enabled: false },
      featureFlags: { enableFutureAi: false },
      ...options?.configurationOverrides,
    },
    adapterRegistry: options?.adapterRegistry,
    packageVersion: options?.packageVersion,
  }).build()
}

export function createRuntimeFromBuilderOptions(
  options: RuntimeBuilderOptions,
): RuntimeContainer {
  return new RuntimeBuilder(options).build()
}
