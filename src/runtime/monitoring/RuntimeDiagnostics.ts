/**
 * Runtime diagnostics (KC-006 Sprint 6.1).
 *
 * Purpose: Deterministic operational checks for verify:runtime.
 */

import type { RuntimeContainer } from '@/conversation/runtime'
import { getRuntimeBootstrapResult } from '../bootstrap/initializeRuntime'
import {
  getFeatureFlagService,
  type FeatureFlagService,
} from '../featureFlags'
import type { DigitalRafeeqService } from '../service/DigitalRafeeqService'
import type { RuntimeHealthReporter } from './RuntimeHealthReporter'

export type DiagnosticCheckName =
  | 'runtime_initialized'
  | 'service_registered'
  | 'orchestrator_registered'
  | 'knowledge_providers_registered'
  | 'adapter_registry_populated'
  | 'feature_flags_loaded'
  | 'health_available'

export type DiagnosticCheckResult = {
  name: DiagnosticCheckName
  passed: boolean
  detail: string
}

export type RuntimeDiagnosticsReport = {
  passed: boolean
  checks: readonly DiagnosticCheckResult[]
  checkedAt: number
}

export type RuntimeDiagnosticsInput = {
  service: DigitalRafeeqService | null
  runtime?: RuntimeContainer | null
  featureFlags?: FeatureFlagService
  healthReporter?: RuntimeHealthReporter
}

export function runRuntimeDiagnostics(
  input: RuntimeDiagnosticsInput,
): RuntimeDiagnosticsReport {
  const flags = input.featureFlags ?? getFeatureFlagService()
  const loadedFlags = flags.load()
  const bootstrap = getRuntimeBootstrapResult()
  const service = input.service
  const runtime = input.runtime ?? bootstrap.runtime

  const checks: DiagnosticCheckResult[] = []

  const runtimeInitialized =
    runtime !== null && runtime !== undefined
      ? true
      : (service?.isReady() ?? false) ||
        bootstrap.status === 'Ready' ||
        bootstrap.status === 'Degraded'

  checks.push({
    name: 'runtime_initialized',
    passed: runtimeInitialized,
    detail: runtime
      ? `version=${runtime.runtimeVersion()} healthy=${String(runtime.isHealthy())}`
      : `bootstrap=${bootstrap.status}`,
  })

  checks.push({
    name: 'service_registered',
    passed: service !== null,
    detail: service ? 'DigitalRafeeqService present' : 'service missing',
  })

  checks.push({
    name: 'orchestrator_registered',
    passed: service?.isReady() === true,
    detail:
      service?.isReady() === true
        ? 'orchestrator bound via ready service'
        : 'orchestrator not bound',
  })

  const providerCount = runtime
    ? runtime.knowledgeManager.getRegisteredProviderIds().length
    : 0

  checks.push({
    name: 'knowledge_providers_registered',
    passed: providerCount > 0,
    detail:
      providerCount > 0
        ? `${providerCount} provider(s) registered`
        : 'no knowledge providers registered',
  })

  const adapterCount = runtime ? runtime.registeredAdapters().length : 0

  checks.push({
    name: 'adapter_registry_populated',
    passed: adapterCount > 0,
    detail:
      adapterCount > 0
        ? `${adapterCount} adapter(s) registered`
        : 'adapter registry empty',
  })

  checks.push({
    name: 'feature_flags_loaded',
    passed: typeof loadedFlags['digitalRafeeq.enabled'] === 'boolean',
    detail: `digitalRafeeq.enabled=${String(loadedFlags['digitalRafeeq.enabled'])}`,
  })

  const healthAvailable =
    service !== null ||
    input.healthReporter !== undefined ||
    runtime !== null ||
    bootstrap.status !== 'NotInitialized'

  checks.push({
    name: 'health_available',
    passed: healthAvailable,
    detail: service
      ? `service status=${service.getHealth().status}`
      : runtime
        ? `runtime healthy=${String(runtime.isHealthy())}`
        : `bootstrap=${bootstrap.status}`,
  })

  return {
    passed: checks.every((check) => check.passed),
    checks,
    checkedAt: Date.now(),
  }
}
