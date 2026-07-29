/**
 * Campaign intelligence execution adapter (read-only REPORTING bind).
 */

import type { ExecutionStep } from '../../secretary/plans'
import type { AdapterContext, ExecutionAdapter } from '../../executionAdapters'
import {
  createAdapterError,
  createAdapterMetadata,
  createAdapterResult,
} from '../../executionAdapters'
import {
  buildCampaignIntelligence,
  formatCampaignIntelligenceText,
} from './buildCampaignIntelligence'
import type { CampaignIntelTopic } from './topics'
import type { RafeeqRole } from '../types'
import { getOrCreateSession } from '../session'

export const CAMPAIGN_INTEL_ADAPTER_ID = 'mvp-campaign-intelligence'

export function createCampaignIntelligenceAdapter(): ExecutionAdapter {
  return {
    metadata: createAdapterMetadata({
      adapterId: CAMPAIGN_INTEL_ADAPTER_ID,
      capability: 'REPORTING',
      name: 'Campaign Intelligence Adapter',
      description: 'Read-only campaign metrics via existing dashboard/metrics services',
      priority: 100,
      available: true,
      isPlaceholder: false,
      extensions: { readOnly: true },
    }),
    adapt(step: ExecutionStep, context: AdapterContext) {
      const topic = (context.extensions['campaignTopic'] as CampaignIntelTopic | undefined) ??
        'overview'
      const role: RafeeqRole =
        context.role === 'rukn' ? 'rukn' : 'administrator'
      const memorySessionId =
        typeof context.extensions['memorySessionId'] === 'string'
          ? String(context.extensions['memorySessionId'])
          : context.sessionId ?? 'campaign-intel'
      const memory = getOrCreateSession(memorySessionId)

      try {
        const payload = buildCampaignIntelligence({
          topic,
          role,
          ruknId: context.ruknId,
          memory,
        })
        return createAdapterResult({
          status: 'success',
          capability: 'REPORTING',
          adapterId: CAMPAIGN_INTEL_ADAPTER_ID,
          stepId: step.id,
          summary: formatCampaignIntelligenceText(payload).slice(0, 160),
          isPlaceholder: false,
          invokedService: true,
          metadata: {
            readOnly: true,
            wroteData: false,
            payload,
            text: formatCampaignIntelligenceText(payload),
          },
        })
      } catch (error) {
        return createAdapterResult({
          status: 'error',
          capability: 'REPORTING',
          adapterId: CAMPAIGN_INTEL_ADAPTER_ID,
          stepId: step.id,
          summary: 'Campaign intelligence unavailable',
          isPlaceholder: false,
          invokedService: false,
          error: createAdapterError({
            code: 'adapter_unavailable',
            message:
              error instanceof Error ? error.message : 'Campaign intelligence failed',
            capability: 'REPORTING',
            adapterId: CAMPAIGN_INTEL_ADAPTER_ID,
            stepId: step.id,
          }),
        })
      }
    },
  }
}
