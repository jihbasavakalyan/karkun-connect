/**
 * KC-035D — Classify dialogue move from intent + session/workflow state.
 */

import { IntentCategory, IntentCode, type IntentRecognitionResult } from '@/intents'
import type { WorkflowSessionState } from '@/workflows'
import type { DialogueMove, DialogueSessionState } from '../models'
import { isCorrectionUtterance } from './correctionPatterns'

const OPERATIONAL_UPDATE: ReadonlySet<IntentCode> = new Set([
  IntentCode.SHOW_PERSON_DETAILS,
  IntentCode.SHOW_DASHBOARD,
  IntentCode.SHOW_CAMPAIGN_STATUS,
  IntentCode.SHOW_REPORT,
  IntentCode.SHOW_WEEKLY_IJTEMA,
  IntentCode.SHOW_PENDING_TASKS,
  IntentCode.RECORD_CONNECTION,
  IntentCode.RECORD_VISIT,
  IntentCode.RECORD_ATTENDANCE,
  IntentCode.RECORD_APP_REGISTRATION,
  IntentCode.RECORD_BAITUL_MAAL,
  IntentCode.FIND_PERSON,
  IntentCode.FIND_RUKN,
  IntentCode.FIND_CAMPAIGN,
  IntentCode.GENERATE_REPORT,
  IntentCode.ASSIGN_WORKER,
  IntentCode.ADD_WORKER,
  IntentCode.EDIT_WORKER,
])

export function isOperationalIntent(intent: IntentCode): boolean {
  return OPERATIONAL_UPDATE.has(intent)
}

function isAffirmativeUtterance(recognition: IntentRecognitionResult): boolean {
  if (recognition.intent === IntentCode.CONTINUE) return true
  const n = (recognition.normalizedUtterance || '').trim()
  return /^(جی|جی ہاں|ہاں|yes|ok|ٹھیک|درست)$/u.test(n)
}

export function classifyDialogueMove(input: {
  readonly recognition: IntentRecognitionResult
  readonly workflow: WorkflowSessionState
  readonly dialogue: DialogueSessionState
  readonly activePersonId: string | null
}): DialogueMove {
  const intent = input.recognition.intent
  const utterance = input.recognition.originalUtterance

  if (intent === IntentCode.CANCEL) return 'cancel'
  if (intent === IntentCode.START_OVER) return 'restart'
  if (intent === IntentCode.REPEAT) return 'repeat'
  if (intent === IntentCode.HELP) return 'help'
  if (intent === IntentCode.NEXT) return 'next'

  if (isCorrectionUtterance(utterance)) return 'correct'

  const awaiting =
    input.workflow.pendingConfirmation != null ||
    input.workflow.pendingNextAction != null ||
    input.workflow.status === 'awaiting_confirmation' ||
    input.workflow.status === 'clarifying'

  if (awaiting && isAffirmativeUtterance(input.recognition)) {
    return 'resume'
  }

  const entityPersonId = input.recognition.entities.personId

  // Context switch before interrupt / clarify — explicit new person id
  if (
    entityPersonId &&
    input.activePersonId &&
    entityPersonId !== input.activePersonId
  ) {
    return 'switch_person'
  }

  // Interrupt: new operational intent while confirmation / next pending
  if (
    awaiting &&
    isOperationalIntent(intent) &&
    intent !== input.workflow.pendingConfirmation?.intent &&
    intent !== input.workflow.pendingNextAction?.intent
  ) {
    return 'interrupt'
  }

  // Clarification answer — only while repairing / clarifying, not for fresh ops
  const repairing =
    input.workflow.status === 'clarifying' || input.dialogue.repairIntent != null
  if (
    repairing &&
    !isOperationalIntent(intent) &&
    (entityPersonId ||
      input.recognition.entities.personName ||
      input.recognition.entities.relativePerson)
  ) {
    return 'clarify_answer'
  }

  if (
    intent === IntentCode.SHOW_PENDING_TASKS ||
    intent === IntentCode.SHOW_DASHBOARD ||
    intent === IntentCode.SHOW_WEEKLY_IJTEMA ||
    intent === IntentCode.SHOW_REPORT
  ) {
    return 'route_navigation'
  }

  if (
    input.recognition.category === IntentCategory.NAVIGATION ||
    intent === IntentCode.NAVIGATE_DASHBOARD ||
    intent === IntentCode.NAVIGATE_HOME ||
    intent === IntentCode.NAVIGATE_BACK ||
    intent === IntentCode.NAVIGATE_ATTENDANCE ||
    intent === IntentCode.NAVIGATE_PAYMENT ||
    intent === IntentCode.NAVIGATE_WORKERS ||
    intent === IntentCode.NAVIGATE_REPORTS ||
    intent === IntentCode.NAVIGATE_SETTINGS ||
    intent === IntentCode.NAVIGATE_CAMPAIGN ||
    intent === IntentCode.NAVIGATE_ACTIVITIES
  ) {
    return 'route_navigation'
  }

  if (isOperationalIntent(intent) || intent === IntentCode.PREVIOUS) {
    return 'route_workflow'
  }

  if (intent === IntentCode.UNKNOWN) {
    if (awaiting) return 'resume'
    return 'acknowledge_unknown'
  }

  return 'acknowledge_unknown'
}
