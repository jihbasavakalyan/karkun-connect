/**
 * KC-035C — Workflow definition contract.
 */

import type { IntentCode } from '@/intents'
import type { WorkflowActorRole } from './WorkflowResult'
import type { WorkflowId } from './WorkflowId'

export type WorkflowRequiredEntity = 'person' | 'campaign' | 'rukn'

export type WorkflowDefinition = {
  readonly id: WorkflowId
  readonly triggerIntent: IntentCode
  readonly requiredEntities: readonly WorkflowRequiredEntity[]
  readonly allowedRoles: readonly WorkflowActorRole[]
  readonly requiresConfirmationBelowExecuteBand: boolean
  readonly labelUrdu: string
}

export type WorkflowHandlerContext = {
  readonly sessionId: string
  readonly actor: import('./WorkflowResult').WorkflowActor
  readonly personId: string
  readonly personName: string
  readonly confirmed: boolean
}

export type WorkflowHandlerResult =
  | {
      readonly ok: true
      readonly summaryUrdu: string
      readonly remainingLabels: readonly string[]
      readonly next?: {
        readonly intent: IntentCode
        readonly labelUrdu: string
      } | null
    }
  | { readonly ok: false; readonly errorUrdu: string; readonly errorCode?: string }

export type WorkflowHandler = (
  ctx: WorkflowHandlerContext,
) => WorkflowHandlerResult | Promise<WorkflowHandlerResult>
