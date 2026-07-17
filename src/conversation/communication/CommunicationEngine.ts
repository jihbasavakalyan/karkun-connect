/**
 * Communication Engine — transform guidance into channel-neutral message models (KC-004 Sprint 1.4).
 *
 * Purpose: Own template selection, composition, localization keys, and channel adaptation.
 * Ownership: Wording selection via keys — not data retrieval, recommendations, or validation.
 * Extension points: Presentation Layer resolves localization keys to DRCS-compliant copy.
 * Future localization strategy: Register locale packs that override template metadata per channel.
 */

import type { GuidanceRecommendation } from '../guidance'
import { CommunicationFormatter, createCommunicationFormatter } from './CommunicationFormatter'
import { CommunicationPlan } from './CommunicationPlan'
import {
  CommunicationRegistry,
  createCommunicationRegistry,
  registerBuiltInCommunicationTemplates,
} from './CommunicationRegistry'
import type { CommunicationTemplate } from './CommunicationTemplates'
import type {
  CommunicationMessage,
  CommunicationRequest,
  TemplateCategory,
} from './CommunicationTypes'

export type CommunicationEngineOptions = {
  registry?: CommunicationRegistry
  formatter?: CommunicationFormatter
  registerDefaults?: boolean
}

/**
 * Bridge consumed by Guidance Engine — Conversation Engine never accesses templates.
 */
export interface CommunicationEngineBridge {
  composePlan(request: CommunicationRequest): CommunicationPlan
}

let planCounter = 0

function createPlanId(): string {
  planCounter += 1
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `plan_${crypto.randomUUID()}`
  }
  return `plan_${Date.now()}_${planCounter}`
}

const CATEGORY_MAP: Record<GuidanceRecommendation['category'], TemplateCategory> = {
  greeting: 'greeting',
  clarification: 'clarification',
  confirmation: 'confirmation',
  reminder: 'reminder',
  preparation: 'preparation',
  suggestion: 'suggestion',
  encouragement: 'encouragement',
  completion: 'completion',
  recovery: 'recovery',
}

export class CommunicationEngine implements CommunicationEngineBridge {
  private readonly registry: CommunicationRegistry
  private readonly formatter: CommunicationFormatter
  private latestPlan: CommunicationPlan | null = null

  constructor(options: CommunicationEngineOptions = {}) {
    this.registry = options.registry ?? createCommunicationRegistry()
    this.formatter = options.formatter ?? createCommunicationFormatter()
    if (options.registerDefaults !== false) {
      registerBuiltInCommunicationTemplates(this.registry)
    }
  }

  getRegistry(): CommunicationRegistry {
    return this.registry
  }

  getFormatter(): CommunicationFormatter {
    return this.formatter
  }

  registerTemplate(template: CommunicationTemplate): () => void {
    return this.registry.register(template)
  }

  getLatestPlan(): CommunicationPlan | null {
    return this.latestPlan
  }

  composePlan(request: CommunicationRequest): CommunicationPlan {
    const recommendations = request.guidanceBundle.getRecommendations()
    const messages: CommunicationMessage[] = []

    for (const recommendation of recommendations) {
      const category = CATEGORY_MAP[recommendation.category]
      const template = this.registry.findForChannel(
        recommendation.localizationKey,
        category,
        request.channel,
      )

      if (!template) continue

      const message = this.formatter.formatMessage({
        recommendation,
        template,
        conversationContext: request.conversationContext,
        channel: request.channel,
        localization: request.localization,
        sequenceOrder: recommendation.sequenceOrder,
      })

      if (message) {
        messages.push(message)
      }
    }

    const sequenced = this.formatter.assignSequence(messages)
    const uniqueTemplates = new Set(sequenced.map((message) => message.templateKey))

    const plan = CommunicationPlan.create({
      metadata: {
        planId: createPlanId(),
        composedAt: Date.now(),
        channel: request.channel,
        locale: request.localization.locale,
        messageCount: sequenced.length,
        templateCount: uniqueTemplates.size,
        sessionId: request.sessionId,
      },
      messages: sequenced,
    })

    this.latestPlan = plan
    return plan
  }
}

export function createCommunicationEngine(
  options?: CommunicationEngineOptions,
): CommunicationEngine {
  return new CommunicationEngine(options)
}
