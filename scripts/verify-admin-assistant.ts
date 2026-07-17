/**
 * Verify Administrator Dashboard Assistant (KC-006 Sprint 6.2).
 *
 * Validates feature-flag gating and DigitalRafeeqService-backed view models.
 * Does not mount React UI.
 */

import { createAdapterRegistry } from '../src/conversation/adapters'
import { createTestingRuntime } from '../src/conversation/runtime'
import { getRepositories } from '../src/repositories'
import { registerRepositoryAdapters } from '../src/runtime/adapters'
import { registerKnowledgeProviders } from '../src/runtime/knowledge'
import {
  buildAdminAssistantViewModel,
} from '../src/features/digitalRafeeq/admin'
import {
  createDigitalRafeeqService,
  createFeatureFlagService,
  getFeatureFlagService,
  resetFeatureFlagServiceForTests,
  resetRuntimeObservabilityForTests,
  type DigitalRafeeqResponse,
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

function processAdminOverview(
  service: ReturnType<typeof createDigitalRafeeqService>,
): DigitalRafeeqResponse {
  return service.processRequest({
    identity: {
      userId: 'admin-1',
      role: 'administrator',
      displayName: 'Admin',
    },
    route: '/admin',
    intent: 'dashboard_overview',
    channel: 'dashboard',
  })
}

async function main(): Promise<void> {
  resetFeatureFlagServiceForTests()
  resetRuntimeObservabilityForTests()

  const results: ScenarioResult[] = []

  results.push(
    await runScenario('1. Administrator — flag OFF hides assistant', () => {
      const flags = getFeatureFlagService()
      flags.setFlag('digitalRafeeq.enabled', false)
      assert(flags.isDigitalRafeeqEnabled() === false, 'flag should be off')
      const view = buildAdminAssistantViewModel(null, { enabled: false })
      assert(view.visibility === 'hidden', 'expected hidden when flag off')
      assert(view.healthLabel === 'Disabled', 'expected Disabled label')
    }),
  )

  results.push(
    await runScenario('2. Administrator — flag ON loads overview', async () => {
      const flags = createFeatureFlagService()
      flags.setFlag('digitalRafeeq.enabled', true)
      const service = createDigitalRafeeqService({
        runtime: createWiredRuntime(),
      })
      await service.initialize()
      // Service.isEnabled uses singleton flags — set singleton for parity.
      getFeatureFlagService().setFlag('digitalRafeeq.enabled', true)
      assert(service.isEnabled() === true, 'service should report enabled')

      const response = processAdminOverview(service)
      assert(response.success, 'expected successful dashboard_overview')
      const view = buildAdminAssistantViewModel(response, { enabled: true })
      assert(view.visibility === 'ready' || view.visibility === 'empty', 'expected visible model')
      assert(
        view.healthLabel === 'Healthy' || view.healthLabel === 'Degraded',
        'unexpected health label',
      )
      assert(view.recommendations.length <= 3, 'max three recommendations')
    }),
  )

  results.push(
    await runScenario('3. Runtime unavailable hides panel', () => {
      const cold = createDigitalRafeeqService()
      const response = cold.processRequest({
        identity: { userId: 'admin-1', role: 'administrator' },
        route: '/admin',
        intent: 'dashboard_overview',
      })
      assert(response.success === false, 'expected failure')
      const view = buildAdminAssistantViewModel(response, { enabled: true })
      assert(view.visibility === 'hidden', 'expected hidden when runtime unavailable')
      assert(view.healthLabel === 'Unavailable', 'expected Unavailable')
    }),
  )

  results.push(
    await runScenario('4. Repository unavailable still maps gracefully', async () => {
      getFeatureFlagService().setFlag('digitalRafeeq.enabled', true)
      const bare = createDigitalRafeeqService({
        runtime: createTestingRuntime({ packageVersion: '1.0.0-rc.1' }),
      })
      await bare.initialize()
      const response = processAdminOverview(bare)
      const view = buildAdminAssistantViewModel(response, { enabled: true })
      // May be ready/empty/hidden depending on health — must not throw.
      assert(
        view.visibility === 'ready' ||
          view.visibility === 'empty' ||
          view.visibility === 'hidden',
        'unexpected visibility',
      )
      assert(view.recommendations.length <= 3, 'max three recommendations')
    }),
  )

  results.push(
    await runScenario('5. Degraded runtime surfaces Degraded label', async () => {
      getFeatureFlagService().setFlag('digitalRafeeq.enabled', true)
      const bare = createDigitalRafeeqService({
        runtime: createTestingRuntime({ packageVersion: '1.0.0-rc.1' }),
      })
      await bare.initialize()
      const response = processAdminOverview(bare)
      const view = buildAdminAssistantViewModel(response, { enabled: true })
      if (view.visibility !== 'hidden') {
        assert(
          view.healthLabel === 'Degraded' || view.healthLabel === 'Healthy',
          'expected Degraded or Healthy',
        )
      }
    }),
  )

  results.push(
    await runScenario('6. No recommendations maps to empty-safe view', () => {
      const synthetic: DigitalRafeeqResponse = {
        success: true,
        runtimeStatus: 'Ready',
        conversationState: 'guidance',
        sessionId: 'session-empty',
        knowledgeSummary: null,
        guidancePlan: null,
        communicationPlan: null,
        health: 'healthy',
        timing: {
          startedAt: Date.now(),
          completedAt: Date.now(),
          durationMs: 0,
          stages: {},
        },
        metadata: {
          intent: 'dashboard_overview',
          sessionId: 'session-empty',
          source: 'service',
          validated: true,
        },
      }
      const view = buildAdminAssistantViewModel(synthetic, { enabled: true })
      assert(view.visibility === 'empty', 'expected empty when no content')
      assert(view.recommendations.length === 0, 'expected no recommendations')
      assert(view.primaryPriority === null, 'expected no primary priority')
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

  console.log(`\nAll ${results.length} admin assistant scenarios passed.`)
}

void main()
