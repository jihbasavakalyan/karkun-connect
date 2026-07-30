/**
 * KC-035C — Workflow handlers (orchestrate services; no business rules).
 */

import { IntentCode } from '@/intents'
import type { WorkflowHandler, WorkflowHandlerResult } from '../models'
import {
  buildPersonDetailsResponse,
  buildSaveAndSuggestResponse,
} from '../responses'
import { WORKFLOW_URDU } from '../responses/workflowUrduCopy'
import { loadPersonRemaining } from '../steps/personSteps'
import type { WorkflowServiceAdapters } from './serviceAdapters'

function resolveRuknId(ctx: {
  actor: { ruknId?: string | null; userId: string; role: string }
}): string {
  return (ctx.actor.ruknId ?? ctx.actor.userId).trim() || ctx.actor.userId
}

export function createShowPersonDetailsHandler(): WorkflowHandler {
  return (ctx) => {
    const snap = loadPersonRemaining({
      personId: ctx.personId,
      personName: ctx.personName,
      ruknId: ctx.actor.ruknId,
    })
    const response = buildPersonDetailsResponse({
      name: ctx.personName,
      completed: snap.completed,
      remaining: snap.remaining,
      situationSummary: snap.situationSummary,
    })
    return {
      ok: true,
      summaryUrdu: response,
      remainingLabels: snap.remaining,
      next: snap.next,
    }
  }
}

function afterMutation(
  ctx: Parameters<WorkflowHandler>[0],
  savedLine: string,
): WorkflowHandlerResult {
  const snap = loadPersonRemaining({
    personId: ctx.personId,
    personName: ctx.personName,
    ruknId: ctx.actor.ruknId,
  })
  const body = buildSaveAndSuggestResponse({
    savedLine,
    suggestion: snap.next,
  })
  return {
    ok: true,
    summaryUrdu: body,
    remainingLabels: snap.remaining,
    next: snap.next,
  }
}

export function createRecordVisitHandler(
  adapters: WorkflowServiceAdapters,
): WorkflowHandler {
  return (ctx) => {
    const ruknId = resolveRuknId(ctx)
    const result = adapters.recordVisit({
      personId: ctx.personId,
      ruknId,
      actorId: ctx.actor.userId,
    })
    if (!result.success) {
      return {
        ok: false,
        errorUrdu: WORKFLOW_URDU.failed,
        errorCode: result.error,
      }
    }
    return afterMutation(ctx, WORKFLOW_URDU.visitSaved)
  }
}

export function createRecordAppRegistrationHandler(
  adapters: WorkflowServiceAdapters,
): WorkflowHandler {
  return (ctx) => {
    const ruknId = resolveRuknId(ctx)
    const result = adapters.recordAppRegistration({
      personId: ctx.personId,
      ruknId,
    })
    if (!result.success) {
      return {
        ok: false,
        errorUrdu: WORKFLOW_URDU.failed,
        errorCode: result.error,
      }
    }
    return afterMutation(ctx, WORKFLOW_URDU.appSaved)
  }
}

export function createRecordWeeklyIjtemaHandler(
  adapters: WorkflowServiceAdapters,
): WorkflowHandler {
  return (ctx) => {
    const ruknId = resolveRuknId(ctx)
    const result = adapters.recordWeeklyIjtema({
      personId: ctx.personId,
      ruknId,
      actorId: ctx.actor.userId,
    })
    if (!result.success) {
      return {
        ok: false,
        errorUrdu: WORKFLOW_URDU.failed,
        errorCode: result.error,
      }
    }
    return afterMutation(ctx, WORKFLOW_URDU.ijtemaSaved)
  }
}

export function createRecordBaitulMaalHandler(
  adapters: WorkflowServiceAdapters,
): WorkflowHandler {
  return (ctx) => {
    const ruknId = resolveRuknId(ctx)
    const result = adapters.recordBaitulMaal({
      personId: ctx.personId,
      ruknId,
      actorId: ctx.actor.userId,
    })
    if (!result.success) {
      return {
        ok: false,
        errorUrdu: WORKFLOW_URDU.failed,
        errorCode: result.error,
      }
    }
    return afterMutation(ctx, WORKFLOW_URDU.baitulSaved)
  }
}

/** Intent → default saved line for confirmation prompts. */
export function previewLineForIntent(intent: IntentCode): string {
  switch (intent) {
    case IntentCode.RECORD_VISIT:
      return 'ملاقات محفوظ کی جائے گی۔'
    case IntentCode.RECORD_APP_REGISTRATION:
      return 'ایپ رجسٹریشن محفوظ کی جائے گی۔'
    case IntentCode.RECORD_ATTENDANCE:
      return 'ہفتہ وار اجتماع کی حاضری محفوظ کی جائے گی۔'
    case IntentCode.RECORD_BAITUL_MAAL:
      return 'بیت المال محفوظ کیا جائے گا۔'
    default:
      return WORKFLOW_URDU.askConfirm
  }
}
