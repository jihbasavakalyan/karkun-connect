/**
 * Verify Digital Rafeeq Service façade (KC-005 Sprint 2.4).
 *
 * Uses an in-process testing runtime. Does not require Firestore.
 */

import { createAdapterRegistry } from '../src/conversation/adapters'
import { createTestingRuntime } from '../src/conversation/runtime'
import { getRepositories } from '../src/repositories'
import { registerRepositoryAdapters } from '../src/runtime/adapters'
import { registerKnowledgeProviders } from '../src/runtime/knowledge'
import {
  createDigitalRafeeqService,
  type DigitalRafeeqEvent,
  type DigitalRafeeqRequest,
  type DigitalRafeeqResponse,
} from '../src/runtime/service'

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

function runScenario(name: string, fn: () => void | Promise<void>): Promise<ScenarioResult> {
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
  const { adapters } = registerRepositoryAdapters(getRepositories(), adapterRegistry)
  const runtime = createTestingRuntime({
    adapterRegistry,
    packageVersion: '1.0.0-rc.1',
  })
  registerKnowledgeProviders(runtime.knowledgeManager, adapters)
  return runtime
}

function baseRequest(
  overrides: Partial<DigitalRafeeqRequest> &
    Pick<DigitalRafeeqRequest, 'intent' | 'identity'>,
): DigitalRafeeqRequest {
  return {
    route: '/',
    channel: 'conversation',
    locale: 'ur',
    ...overrides,
  }
}

function expectResponseShape(response: DigitalRafeeqResponse): void {
  assert(typeof response.sessionId === 'string', 'sessionId missing')
  assert(typeof response.success === 'boolean', 'success missing')
  assert(typeof response.runtimeStatus === 'string', 'runtimeStatus missing')
  assert(typeof response.health === 'string', 'health missing')
  assert(typeof response.timing.durationMs === 'number', 'timing missing')
  assert(response.metadata.source === 'service', 'metadata.source expected')
}

async function main(): Promise<void> {
  const results: ScenarioResult[] = []

  results.push(
    await runScenario('1. Service initialization', async () => {
      const service = createDigitalRafeeqService({
        runtime: createWiredRuntime(),
      })
      const health = await service.initialize()
      assert(service.isReady(), 'service should be ready')
      assert(health.status === 'Ready' || health.status === 'Degraded', 'unexpected status')
      assert(typeof health.runtimeVersion === 'string', 'runtime version missing')
    }),
  )

  results.push(
    await runScenario('2. Health retrieval', async () => {
      const service = createDigitalRafeeqService({
        runtime: createWiredRuntime(),
      })
      await service.initialize()
      const health = service.getHealth()
      assert(health.healthy === true || health.status === 'Degraded', 'health unavailable')
      assert(Array.isArray(health.missingDependencies), 'missingDependencies missing')
    }),
  )

  const wiredService = createDigitalRafeeqService({
    runtime: createWiredRuntime(),
  })
  await wiredService.initialize()

  results.push(
    await runScenario('3. Administrator request', () => {
      const events: DigitalRafeeqEvent['type'][] = []
      const unsubscribe = wiredService.onEvent((event) => {
        events.push(event.type)
      })
      const response = wiredService.processRequest(
        baseRequest({
          intent: 'dashboard_open',
          identity: { userId: 'admin-1', role: 'administrator', displayName: 'Admin' },
          route: '/admin/dashboard',
        }),
      )
      unsubscribe()
      expectResponseShape(response)
      assert(response.success, 'expected success')
      assert(response.communicationPlan !== null, 'expected communication plan')
      assert(events.includes('ConversationCompleted'), 'expected ConversationCompleted')
      assert(
        wiredService.getCommunicationPlan() !== null,
        'getCommunicationPlan should return plan',
      )
    }),
  )

  results.push(
    await runScenario('4. Rukn request', () => {
      const response = wiredService.processRequest(
        baseRequest({
          intent: 'home_open',
          identity: { userId: 'rukn-1', role: 'rukn', displayName: 'Rukn' },
          route: '/rukn/home',
        }),
      )
      expectResponseShape(response)
      assert(response.success, 'expected success')
      assert(response.knowledgeSummary !== null, 'expected knowledge summary')
      assert(wiredService.getGuidance() !== null, 'getGuidance should return plan')
    }),
  )

  results.push(
    await runScenario('5. Conversation interruption', () => {
      const started = wiredService.startConversation(
        baseRequest({
          intent: 'meeting_preparation',
          identity: { userId: 'rukn-1', role: 'rukn' },
        }),
      )
      const interrupted = wiredService.interruptConversation(
        baseRequest({
          intent: 'interrupt',
          identity: { userId: 'rukn-1', role: 'rukn' },
          sessionId: started.sessionId,
        }),
      )
      expectResponseShape(interrupted)
      assert(interrupted.sessionId.length > 0, 'expected session on interrupt')
    }),
  )

  results.push(
    await runScenario('6. Conversation resume', () => {
      const started = wiredService.startConversation(
        baseRequest({
          intent: 'compliance_reminder',
          identity: { userId: 'rukn-1', role: 'rukn' },
        }),
      )
      wiredService.interruptConversation(
        baseRequest({
          intent: 'interrupt',
          identity: { userId: 'rukn-1', role: 'rukn' },
          sessionId: started.sessionId,
        }),
      )
      const resumed = wiredService.resumeConversation(
        baseRequest({
          intent: 'resume',
          identity: { userId: 'rukn-1', role: 'rukn' },
          sessionId: started.sessionId,
        }),
      )
      expectResponseShape(resumed)
      assert(resumed.sessionId.length > 0, 'expected resumed session')
      assert(wiredService.getSession() !== null, 'expected active session')
      assert(
        typeof wiredService.getSession()?.conversationState === 'string',
        'state missing',
      )
    }),
  )

  results.push(
    await runScenario('7. Runtime unavailable', () => {
      const cold = createDigitalRafeeqService()
      assert(cold.isReady() === false, 'cold service should not be ready')
      const response = cold.processRequest(
        baseRequest({
          intent: 'dashboard_open',
          identity: { userId: 'admin-1', role: 'administrator' },
        }),
      )
      assert(response.success === false, 'expected failure when not ready')
      assert(response.error?.code === 'NOT_READY', 'expected NOT_READY')
      assert(response.health === 'unavailable', 'expected unavailable health')
    }),
  )

  results.push(
    await runScenario('8. Repository unavailable', async () => {
      const bareRuntime = createTestingRuntime({ packageVersion: '1.0.0-rc.1' })
      const service = createDigitalRafeeqService({ runtime: bareRuntime })
      await service.initialize()
      const response = service.processRequest(
        baseRequest({
          intent: 'campaign_summary',
          identity: { userId: 'admin-1', role: 'administrator' },
        }),
      )
      expectResponseShape(response)
      assert(response.sessionId.length > 0, 'expected session')
      assert(response.success === true || response.health !== 'failed', 'must not hard-fail')
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

  console.log(`\nAll ${results.length} Digital Rafeeq Service scenarios passed.`)
}

void main()
