/**
 * Runtime bootstrap initialization (KC-005 Sprint 2.0).
 *
 * Purpose: Initialize Digital Rafeeq Runtime once after application startup.
 * Ownership: Bootstrap only — no feature logic, no repository wiring.
 * Future extensions: Concrete adapters register after this passive init.
 *
 * Failures are isolated — Karkun Connect continues without the runtime.
 */

import {
  createDevelopmentRuntime,
  createProductionRuntime,
  createTestingRuntime,
  type RuntimeContainer,
} from '@/conversation/runtime'

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
  switch (profile) {
    case 'production':
      return createProductionRuntime({ packageVersion: '1.0.0-rc.1' })
    case 'testing':
      return createTestingRuntime({ packageVersion: '1.0.0-rc.1' })
    case 'development':
    default:
      return createDevelopmentRuntime({ packageVersion: '1.0.0-rc.1' })
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
      // Allow a future explicit retry by clearing the promise only on failure.
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
