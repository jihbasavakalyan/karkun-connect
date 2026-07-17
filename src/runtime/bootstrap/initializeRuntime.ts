/**
 * Runtime bootstrap initialization (KC-005 Sprint 2.0 / 2.1).
 *
 * Purpose: Initialize Digital Rafeeq Runtime once after application startup.
 * Ownership: Bootstrap only — wires concrete repository adapters into AdapterRegistry.
 * Failures are isolated — Karkun Connect continues without the runtime.
 */

import { createAdapterRegistry } from '@/conversation/adapters'
import {
  createDevelopmentRuntime,
  createProductionRuntime,
  createTestingRuntime,
  type RuntimeContainer,
} from '@/conversation/runtime'
import { getRepositories } from '@/repositories'
import { registerRepositoryAdapters } from '@/runtime/adapters'

export type RuntimeBootstrapStatus =
  | 'NotInitialized'
  | 'Initializing'
  | 'Ready'
  | 'Degraded'
  | 'Failed'

export type RuntimeBootstrapResult = {
  status: RuntimeBootstrapStatus
  runtime: RuntimeContainer | null
  errorMessage?: string
  initializedAt?: number
}

export type InitializeRuntimeOptions = {
  /** Override environment profile detection. */
  profile?: 'development' | 'testing' | 'production'
}

let status: RuntimeBootstrapStatus = 'NotInitialized'
let result: RuntimeBootstrapResult = {
  status: 'NotInitialized',
  runtime: null,
}
let initPromise: Promise<RuntimeBootstrapResult> | null = null

function resolveProfile(
  options?: InitializeRuntimeOptions,
): 'development' | 'testing' | 'production' {
  if (options?.profile) return options.profile
  const mode = import.meta.env.MODE
  if (mode === 'test') return 'testing'
  if (mode === 'production') return 'production'
  return 'development'
}

function buildRuntime(profile: 'development' | 'testing' | 'production'): RuntimeContainer {
  const adapterRegistry = createAdapterRegistry()

  try {
    registerRepositoryAdapters(getRepositories(), adapterRegistry)
  } catch (error) {
    console.warn('[runtime] repository adapter registration failed', error)
  }

  const factoryOptions = {
    adapterRegistry,
    packageVersion: '1.0.0-rc.1' as const,
  }

  switch (profile) {
    case 'production':
      return createProductionRuntime(factoryOptions)
    case 'testing':
      return createTestingRuntime(factoryOptions)
    case 'development':
    default:
      return createDevelopmentRuntime(factoryOptions)
  }
}

/**
 * Initialize the Digital Rafeeq Runtime once.
 * Safe to call multiple times — subsequent calls await the same in-flight result.
 * Never throws for composition failures; returns Failed / Degraded status instead.
 */
export function initializeRuntime(
  options?: InitializeRuntimeOptions,
): Promise<RuntimeBootstrapResult> {
  if (initPromise) {
    return initPromise
  }

  status = 'Initializing'
  result = { status: 'Initializing', runtime: null }

  initPromise = Promise.resolve()
    .then(() => {
      const profile = resolveProfile(options)
      const runtime = buildRuntime(profile)

      const nextStatus: RuntimeBootstrapStatus = runtime.isHealthy()
        ? 'Ready'
        : 'Degraded'

      result = {
        status: nextStatus,
        runtime,
        initializedAt: Date.now(),
        errorMessage: runtime.isHealthy()
          ? undefined
          : runtime.missingDependencies().join('; ') || 'Runtime composition degraded',
      }
      status = nextStatus
      return result
    })
    .catch((cause: unknown) => {
      const message =
        cause instanceof Error ? cause.message : 'Runtime initialization failed'
      result = {
        status: 'Failed',
        runtime: null,
        errorMessage: message,
        initializedAt: Date.now(),
      }
      status = 'Failed'
      initPromise = null
      return result
    })

  return initPromise
}

export function getRuntimeBootstrapStatus(): RuntimeBootstrapStatus {
  return status
}

export function getRuntimeBootstrapResult(): RuntimeBootstrapResult {
  return result
}

/** Testing helper — resets bootstrap state. Not for production use. */
export function resetRuntimeBootstrapForTests(): void {
  status = 'NotInitialized'
  result = { status: 'NotInitialized', runtime: null }
  initPromise = null
}
