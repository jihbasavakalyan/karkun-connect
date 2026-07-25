/**
 * KC-0119 — CommunicationEngine orchestrator.
 *
 * ContextResolver → AudienceResolver → PendingMatterAggregator →
 * MessageComposer → EditorialValidator → (Preview) → HistoryRecorder → DeliveryAdapter
 */

import { buildContextAwareInput } from './audienceResolvers'
import { getDeliveryPort } from './deliveryPorts'
import { validateEditorialMessage } from './editorialValidator'
import { composeContextAwareCommunication } from './engine'
import { recordContextAwareHistory } from './historyRecorder'
import { aggregatePendingMatters } from './pendingMatterAggregator'
import type {
  CommunicationContextId,
  ContextAwareCommunicationInput,
  ContextAwareDeliveryChannel,
  ContextAwareDeliveryResult,
  ContextAwareHistoryRecord,
  GeneratedCommunication,
} from './types'

export function runContextAwareCommunicationPipeline(
  context: CommunicationContextId,
  options?: {
    recipients?: ContextAwareCommunicationInput['recipients']
    pendingMatters?: ContextAwareCommunicationInput['pendingMatters']
    audienceLabel?: string
  },
): GeneratedCommunication {
  const resolved = buildContextAwareInput(context, options)
  const aggregated: ContextAwareCommunicationInput = {
    ...resolved,
    pendingMatters: aggregatePendingMatters(resolved.pendingMatters),
  }
  return composeContextAwareCommunication(aggregated)
}

/** Public entry used by Notify hooks / screens. */
export function generateContextAwareCommunication(
  context: CommunicationContextId,
  options?: {
    recipients?: ContextAwareCommunicationInput['recipients']
    pendingMatters?: ContextAwareCommunicationInput['pendingMatters']
    audienceLabel?: string
  },
): GeneratedCommunication {
  return runContextAwareCommunicationPipeline(context, options)
}

export function revalidateContextAwareMessage(
  draft: GeneratedCommunication,
  message: string,
): GeneratedCommunication {
  const editorial = validateEditorialMessage(message, {
    pendingMatterCount: draft.pendingMatters.length,
  })
  return {
    ...draft,
    message,
    editorial,
  }
}

export async function sendContextAwareCommunication(input: {
  draft: GeneratedCommunication
  message: string
  channel: ContextAwareDeliveryChannel
  sentBy: string
}): Promise<{
  delivery: ContextAwareDeliveryResult
  history: ContextAwareHistoryRecord
  draft: GeneratedCommunication
}> {
  const validated = revalidateContextAwareMessage(input.draft, input.message)
  const port = getDeliveryPort(input.channel)
  const delivery = await port.deliver({
    channel: input.channel,
    recipients: validated.recipients,
    message: input.message,
    context: validated.context,
  })
  const history = recordContextAwareHistory({
    draft: validated,
    generatedMessage: validated.generatedMessage,
    finalMessage: input.message,
    channel: input.channel,
    sentBy: input.sentBy,
    delivery,
  })
  return { delivery, history, draft: validated }
}
