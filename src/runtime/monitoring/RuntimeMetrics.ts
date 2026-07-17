/**
 * Runtime metrics collector (KC-006 Sprint 6.1).
 *
 * Purpose: In-process counters and duration aggregates for observability.
 * Ownership: Metrics only — no business decisions.
 */

export type RuntimeMetricsSnapshot = {
  runtimeStartupDurationMs: number | null
  conversationDurationTotalMs: number
  conversationDurationCount: number
  conversationDurationAverageMs: number
  knowledgeResolutionDurationTotalMs: number
  knowledgeResolutionDurationCount: number
  guidanceGenerationDurationTotalMs: number
  guidanceGenerationDurationCount: number
  communicationCompositionDurationTotalMs: number
  communicationCompositionDurationCount: number
  requestCount: number
  successCount: number
  failureCount: number
  interruptedConversations: number
  resumedConversations: number
  repositoryAvailable: boolean | null
  runtimeAvailable: boolean | null
}

export type RequestMetricInput = {
  success: boolean
  durationMs: number
  stages?: Readonly<Partial<Record<string, number>>>
  interrupted?: boolean
  resumed?: boolean
}

export class RuntimeMetrics {
  private runtimeStartupDurationMs: number | null = null
  private conversationDurationTotalMs = 0
  private conversationDurationCount = 0
  private knowledgeResolutionDurationTotalMs = 0
  private knowledgeResolutionDurationCount = 0
  private guidanceGenerationDurationTotalMs = 0
  private guidanceGenerationDurationCount = 0
  private communicationCompositionDurationTotalMs = 0
  private communicationCompositionDurationCount = 0
  private requestCount = 0
  private successCount = 0
  private failureCount = 0
  private interruptedConversations = 0
  private resumedConversations = 0
  private repositoryAvailable: boolean | null = null
  private runtimeAvailable: boolean | null = null

  recordStartup(durationMs: number): void {
    this.runtimeStartupDurationMs = Math.max(0, durationMs)
  }

  recordRequest(input: RequestMetricInput): void {
    this.requestCount += 1
    if (input.success) {
      this.successCount += 1
    } else {
      this.failureCount += 1
    }

    this.conversationDurationTotalMs += Math.max(0, input.durationMs)
    this.conversationDurationCount += 1

    const stages = input.stages ?? {}
    if (typeof stages.knowledge === 'number') {
      this.knowledgeResolutionDurationTotalMs += stages.knowledge
      this.knowledgeResolutionDurationCount += 1
    }
    if (typeof stages.guidance === 'number') {
      this.guidanceGenerationDurationTotalMs += stages.guidance
      this.guidanceGenerationDurationCount += 1
    }
    if (typeof stages.communication === 'number') {
      this.communicationCompositionDurationTotalMs += stages.communication
      this.communicationCompositionDurationCount += 1
    }

    if (input.interrupted) {
      this.interruptedConversations += 1
    }
    if (input.resumed) {
      this.resumedConversations += 1
    }
  }

  setRepositoryAvailable(available: boolean): void {
    this.repositoryAvailable = available
  }

  setRuntimeAvailable(available: boolean): void {
    this.runtimeAvailable = available
  }

  getSnapshot(): RuntimeMetricsSnapshot {
    return {
      runtimeStartupDurationMs: this.runtimeStartupDurationMs,
      conversationDurationTotalMs: this.conversationDurationTotalMs,
      conversationDurationCount: this.conversationDurationCount,
      conversationDurationAverageMs:
        this.conversationDurationCount === 0
          ? 0
          : this.conversationDurationTotalMs / this.conversationDurationCount,
      knowledgeResolutionDurationTotalMs: this.knowledgeResolutionDurationTotalMs,
      knowledgeResolutionDurationCount: this.knowledgeResolutionDurationCount,
      guidanceGenerationDurationTotalMs: this.guidanceGenerationDurationTotalMs,
      guidanceGenerationDurationCount: this.guidanceGenerationDurationCount,
      communicationCompositionDurationTotalMs:
        this.communicationCompositionDurationTotalMs,
      communicationCompositionDurationCount:
        this.communicationCompositionDurationCount,
      requestCount: this.requestCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      interruptedConversations: this.interruptedConversations,
      resumedConversations: this.resumedConversations,
      repositoryAvailable: this.repositoryAvailable,
      runtimeAvailable: this.runtimeAvailable,
    }
  }

  reset(): void {
    this.runtimeStartupDurationMs = null
    this.conversationDurationTotalMs = 0
    this.conversationDurationCount = 0
    this.knowledgeResolutionDurationTotalMs = 0
    this.knowledgeResolutionDurationCount = 0
    this.guidanceGenerationDurationTotalMs = 0
    this.guidanceGenerationDurationCount = 0
    this.communicationCompositionDurationTotalMs = 0
    this.communicationCompositionDurationCount = 0
    this.requestCount = 0
    this.successCount = 0
    this.failureCount = 0
    this.interruptedConversations = 0
    this.resumedConversations = 0
    this.repositoryAvailable = null
    this.runtimeAvailable = null
  }
}

export function createRuntimeMetrics(): RuntimeMetrics {
  return new RuntimeMetrics()
}
