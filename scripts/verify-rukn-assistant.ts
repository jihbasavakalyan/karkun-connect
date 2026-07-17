/**
 * Verify Rukn Home Assistant (KC-006 Sprint 6.3).
 *
 * Validates feature-flag gating and DigitalRafeeqService-backed view models.
 * Does not mount React UI.
 */

import { createAdapterRegistry } from '../src/conversation/adapters'
import { createTestingRuntime } from '../src/conversation/runtime'
import { getRepositories } from '../src/repositories'
import { registerRepositoryAdapters } from '../src/runtime/adapters'
import { registerKnowledgeProviders } from '../src/runtime/knowledge'
import { buildRuknAssistantViewModel } from '../src/features/digitalRafeeq/rukn'
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

function processDailyExecution(
  service: ReturnType<typeof createDigitalRafeeqService>,
): DigitalRafeeqResponse {
  return service.processRequest({
    identity: {
      userId: 'rukn-1',
      role: 'rukn',
      displayName: 'Rukn',
    },
    route: '/home',
    intent: 'daily_execution',
    channel: 'dashboard',
  })
}

async function main(): Promise<void> {
  resetFeatureFlagServiceForTests()
  resetRuntimeObservabilityForTests()

  const results: ScenarioResult[] = []

  results.push(
    await runScenario('1. Flag OFF hides assistant', () => {
      const flags = getFeatureFlagService()
      assert(flags.isDigitalRafeeqEnabled() === false, 'flag should default false')
      const view = buildRuknAssistantViewModel(null, { enabled: false })
      assert(view.visibility === 'hidden', 'expected hidden when flag off')
    }),
  )

  results.push(
    await runScenario('2. Flag ON loads daily execution', async () => {
      const flags = createFeatureFlagService()
      flags.setFlag('digitalRafeeq.enabled', true)
      getFeatureFlagService().setFlag('digitalRafeeq.enabled', true)

      const service = createDigitalRafeeqService({
        runtime: createWiredRuntime(),
      })
      await service.initialize()
      assert(service.isEnabled() === true, 'service should report enabled')

      const response = processDailyExecution(service)
      assert(response.success, 'expected successful daily_execution')
      const view = buildRuknAssistantViewModel(response, { enabled: true })
      assert(
        view.visibility === 'ready' || view.visibility === 'empty',
        'expected visible model',
      )
      assert(view.recommendations.length <= 3, 'max three recommendations')
      assert(typeof view.connectQueue.connectedKarkuns === 'string', 'queue missing')
      assert(
        typeof view.personalProgress.complianceReminders === 'string',
        'progress missing',
      )
    }),
  )

  results.push(
    await runScenario('3. No recommendations maps to empty-safe view', () => {
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
          intent: 'daily_execution',
          sessionId: 'session-empty',
          source: 'service',
          validated: true,
        },
      }
      const view = buildRuknAssistantViewModel(synthetic, { enabled: true })
      assert(view.visibility === 'empty', 'expected empty when no content')
      assert(view.recommendations.length === 0, 'expected no recommendations')
      assert(view.todaysMission === null, 'expected no mission')
      assert(view.signals.meetingDue === false, 'no meeting due')
      assert(view.signals.followUpDue === false, 'no follow-up due')
    }),
  )

  results.push(
    await runScenario('4. Meeting due signal from preparation guidance', () => {
      const synthetic = {
        success: true,
        runtimeStatus: 'Ready' as const,
        conversationState: 'guidance' as const,
        sessionId: 'session-meeting',
        knowledgeSummary: {
          requestedDomains: ['meeting', 'karkun'],
          availableDomains: ['meeting', 'karkun'],
          unavailableDomains: [],
          partialDomains: [],
          aggregateConfidence: 'medium',
          providerCount: 2,
        },
        guidancePlan: {
          getRecommendations: () => [
            {
              id: 'g1',
              category: 'preparation',
              localizationKey: 'guidance.preparation.meeting',
              suggestedActionType: 'offer_preparation',
              priority: 'high',
            },
          ],
          getPrimaryRecommendation: () => ({
            id: 'g1',
            category: 'preparation',
            localizationKey: 'guidance.preparation.meeting',
            suggestedActionType: 'offer_preparation',
            priority: 'high',
          }),
        },
        communicationPlan: {
          getMessages: () => [
            {
              recommendationId: 'g1',
              localizationKey: 'guidance.preparation.meeting',
              variables: { karkunName: 'Demo' },
            },
          ],
          getPrimaryMessage: () => ({
            recommendationId: 'g1',
            localizationKey: 'guidance.preparation.meeting',
            variables: { karkunName: 'Demo' },
          }),
        },
        health: 'healthy' as const,
        timing: {
          startedAt: Date.now(),
          completedAt: Date.now(),
          durationMs: 1,
          stages: {},
        },
        metadata: {
          intent: 'daily_execution' as const,
          sessionId: 'session-meeting',
          source: 'service' as const,
          validated: true,
        },
      } as unknown as DigitalRafeeqResponse

      const view = buildRuknAssistantViewModel(synthetic, { enabled: true })
      assert(view.signals.meetingDue === true, 'expected meeting due')
      assert(view.todaysMission !== null, 'expected mission from meeting prep')
      assert(
        view.connectQueue.pendingMeetings.includes('meeting'),
        'expected pending meetings copy',
      )
    }),
  )

  results.push(
    await runScenario('5. Follow-up due signal from reminder guidance', () => {
      const synthetic = {
        success: true,
        runtimeStatus: 'Ready' as const,
        conversationState: 'guidance' as const,
        sessionId: 'session-followup',
        knowledgeSummary: null,
        guidancePlan: {
          getRecommendations: () => [
            {
              id: 'g2',
              category: 'reminder',
              localizationKey: 'guidance.reminder.deferred',
              suggestedActionType: 'offer_reminder',
              priority: 'high',
            },
          ],
          getPrimaryRecommendation: () => ({
            id: 'g2',
            category: 'reminder',
            localizationKey: 'guidance.reminder.deferred',
            suggestedActionType: 'offer_reminder',
            priority: 'high',
          }),
        },
        communicationPlan: {
          getMessages: () => [],
          getPrimaryMessage: () => null,
        },
        health: 'healthy' as const,
        timing: {
          startedAt: Date.now(),
          completedAt: Date.now(),
          durationMs: 1,
          stages: {},
        },
        metadata: {
          intent: 'daily_execution' as const,
          sessionId: 'session-followup',
          source: 'service' as const,
          validated: true,
        },
      } as unknown as DigitalRafeeqResponse

      const view = buildRuknAssistantViewModel(synthetic, { enabled: true })
      assert(view.signals.followUpDue === true, 'expected follow-up due')
      assert(
        view.connectQueue.pendingVisits.includes('follow-up'),
        'expected pending visits copy',
      )
    }),
  )

  results.push(
    await runScenario('6. Runtime unavailable hides panel', () => {
      const cold = createDigitalRafeeqService()
      const response = cold.processRequest({
        identity: { userId: 'rukn-1', role: 'rukn' },
        route: '/home',
        intent: 'daily_execution',
      })
      assert(response.success === false, 'expected failure')
      const view = buildRuknAssistantViewModel(response, { enabled: true })
      assert(view.visibility === 'hidden', 'expected hidden when runtime unavailable')
    }),
  )

  results.push(
    await runScenario('7. Repository unavailable still maps gracefully', async () => {
      getFeatureFlagService().setFlag('digitalRafeeq.enabled', true)
      const bare = createDigitalRafeeqService({
        runtime: createTestingRuntime({ packageVersion: '1.0.0-rc.1' }),
      })
      await bare.initialize()
      const response = processDailyExecution(bare)
      const view = buildRuknAssistantViewModel(response, { enabled: true })
      assert(
        view.visibility === 'ready' ||
          view.visibility === 'empty' ||
          view.visibility === 'hidden',
        'unexpected visibility',
      )
      assert(view.recommendations.length <= 3, 'max three recommendations')
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

  console.log(`\nAll ${results.length} Rukn assistant scenarios passed.`)
}

void main()
