/**
 * Conversation Orchestrator (KC-005 Sprint 2.3).
 *
 * Purpose: Coordinate existing runtime modules into a complete conversational workflow.
 * Ownership: Coordination only — never owns business rules, repositories, or wording.
 *
 * Flow:
 * Incoming Request → Conversation Engine → Context → Knowledge → Guidance → Communication
 */

import type { ConversationContext } from '@/conversation'
import type { RuntimeContainer } from '@/conversation/runtime'
import type { ConversationRequest } from './ConversationRequest'
import type { ConversationResponse, KnowledgeSummary } from './ConversationResponse'
import {
  ConversationSessionManager,
  createConversationSessionManager,
} from './ConversationSessionManager'
import type {
  OrchestrationEvent,
  OrchestrationEventListener,
} from './OrchestrationEvents'
import {
  planForIntent,
  type OrchestrationHealthStatus,
  type OrchestrationStageName,
  type OrchestrationTiming,
} from './OrchestrationTypes'

export type ConversationOrchestratorOptions = {
  runtime: RuntimeContainer
  sessionManager?: ConversationSessionManager
}

export class ConversationOrchestrator {
  private readonly runtime: RuntimeContainer
  private readonly sessionManager: ConversationSessionManager
  private readonly listeners = new Set<OrchestrationEventListener>()

  constructor(options: ConversationOrchestratorOptions) {
    this.runtime = options.runtime
    this.sessionManager =
      options.sessionManager ?? createConversationSessionManager()
  }

  getSessionManager(): ConversationSessionManager {
    return this.sessionManager
  }

