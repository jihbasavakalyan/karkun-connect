/**
 * Verify Contextual Guidance (KC-006 Sprint 6.4).
 */

import { createAdapterRegistry } from '../src/conversation/adapters'
import { createTestingRuntime } from '../src/conversation/runtime'
import { getRepositories } from '../src/repositories'
import { registerRepositoryAdapters } from '../src/runtime/adapters'
import { registerKnowledgeProviders } from '../src/runtime/knowledge'
import {
  buildComplianceGuidanceView,
  buildExecutionGuidanceView,
  buildMeetingGuidanceView,
  buildReportGuidanceView,
} from '../src/features/digitalRafeeq/contextual'
import {
  createDigitalRafeeqService,
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
  if (!condition) throw new Error(message)
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

  results.push(
    await runScenario('1. Flag OFF hides all contextual views', () => {
      getFeatureFlagService().setFlag('digitalRafeeq.enabled', false)
      assert(getFeatureFlagService().isDigitalRafeeqEnabled() === false, 'flag off')
      assert(
        buildExecutionGuidanceView(null, false).visibility === 'hidden',
        'connect hidden',
      )
      assert(
        buildMeetingGuidanceView(null, false).visibility === 'hidden',
        'meeting hidden',
      )
      assert(
        buildComplianceGuidanceView(null, false).visibility === 'hidden',
        'compliance hidden',
      )
      assert(
        buildReportGuidanceView(null, false).visibility === 'hidden',
        'report hidden',
      )
    }),
  )

  const service = createDigitalRafeeqService({ runtime: createWiredRuntime() })
  await service.initialize()
  getFeatureFlagService().setFlag('digitalRafeeq.enabled', true)

  results.push(
    await runScenario('2. Connect workflow (connect_execution)', () => {
      const response = service.processRequest({
        identity: { userId: 'rukn-1', role: 'rukn' },
        route: '/rukn/my-karkun',
        intent: 'connect_execution',
        channel: 'dashboard',
      })
      assert(response.success, 'connect request failed')
      const view = buildExecutionGuidanceView(response, true)
      assert(
        view.visibility === 'ready' || view.visibility === 'empty',
        'unexpected connect visibility',
      )
    }),
  )

  results.push(
    await runScenario('3. Meeting workflow (meeting_preparation)', () => {
      const response = service.processRequest({
        identity: { userId: 'rukn-1', role: 'rukn' },
        route: '/rukn/visit/demo',
        intent: 'meeting_preparation',
        channel: 'dashboard',
        payload: { karkunId: 'demo', karkunName: 'Demo' },
      })
      assert(response.success, 'meeting request failed')
      const view = buildMeetingGuidanceView(response, true)
      assert(
        view.visibility === 'ready' || view.visibility === 'empty',
        'unexpected meeting visibility',
      )
    }),
  )

  results.push(
    await runScenario('4. Compliance workflow (compliance_review)', () => {
      const response = service.processRequest({
        identity: { userId: 'admin-1', role: 'administrator' },
        route: '/admin/compliance',
        intent: 'compliance_review',
        channel: 'dashboard',
      })
      assert(response.success, 'compliance request failed')
      const view = buildComplianceGuidanceView(response, true)
      assert(
        view.visibility === 'ready' || view.visibility === 'empty',
        'unexpected compliance visibility',
      )
    }),
  )

  results.push(
    await runScenario('5. Report workflow (report_review)', () => {
      const response = service.processRequest({
        identity: { userId: 'admin-1', role: 'administrator' },
        route: '/admin/execution?section=reports',
        intent: 'report_review',
        channel: 'dashboard',
      })
      assert(response.success, 'report request failed')
      const view = buildReportGuidanceView(response, true)
      assert(
        view.visibility === 'ready' || view.visibility === 'empty',
        'unexpected report visibility',
      )
    }),
  )

  results.push(
    await runScenario('6. Runtime unavailable hides guidance', () => {
      const cold = createDigitalRafeeqService()
      const response = cold.processRequest({
        identity: { userId: 'admin-1', role: 'administrator' },
        route: '/admin/compliance',
        intent: 'compliance_review',
      })
      assert(response.success === false, 'expected failure')
      assert(
        buildComplianceGuidanceView(response, true).visibility === 'hidden',
        'expected hidden',
      )
    }),
  )

  results.push(
    await runScenario('7. Repository unavailable still maps gracefully', async () => {
      const bare = createDigitalRafeeqService({
        runtime: createTestingRuntime({ packageVersion: '1.0.0-rc.1' }),
      })
      await bare.initialize()
      const response = bare.processRequest({
        identity: { userId: 'admin-1', role: 'administrator' },
        route: '/admin/execution?section=reports',
        intent: 'report_review',
      })
      const view = buildReportGuidanceView(response, true)
      assert(
        view.visibility === 'ready' ||
          view.visibility === 'empty' ||
          view.visibility === 'hidden',
        'unexpected visibility',
      )
    }),
  )

  results.push(
    await runScenario('8. No recommendations maps to empty-safe views', () => {
      const synthetic: DigitalRafeeqResponse = {
        success: true,
        runtimeStatus: 'Ready',
        conversationState: 'guidance',
        sessionId: 'empty',
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
          intent: 'connect_execution',
          sessionId: 'empty',
          source: 'service',
          validated: true,
        },
      }
      assert(buildExecutionGuidanceView(synthetic, true).visibility === 'empty', 'connect empty')
      assert(buildMeetingGuidanceView(synthetic, true).visibility === 'empty', 'meeting empty')
      assert(
        buildComplianceGuidanceView(synthetic, true).visibility === 'empty',
        'compliance empty',
      )
      assert(buildReportGuidanceView(synthetic, true).visibility === 'empty', 'report empty')
    }),
  )

  const failed = results.filter((result) => !result.passed)
  for (const result of results) {
    console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.name} — ${result.detail}`)
  }
  if (failed.length > 0) {
    console.error(`\n${failed.length}/${results.length} scenarios failed.`)
    process.exitCode = 1
    return
  }
  console.log(`\nAll ${results.length} contextual guidance scenarios passed.`)
}

void main()
