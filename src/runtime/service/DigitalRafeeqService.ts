/**
 * Digital Rafeeq Service (KC-005 Sprint 2.4).
 *
 * Purpose: Single public entry point for Karkun Connect → Digital Rafeeq Runtime.
 * Ownership: Request validation, runtime invocation, response normalization, events.
 *
 * Does not contain business rules, repository access, AI, or UI.
 */

import type { CommunicationPlan } from '@/conversation/communication'
import type { GuidanceBundle } from '@/conversation/guidance'
import type { RuntimeContainer } from '@/conversation/runtime'
import {
  getRuntimeBootstrapResult,
  initializeRuntime,
  type InitializeRuntimeOptions,
} from '../bootstrap/initializeRuntime'
import {
  createConversationOrchestrator,
  type ConversationOrchestrator,
  type ConversationRequest,
  type ConversationResponse,
  type OrchestrationEvent,
} from '../orchestration'
import type { DigitalRafeeqRequest } from './DigitalRafeeqRequest'
import type { DigitalRafeeqResponse } from './DigitalRafeeqResponse'
import type {
  DigitalRafeeqEvent,
  DigitalRafeeqEventListener,
} from './DigitalRafeeqEvents'
import {
  DIGITAL_RAFEEQ_INTENTS,
  DIGITAL_RAFEEQ_ROLES,
  type DigitalRafeeqError,
  type DigitalRafeeqHealth,
  type DigitalRafeeqHealthStatus,
  type DigitalRafeeqSession,
  type DigitalRafeeqStatus,
  type DigitalRafeeqTiming,
} from './DigitalRafeeqTypes'

export type DigitalRafeeqServiceOptions = {
  /** Inject a pre-built runtime (tests / advanced wiring). */
  runtime?: RuntimeContainer
  orchestrator?: ConversationOrchestrator
}

export class DigitalRafeeqService {
  private status: DigitalRafeeqStatus = 'NotInitialized'
  private runtime: RuntimeContainer | null = null
  private orchestrator: ConversationOrchestrator | null = null
  private initializedAt: number | undefined
  private lastResponse: DigitalRafeeqResponse | null = null
  private unsubscribeOrchestrator: (() => void) | null = null
  private readonly listeners = new Set<DigitalRafeeqEventListener>()
  private readonly injected: DigitalRafeeqServiceOptions

  constructor(options: DigitalRafeeqServiceOptions = {}) {
    this.injected = options
    if (options.runtime) {
      this.bindRuntime(options.runtime, options.orchestrator)
    }
  }

  /**
   * Initialize runtime + orchestrator. Idempotent when already Ready/Degraded.
   */
  async initialize(
    options?: InitializeRuntimeOptions,
  ): Promise<DigitalRafeeqHealth> {
    if (this.runtime && (this.status === 'Ready' || this.status === 'Degraded')) {
      return this.getHealth()
    }

    if (this.injected.runtime) {
      this.bindRuntime(this.injected.runtime, this.injected.orchestrator)
      return this.getHealth()
    }

    this.status = 'Initializing'
    const bootstrap = await initializeRuntime(options)
    if (!bootstrap.runtime) {
      this.status = bootstrap.status === 'Failed' ? 'Failed' : 'Unavailable'
      this.runtime = null
      this.orchestrator = null
      return this.getHealth()
    }

    this.bindRuntime(bootstrap.runtime)
    this.initializedAt = bootstrap.initializedAt ?? Date.now()
    return this.getHealth()
  }

  isReady(): boolean {
    return (
      this.runtime !== null &&
      this.orchestrator !== null &&
      (this.status === 'Ready' || this.status === 'Degraded')
    )
  }