  onEvent(listener: OrchestrationEventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Execute a full end-to-end conversation workflow.
   * Deterministic coordination — no business validation.
   */
  handle(request: ConversationRequest): ConversationResponse {
    const startedAt = Date.now()
    const stages: Partial<Record<OrchestrationStageName, number>> = {}
    const plan = planForIntent(request.intent)
    const engine = this.runtime.conversationEngine
    const contextManager = this.runtime.contextManager

    try {
      if (request.intent === 'interrupt') {
        return this.handleInterrupt(request, startedAt)
      }

      if (request.intent === 'resume') {
        return this.handleResume(request)
      }

      // 1. Conversation Engine — ensure session
      const stageConversationStart = Date.now()
      let sessionId = request.sessionId
      const existingSession = sessionId
        ? this.sessionManager.get(sessionId)
        : null

      if (!engine.getSession() || !existingSession) {
        const startResult = engine.startConversation({
          currentUser: {
            id: request.identity.userId,
            displayName: request.identity.displayName,
          },
          currentRole: request.identity.role,
          currentObjective: plan.objective,
        })
        sessionId = startResult.sessionId
        this.emit({
          type: 'ConversationStarted',
          sessionId,
          timestamp: Date.now(),
          intent: request.intent,
          conversationState: engine.getState(),
        })
      } else {
        sessionId = existingSession.sessionId
      }
      stages.conversation = Date.now() - stageConversationStart

      // 2. Resolve Context
      const stageContextStart = Date.now()
      contextManager.setNavigation({
        currentView: plan.navigationView,
        routePath: request.route,
      })
      contextManager.updateBaseConversation({
        currentUser: {
          id: request.identity.userId,
          displayName: request.identity.displayName,
        },
        currentRole: request.identity.role,
        currentObjective: plan.objective,
        currentKarkun:
          typeof request.payload?.karkunId === 'string'
            ? {
                karkunId: request.payload.karkunId,
                karkunName:
                  typeof request.payload.karkunName === 'string'
                    ? request.payload.karkunName
                    : undefined,
              }
            : undefined,
      })
      const context = engine.requestContext()
      this.emit({
        type: 'ContextResolved',
        sessionId,
        timestamp: Date.now(),
        intent: request.intent,
      })
      stages.context = Date.now() - stageContextStart

      // 3. Load Knowledge
      const stageKnowledgeStart = Date.now()
      const knowledgeBundle = engine.requestKnowledge({
        domains: plan.domains,
        sessionId,
        conversationContext: context ?? undefined,
        filters: {
          ruknId:
            request.identity.role === 'rukn' ? request.identity.userId : undefined,
          karkunId:
            typeof request.payload?.karkunId === 'string'
              ? request.payload.karkunId
              : undefined,
          ...request.payload,
        },
      })
      const knowledgeSummary = this.summarizeKnowledge(knowledgeBundle)
      this.emit({
        type: 'KnowledgeResolved',
        sessionId,
        timestamp: Date.now(),
        intent: request.intent,
        domainCount: knowledgeSummary?.requestedDomains.length ?? 0,
        unavailableCount: knowledgeSummary?.unavailableDomains.length ?? 0,
      })
      stages.knowledge = Date.now() - stageKnowledgeStart

      // 4. Generate Guidance
      const stageGuidanceStart = Date.now()
      const guidancePlan = engine.requestGuidance({
        conversationState: engine.getState(),
        pendingConfirmation: engine.getPendingConfirmation(),
        knowledgeBundle,
        knowledgeDomains: plan.domains,
        sessionId,
      })
      this.emit({
        type: 'GuidanceGenerated',
        sessionId,
        timestamp: Date.now(),
        intent: request.intent,
        recommendationCount: guidancePlan?.getRecommendations().length ?? 0,
      })
      stages.guidance = Date.now() - stageGuidanceStart

      // 5. Compose Communication
      const stageCommunicationStart = Date.now()
      const channel = request.channel ?? this.runtime.configuration.conversation.defaultChannel
      const communicationPlan = engine.requestCommunication({
        conversationState: engine.getState(),
        pendingConfirmation: engine.getPendingConfirmation(),
        knowledgeBundle,
        knowledgeDomains: plan.domains,
        guidanceBundle: guidancePlan,
        channel,
        localization: {
          locale:
            request.locale ??
            this.runtime.configuration.localization.defaultLocale,
          fallbackLocale: this.runtime.configuration.localization.fallbackLocale,
          formality: this.runtime.configuration.localization.formality,
        },
        sessionId,
      })
      this.emit({
        type: 'CommunicationComposed',
        sessionId,
        timestamp: Date.now(),
        intent: request.intent,
        messageCount: communicationPlan?.getMessages().length ?? 0,
      })
      stages.communication = Date.now() - stageCommunicationStart

      const health = this.resolveHealth(knowledgeBundle, guidancePlan, communicationPlan)
      const timing = this.buildTiming(startedAt, stages)

      this.sessionManager.upsert({
        sessionId,
        createdAt: this.sessionManager.get(sessionId)?.createdAt ?? startedAt,
        lastActivityAt: Date.now(),
        conversationState: engine.getState(),
        currentContext: (context ?? engine.getContext()) as ConversationContext | null,
        pendingConfirmation: engine.getPendingConfirmation(),
        generatedGuidance: guidancePlan,
        communicationPlan,
        lastIntent: request.intent,
        interrupted: false,
        metadata: {
          ...request.metadata,
          route: request.route,
        },
      })

      this.emit({
        type: 'ConversationCompleted',
        sessionId,
        timestamp: Date.now(),
        intent: request.intent,
        health,
      })

      return {
        success: health !== 'failed',
        sessionId,
        conversationState: engine.getState(),
        knowledgeSummary,
        knowledgeBundle,
        guidancePlan,
        communicationPlan,
        health,
        timing,
        metadata: {
          intent: request.intent,
          domains: plan.domains,
          runtimeHealthy: this.runtime.isHealthy(),
          registeredAdapters: this.runtime.registeredAdapters(),
          registeredProviders:
            this.runtime.knowledgeManager.getRegisteredProviderIds(),
        },
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Orchestration failed'
      const sessionId =
        request.sessionId ?? engine.getSession()?.sessionId ?? 'unknown'

      this.emit({
        type: 'ConversationFailed',
        sessionId,
        timestamp: Date.now(),
        intent: request.intent,
        errorMessage: message,
      })

      return {
        success: false,
        sessionId,
        conversationState: engine.getState(),
        knowledgeSummary: null,
        knowledgeBundle: null,
        guidancePlan: null,
        communicationPlan: null,
        health: 'failed',
        timing: this.buildTiming(startedAt, stages),
        errorMessage: message,
      }
    }
  }

  private handleInterrupt(
    request: ConversationRequest,
    startedAt: number,
  ): ConversationResponse {
    const engine = this.runtime.conversationEngine
    const sessionId = request.sessionId ?? engine.getSession()?.sessionId ?? ''

    if (engine.getSession()) {
      engine.handleRequest({ type: 'interrupt' })
    }
    if (sessionId) {
      this.sessionManager.markInterrupted(sessionId)
    }

    this.emit({
      type: 'ConversationInterrupted',
      sessionId,
      timestamp: Date.now(),
      intent: request.intent,
    })

    return {
      success: true,
      sessionId,
      conversationState: engine.getState(),
      knowledgeSummary: null,
      knowledgeBundle: null,
      guidancePlan: null,
      communicationPlan: null,
      health: this.runtime.isHealthy() ? 'healthy' : 'degraded',
      timing: this.buildTiming(startedAt, {}),
      metadata: { interrupted: true },
    }
  }

  private handleResume(request: ConversationRequest): ConversationResponse {
    const engine = this.runtime.conversationEngine
    const sessionId = request.sessionId ?? engine.getSession()?.sessionId ?? ''

    if (engine.getSession()) {
      engine.handleRequest({ type: 'resume' })
    }
    if (sessionId) {
      this.sessionManager.markResumed(sessionId)
    }

    this.emit({
      type: 'ConversationResumed',
      sessionId,
      timestamp: Date.now(),
      intent: request.intent,
    })

    // Continue with a general flow after resume.
    return this.handle({
      ...request,
      intent: 'general',
      sessionId,
    })
  }

  private summarizeKnowledge(
    bundle: ConversationResponse['knowledgeBundle'],
  ): KnowledgeSummary | null {
    if (!bundle) return null
    const availability = bundle.getAvailability()
    const confidence = bundle.getConfidence()
    const metadata = bundle.getMetadata()

    return {
      requestedDomains: [...metadata.requestedDomains],
      availableDomains: metadata.requestedDomains.filter(
        (domain) =>
          availability.byDomain[domain] === 'available' ||
          availability.byDomain[domain] === 'partial',
      ),
      unavailableDomains: [...availability.unavailableDomains],
      partialDomains: [...availability.partialDomains],
      aggregateConfidence: confidence.aggregate,
      providerCount: metadata.providerCount,
    }
  }

  private resolveHealth(
    knowledgeBundle: ConversationResponse['knowledgeBundle'],
    guidancePlan: ConversationResponse['guidancePlan'],
    communicationPlan: ConversationResponse['communicationPlan'],
  ): OrchestrationHealthStatus {
    if (!this.runtime.isHealthy()) {
      return 'degraded'
    }
    if (!knowledgeBundle && !guidancePlan && !communicationPlan) {
      return 'unavailable'
    }
    const unavailable =
      knowledgeBundle?.getAvailability().unavailableDomains.length ?? 0
    if (unavailable > 0 || !communicationPlan) {
      return 'degraded'
    }
    return 'healthy'
  }

  private buildTiming(
    startedAt: number,
    stages: Partial<Record<OrchestrationStageName, number>>,
  ): OrchestrationTiming {
    const completedAt = Date.now()
    return {
      startedAt,
      completedAt,
      durationMs: completedAt - startedAt,
      stages,
    }
  }

  private emit(event: OrchestrationEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}

export function createConversationOrchestrator(
  options: ConversationOrchestratorOptions,
): ConversationOrchestrator {
  return new ConversationOrchestrator(options)
}
