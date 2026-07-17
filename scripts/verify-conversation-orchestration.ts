/**
 * Verify Conversation Orchestrator end-to-end scenarios (KC-005 Sprint 2.3).
 *
 * Uses an in-process testing runtime with live adapter/provider registration.
 * Does not require Firestore.
 */

import { createAdapterRegistry } from '../src/conversation/adapters'
import { createTestingRuntime } from '../src/conversation/runtime'
import { getRepositories } from '../src/repositories'
import { registerRepositoryAdapters } from '../src/runtime/adapters'
import { registerKnowledgeProviders } from '../src/runtime/knowledge'
import {
  createConversationOrchestrator,
  type ConversationRequest,
  type ConversationResponse,
} from '../src/runtime/orchestration'

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
  fn: () => void,
): ScenarioResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function createWiredRuntime() {
  const adapterRegistry = createAdapterRegistry()
  const { adapters } = registerRepositoryAdapters(getRepositories(), adapterRegistry)
  const runtime = createTestingRuntime({
    adapterRegistry,
    packageVersion: '1.0.0-rc.1',
  })
  registerKnowledgeProviders(runtime.knowledgeManager, adapters)
  return runtime
}

function baseRequest(
  overrides: Partial<ConversationRequest> & Pick<ConversationRequest, 'intent' | 'identity'>,
): ConversationRequest {
  return {
    route: '/',
    channel: 'conversation',
    locale: 'ur',
    ...overrides,
  }
}

function expectResponseShape(response: ConversationResponse): void {
  assert(typeof response.sessionId === 'string', 'sessionId missing')
  assert(typeof response.success === 'boolean', 'success missing')
  assert(typeof response.health === 'string', 'health missing')
  assert(typeof response.timing.durationMs === 'number', 'timing missing')
}

async function main(): Promise<void> {
  const runtime = createWiredRuntime()
  const orchestrator = createConversationOrchestrator({ runtime })
  const results: ScenarioResult[] = []

  results.push(
    runScenario('1. Administrator opening Dashboard', () => {
      const response = orchestrator.handle(
        baseRequest({
          intent: 'dashboard_open',
          identity: { userId: 'admin-1', role: 'administrator', displayName: 'Admin' },
          route: '/admin/dashboard',
        }),
      )
      expectResponseShape(response)
      assert(response.success, 'expected success')
      assert(response.communicationPlan !== null, 'expected communication plan')
      assert(
        response.metadata?.intent === 'dashboard_open',
        'intent not recorded',
      )
    }),
  )

  results.push(
    runScenario('2. Rukn opening Home', () => {
      const response = orchestrator.handle(
        baseRequest({
          intent: 'home_open',
          identity: { userId: 'rukn-1', role: 'rukn', displayName: 'Rukn' },
          route: '/rukn/home',
        }),
      )
      expectResponseShape(response)
      assert(response.success, 'expected success')
      assert(response.knowledgeBundle !== null, 'expected knowledge bundle')
    }),
  )

  results.push(
    runScenario('3. Meeting preparation flow', () => {
      const response = orchestrator.handle(
        baseRequest({
          intent: 'meeting_preparation',
          identity: { userId: 'rukn-1', role: 'rukn' },
          route: '/rukn/meetings',
          payload: { karkunId: 'karkun-demo', karkunName: 'Demo Karkun' },
        }),
      )
      expectResponseShape(response)
      assert(response.guidancePlan !== null, 'expected guidance plan')
      assert(
        (response.metadata?.domains as string[] | undefined)?.includes('meeting') === true,
        'expected meeting domain',
      )
    }),
  )

  results.push(
    runScenario('4. Compliance reminder flow', () => {
      const response = orchestrator.handle(
        baseRequest({
          intent: 'compliance_reminder',
          identity: { userId: 'rukn-1', role: 'rukn' },
          route: '/rukn/compliance',
        }),
      )
      expectResponseShape(response)
      assert(response.knowledgeSummary !== null, 'expected knowledge summary')
      assert(
        response.knowledgeSummary?.requestedDomains.includes('compliance') === true,
        'expected compliance domain',
      )
    }),
  )

  results.push(
    runScenario('5. Campaign summary request', () => {
      const response = orchestrator.handle(
        baseRequest({
          intent: 'campaign_summary',
          identity: { userId: 'admin-1', role: 'administrator' },
          route: '/admin/campaign',
        }),
      )
      expectResponseShape(response)
      assert(response.communicationPlan !== null, 'expected communication plan')
    }),
  )

  results.push(
    runScenario('6. Missing knowledge gracefully handled', () => {
      const response = orchestrator.handle(
        baseRequest({
          intent: 'meeting_preparation',
          identity: { userId: 'rukn-missing', role: 'rukn' },
          payload: { karkunId: 'does-not-exist' },
        }),
      )
      expectResponseShape(response)
      // Orchestrator must not throw; degraded/healthy with a response is acceptable.
      assert(response.sessionId.length > 0, 'expected session id')
      assert(response.health === 'healthy' || response.health === 'degraded', 'unexpected health')
    }),
  )

  results.push(
    runScenario('7. Repository unavailable (empty adapters runtime)', () => {
      const bareRuntime = createTestingRuntime({ packageVersion: '1.0.0-rc.1' })
      const bareOrchestrator = createConversationOrchestrator({ runtime: bareRuntime })
      const response = bareOrchestrator.handle(
        baseRequest({
          intent: 'campaign_summary',
          identity: { userId: 'admin-1', role: 'administrator' },
        }),
      )
      expectResponseShape(response)
      assert(response.sessionId.length > 0, 'expected session')
      // Without providers, knowledge may be empty — still must complete.
      assert(response.success === true || response.health !== 'failed', 'must not hard-fail')
    }),
  )

  results.push(
    runScenario('8. Runtime degraded / interrupt-resume', () => {
      const started = orchestrator.handle(
        baseRequest({
          intent: 'home_open',
          identity: { userId: 'rukn-1', role: 'rukn' },
        }),
      )
      const interrupted = orchestrator.handle(
        baseRequest({
          intent: 'interrupt',
          identity: { userId: 'rukn-1', role: 'rukn' },
          sessionId: started.sessionId,
        }),
      )
      assert(interrupted.metadata?.interrupted === true, 'expected interrupted flag')

      const resumed = orchestrator.handle(
        baseRequest({
          intent: 'resume',
          identity: { userId: 'rukn-1', role: 'rukn' },
          sessionId: started.sessionId,
        }),
      )
      expectResponseShape(resumed)
      assert(resumed.sessionId.length > 0, 'expected resumed session')
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

  console.log(`\nAll ${results.length} orchestration scenarios passed.`)
}

void main()