  getHealth(): DigitalRafeeqHealth {
    if (!this.runtime) {
      const bootstrap = getRuntimeBootstrapResult()
      const message =
        bootstrap.errorMessage ??
        (this.status === 'NotInitialized'
          ? 'Digital Rafeeq Service is not initialized'
          : undefined)
      return {
        status: this.status === 'NotInitialized' ? 'NotInitialized' : this.status,
        healthy: false,
        health: this.mapStatusToHealth(this.status),
        missingDependencies: [],
        message,
        initializedAt: this.initializedAt,
      }
    }

    const healthy = this.runtime.isHealthy()
    const health: DigitalRafeeqHealthStatus = healthy ? 'healthy' : 'degraded'
    return {
      status: this.status,
      healthy,
      health,
      runtimeVersion: this.runtime.runtimeVersion(),
      missingDependencies: this.runtime.missingDependencies(),
      message: healthy
        ? undefined
        : this.runtime.missingDependencies().join(', ') || 'Runtime degraded',
      initializedAt: this.initializedAt,
    }
  }

  onEvent(listener: DigitalRafeeqEventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Validate and process a conversational request through the orchestrator.
   */
  processRequest(request: DigitalRafeeqRequest): DigitalRafeeqResponse {
    const startedAt = Date.now()
    const validationError = this.validateRequest(request)
    if (validationError) {
      return this.failureResponse(startedAt, request, validationError, false)
    }

    if (!this.isReady() || !this.orchestrator) {
      return this.failureResponse(
        startedAt,
        request,
        {
          code: 'NOT_READY',
          message: 'Digital Rafeeq Service is not ready',
        },
        true,
      )
    }

    try {
      const orchestrationRequest = this.toOrchestrationRequest(request)
      const orchestrationResponse = this.orchestrator.handle(orchestrationRequest)
      const response = this.toServiceResponse(orchestrationResponse, request, startedAt)
      this.lastResponse = response
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.emit({
        type: 'ConversationFailed',
        timestamp: Date.now(),
        sessionId: request.sessionId ?? '',
        intent: request.intent,
        errorMessage: message,
      })
      return this.failureResponse(
        startedAt,
        request,
        { code: 'ORCHESTRATION_FAILED', message },
        true,
      )
    }
  }

  startConversation(request: DigitalRafeeqRequest): DigitalRafeeqResponse {
    return this.processRequest({
      ...request,
      intent: request.intent === 'interrupt' || request.intent === 'resume'
        ? 'general'
        : request.intent,
    })
  }

  resumeConversation(request: DigitalRafeeqRequest): DigitalRafeeqResponse {
    return this.processRequest({ ...request, intent: 'resume' })
  }

  interruptConversation(request: DigitalRafeeqRequest): DigitalRafeeqResponse {
    return this.processRequest({ ...request, intent: 'interrupt' })
  }

  /**
   * Complete and close the active conversation session.
   */
  completeConversation(): DigitalRafeeqResponse {
    const startedAt = Date.now()
    if (!this.isReady() || !this.runtime) {
      return this.failureResponse(
        startedAt,
        null,
        {
          code: 'NOT_READY',
          message: 'Digital Rafeeq Service is not ready',
        },
        true,
      )
    }

    const engine = this.runtime.conversationEngine
    const sessionId = engine.getSession()?.sessionId ?? ''
    const result = engine.closeConversation()
    const timing = this.emptyTiming(startedAt)
    const response: DigitalRafeeqResponse = {
      success: result.success,
      runtimeStatus: this.status,
      conversationState: engine.getState(),
      sessionId,
      knowledgeSummary: null,
      guidancePlan: null,
      communicationPlan: null,
      health: this.getHealth().health,
      timing,
      metadata: {
        sessionId,
        source: 'service',
        validated: true,
      },
      error: result.success
        ? undefined
        : {
            code: 'ORCHESTRATION_FAILED',
            message: result.error ?? 'Failed to complete conversation',
          },
    }
    this.lastResponse = response
    return response
  }

  getSession(): DigitalRafeeqSession | null {
    if (!this.runtime || !this.orchestrator) return null

    const engineSession = this.runtime.conversationEngine.getSession()
    if (!engineSession) return null

    const recorded = this.orchestrator
      .getSessionManager()
      .get(engineSession.sessionId)

    if (recorded) {
      return {
        sessionId: recorded.sessionId,
        conversationState: recorded.conversationState,
        currentContext: recorded.currentContext,
        pendingConfirmation: recorded.pendingConfirmation,
        generatedGuidance: recorded.generatedGuidance,
        communicationPlan: recorded.communicationPlan,
        lastIntent: recorded.lastIntent,
        interrupted: recorded.interrupted,
        metadata: recorded.metadata,
      }
    }

    return {
      sessionId: engineSession.sessionId,
      conversationState: this.runtime.conversationEngine.getState(),
      currentContext: this.runtime.conversationEngine.getContext(),
      pendingConfirmation:
        this.runtime.conversationEngine.getPendingConfirmation(),
      generatedGuidance: this.lastResponse?.guidancePlan ?? null,
      communicationPlan: this.lastResponse?.communicationPlan ?? null,
      lastIntent: this.lastResponse?.metadata.intent ?? null,
      interrupted: false,
      metadata: {},
    }
  }

  getCommunicationPlan(): CommunicationPlan | null {
    if (this.lastResponse?.communicationPlan) {
      return this.lastResponse.communicationPlan
    }
    return this.getSession()?.communicationPlan ?? null
  }

  getGuidance(): GuidanceBundle | null {
    if (this.lastResponse?.guidancePlan) {
      return this.lastResponse.guidancePlan
    }
    return this.getSession()?.generatedGuidance ?? null
  }

  /**
   * Detach runtime wiring and return the service to an uninitialized state.
   * Does not tear down the global bootstrap singleton used by other consumers.
   */
  shutdown(): void {
    if (this.runtime?.conversationEngine.getSession()) {
      this.runtime.conversationEngine.closeConversation()
    }
    this.unsubscribeOrchestrator?.()
    this.unsubscribeOrchestrator = null
    this.runtime = null
    this.orchestrator = null
    this.lastResponse = null
    this.initializedAt = undefined
    this.status = 'NotInitialized'
  }

  /** Test helper — clear wired runtime without touching global bootstrap. */
  resetForTests(): void {
    this.shutdown()
  }

  private bindRuntime(
    runtime: RuntimeContainer,
    orchestrator?: ConversationOrchestrator,
  ): void {
    this.unsubscribeOrchestrator?.()
    this.runtime = runtime
    this.orchestrator =
      orchestrator ?? createConversationOrchestrator({ runtime })
    this.status = runtime.isHealthy() ? 'Ready' : 'Degraded'
    this.initializedAt = this.initializedAt ?? Date.now()
    this.unsubscribeOrchestrator = this.orchestrator.onEvent((event) => {
      this.forwardOrchestrationEvent(event)
    })
    this.emit({
      type: 'RuntimeReady',
      timestamp: Date.now(),
      status: this.status,
      health: this.getHealth().health,
    })
  }

  private validateRequest(request: DigitalRafeeqRequest): DigitalRafeeqError | null {
    if (!request || typeof request !== 'object') {
      return { code: 'VALIDATION', message: 'Request is required' }
    }
    if (!request.identity?.userId || typeof request.identity.userId !== 'string') {
      return { code: 'VALIDATION', message: 'identity.userId is required' }
    }
    if (!DIGITAL_RAFEEQ_ROLES.includes(request.identity.role)) {
      return {
        code: 'VALIDATION',
        message: `identity.role must be one of: ${DIGITAL_RAFEEQ_ROLES.join(', ')}`,
      }
    }
    if (!DIGITAL_RAFEEQ_INTENTS.includes(request.intent)) {
      return {
        code: 'VALIDATION',
        message: `intent must be one of: ${DIGITAL_RAFEEQ_INTENTS.join(', ')}`,
      }
    }
    return null
  }

  private toOrchestrationRequest(
    request: DigitalRafeeqRequest,
  ): ConversationRequest {
    return {
      identity: request.identity,
      route: request.route,
      intent: request.intent,
      payload: request.payload,
      channel: request.channel,
      locale: request.locale,
      sessionId: request.sessionId,
      metadata: request.metadata,
    }
  }

  private toServiceResponse(
    orchestration: ConversationResponse,
    request: DigitalRafeeqRequest,
    serviceStartedAt: number,
  ): DigitalRafeeqResponse {
    const timing: DigitalRafeeqTiming = {
      startedAt: orchestration.timing.startedAt || serviceStartedAt,
      completedAt: orchestration.timing.completedAt,
      durationMs: orchestration.timing.durationMs,
      stages: orchestration.timing.stages,
    }

    return {
      success: orchestration.success,
      runtimeStatus: this.status,
      conversationState: orchestration.conversationState,
      sessionId: orchestration.sessionId,
      knowledgeSummary: orchestration.knowledgeSummary,
      guidancePlan: orchestration.guidancePlan,
      communicationPlan: orchestration.communicationPlan,
      health: orchestration.health,
      timing,
      metadata: {
        intent: request.intent,
        sessionId: orchestration.sessionId,
        source: 'service',
        validated: true,
      },
      error: orchestration.errorMessage
        ? {
            code: 'ORCHESTRATION_FAILED',
            message: orchestration.errorMessage,
          }
        : undefined,
    }
  }

  private failureResponse(
    startedAt: number,
    request: DigitalRafeeqRequest | null,
    error: DigitalRafeeqError,
    validated: boolean,
  ): DigitalRafeeqResponse {
    const timing = this.emptyTiming(startedAt)
    const response: DigitalRafeeqResponse = {
      success: false,
      runtimeStatus:
        error.code === 'NOT_READY' || error.code === 'RUNTIME_UNAVAILABLE'
          ? this.status === 'NotInitialized'
            ? 'Unavailable'
            : this.status
          : this.status,
      conversationState: this.getSession()?.conversationState ?? 'idle',
      sessionId: request?.sessionId ?? '',
      knowledgeSummary: null,
      guidancePlan: null,
      communicationPlan: null,
      health:
        error.code === 'VALIDATION'
          ? this.getHealth().health
          : 'unavailable',
      timing,
      metadata: {
        intent: request?.intent,
        sessionId: request?.sessionId,
        source: 'service',
        validated,
      },
      error,
    }
    this.lastResponse = response
    return response
  }

  private emptyTiming(startedAt: number): DigitalRafeeqTiming {
    const completedAt = Date.now()
    return {
      startedAt,
      completedAt,
      durationMs: completedAt - startedAt,
      stages: {},
    }
  }

  private mapStatusToHealth(status: DigitalRafeeqStatus): DigitalRafeeqHealthStatus {
    switch (status) {
      case 'Ready':
        return 'healthy'
      case 'Degraded':
        return 'degraded'
      case 'Failed':
        return 'failed'
      case 'NotInitialized':
      case 'Initializing':
      case 'Unavailable':
      default:
        return 'unavailable'
    }
  }

  private forwardOrchestrationEvent(event: OrchestrationEvent): void {
    switch (event.type) {
      case 'ConversationStarted':
        this.emit({
          type: 'ConversationStarted',
          timestamp: event.timestamp,
          sessionId: event.sessionId,
          intent: event.intent,
          conversationState: event.conversationState,
        })
        break
      case 'ConversationCompleted':
        this.emit({
          type: 'ConversationCompleted',
          timestamp: event.timestamp,
          sessionId: event.sessionId,
          intent: event.intent,
          health: event.health,
        })
        break
      case 'ConversationInterrupted':
        this.emit({
          type: 'ConversationInterrupted',
          timestamp: event.timestamp,
          sessionId: event.sessionId,
          intent: event.intent,
        })
        break
      case 'ConversationFailed':
        this.emit({
          type: 'ConversationFailed',
          timestamp: event.timestamp,
          sessionId: event.sessionId,
          intent: event.intent,
          errorMessage: event.errorMessage,
        })
        break
      case 'GuidanceGenerated':
        this.emit({
          type: 'GuidanceGenerated',
          timestamp: event.timestamp,
          sessionId: event.sessionId,
          intent: event.intent,
          recommendationCount: event.recommendationCount,
        })
        break
      case 'CommunicationComposed':
        this.emit({
          type: 'CommunicationReady',
          timestamp: event.timestamp,
          sessionId: event.sessionId,
          intent: event.intent,
          messageCount: event.messageCount,
        })
        break
      default:
        break
    }
  }

  private emit(event: DigitalRafeeqEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}
