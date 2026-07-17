/**
 * Verify runtime feature flags & observability (KC-006 Sprint 6.1).
 *
 * Checks:
 * - Runtime initialized
 * - Service registered
 * - Orchestrator registered
 * - Knowledge providers registered
 * - Adapter registry populated
 * - Feature flags loaded (digitalRafeeq.enabled default true when env unset)
 * - Health available
 * - Metrics collected
 */

import { createAdapterRegistry } from '../src/conversation/adapters'
import { createTestingRuntime } from '../src/conversation/runtime'
import { getRepositories } from '../src/repositories'
import { registerRepositoryAdapters } from '../src/runtime/adapters'
import { registerKnowledgeProviders } from '../src/runtime/knowledge'
import {
  DEFAULT_RUNTIME_FEATURE_FLAGS,
  createDigitalRafeeqService,
  createFeatureFlagService,
  getFeatureFlagService,
  getRuntimeObservability,
  resetFeatureFlagServiceForTests,
  resetRuntimeObservabilityForTests,
  runRuntimeDiagnostics,
} from '../src/runtime'

type ScenarioResult = {
  name: string
  passed: boolean
  detail: string
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function runScenario(
  name: string,
  fn: () => void | Promise<void>,
): Promise<ScenarioResult> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => ({ name, passed: true, detail: 'ok' }))
    .catch((error: unknown) => ({
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }))
}

function createWiredRuntime() {
  const adapterRegistry = createAdapterRegistry()
  const { adapters } = registerRepositoryAdapters(
    getRepositories(),
    adapterRegistry,
  )
  const runtime = createTestingRuntime({
    adapterRegistry,
    packageVersion: '1.0.0-rc.1',
  })
  registerKnowledgeProviders(runtime.knowledgeManager, adapters)
  return runtime
}

async function main(): Promise<void> {
  resetFeatureFlagServiceForTests()
  resetRuntimeObservabilityForTests()

  const results: ScenarioResult[] = []
  const flags = getFeatureFlagService()
  const observability = getRuntimeObservability()
  const runtime = createWiredRuntime()
  const service = createDigitalRafeeqService({ runtime })
  await service.initialize()

  results.push(
    await runScenario('1. Feature flag defaults to enabled', () => {
      const loaded = flags.load()
      assert(
        loaded['digitalRafeeq.enabled'] ===
          DEFAULT_RUNTIME_FEATURE_FLAGS['digitalRafeeq.enabled'],
        'expected default digitalRafeeq.enabled=true',
      )
      assert(loaded['digitalRafeeq.enabled'] === true, 'flag must default true')
      assert(
        service.isEnabled() === true,
        'service.isEnabled should be true by default',
      )
    }),
  )

  results.push(
    await runScenario('2. Runtime initializes while feature enabled', () => {
      assert(service.isReady(), 'runtime/service should still be ready')
      const health = service.getHealth()
      assert(
        health.status === 'Ready' || health.status === 'Degraded',
        'unexpected health',
      )
    }),
  )

  results.push(
    await runScenario('3. verify:runtime diagnostic checks', () => {
      const report = runRuntimeDiagnostics({
        service,
        runtime,
        featureFlags: flags,
        healthReporter: observability.healthReporter,
      })
      for (const check of report.checks) {
        assert(check.passed, `${check.name} failed: ${check.detail}`)
      }
      assert(report.passed, 'diagnostics report should pass')
    }),
  )

  results.push(
    await runScenario('4. Metrics collected on request', () => {
      const response = service.processRequest({
        intent: 'dashboard_open',
        identity: { userId: 'admin-1', role: 'administrator' },
        route: '/admin/dashboard',
      })
      assert(response.success, 'expected successful request')
      const snap = observability.metrics.getSnapshot()
      assert(snap.requestCount >= 1, 'expected requestCount >= 1')
      assert(snap.successCount >= 1, 'expected successCount >= 1')
      assert(snap.runtimeAvailable === true, 'expected runtimeAvailable')
      assert(snap.repositoryAvailable === true, 'expected repositoryAvailable')
      assert(
        snap.conversationDurationCount >= 1,
        'expected conversation duration samples',
      )
      assert(
        typeof snap.runtimeStartupDurationMs === 'number',
        'expected startup duration',
      )
    }),
  )

  results.push(
    await runScenario('5. Health reporter exposes observability health', () => {
      const health = observability.getHealth(service)
      assert(typeof health.status === 'string', 'status missing')
      assert(
        typeof health.averageRequestLatencyMs === 'number',
        'latency missing',
      )
      assert(Array.isArray(health.recentFailures), 'recentFailures missing')
      assert(
        health.featureDigitalRafeeqEnabled === true,
        'flag should remain enabled by default',
      )
      assert(health.metrics.requestCount >= 1, 'metrics missing')
      assert(typeof health.runtimeVersion === 'string', 'runtime version missing')
      assert(typeof health.initializedAt === 'number', 'initializedAt missing')
    }),
  )

  results.push(
    await runScenario('6. Feature flag override for user-facing entry', () => {
      const localFlags = createFeatureFlagService()
      assert(localFlags.isDigitalRafeeqEnabled() === true, 'default enabled')
      localFlags.setFlag('digitalRafeeq.enabled', false)
      assert(
        localFlags.isDigitalRafeeqEnabled() === false,
        'flag should disable',
      )
      localFlags.setFlag('digitalRafeeq.enabled', true)
      assert(
        localFlags.isDigitalRafeeqEnabled() === true,
        'flag should enable again',
      )
    }),
  )

  results.push(
    await runScenario('7. Interrupt / resume metrics', () => {
      const started = service.startConversation({
        intent: 'home_open',
        identity: { userId: 'rukn-1', role: 'rukn' },
      })
      service.interruptConversation({
        intent: 'interrupt',
        identity: { userId: 'rukn-1', role: 'rukn' },
        sessionId: started.sessionId,
      })
      service.resumeConversation({
        intent: 'resume',
        identity: { userId: 'rukn-1', role: 'rukn' },
        sessionId: started.sessionId,
      })
      const snap = observability.metrics.getSnapshot()
      assert(snap.interruptedConversations >= 1, 'expected interrupted count')
      assert(snap.resumedConversations >= 1, 'expected resumed count')
    }),
  )

  const failed = results.filter((result) => !result.passed)
  for (const result of results) {
    const mark = result.passed ? 'PASS' : 'FAIL'
    console.log(`[${mark}] ${result.name} — ${result.detail}`)
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length}/${results.length} scenarios failed.`)
    process.exitCode = 1
    return
  }

  console.log(`\nAll ${results.length} runtime observability scenarios passed.`)
}

void main()
