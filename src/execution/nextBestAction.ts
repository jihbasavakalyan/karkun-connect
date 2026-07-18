/**
 * KC-020 — Next Best Action contract.
 * Every completed execution must produce one structured recommendation.
 * Digital Rafeeq presents it; it does not invent it.
 */

import type { ExecutionOutcomeCode, ExecutionType } from './types'

export const NEXT_BEST_ACTION_CODES = [
  'SCHEDULE_MEETING',
  'CREATE_FOLLOW_UP',
  'RETRY_CONTACT',
  'VERIFY_CONTACT',
  'CONTINUE_DEVELOPMENT',
  'RECORD_IJTEMA',
  'UPDATE_COMPLIANCE',
  'CLOSE_LOOP',
  'REVIEW_OUTCOME',
] as const

export type NextBestActionCode =
  | (typeof NEXT_BEST_ACTION_CODES)[number]
  | (string & {})

export type NextBestActionPriority = 'high' | 'medium' | 'low'

export type NextBestAction = {
  id: string
  code: NextBestActionCode
  executionContextId: string
  executionType: ExecutionType
  /** Machine-readable reason; not Urdu presentation. */
  reason: string
  priority: NextBestActionPriority
  /** Suggested delay before acting (minutes). */
  suggestedDelayMinutes?: number
  /** Optional route hint for UI (absolute path). */
  routeHint?: string
  workerId?: string
  ruknId?: string
  campaignId?: string
  createdAt: string
  metadata?: Record<string, string | number | boolean | null>
}

export type NextBestActionRuleInput = {
  executionType: ExecutionType
  outcomeCode: ExecutionOutcomeCode
  workerId?: string
  ruknId?: string
  campaignId?: string
  executionContextId: string
  now?: string
}

/**
 * Deterministic mapping: outcome → next best action.
 * Extend by adding rules; do not put screen-specific logic here.
 */
export function deriveNextBestAction(input: NextBestActionRuleInput): NextBestAction {
  const now = input.now ?? new Date().toISOString()
  const base = {
    id: `nba-${input.executionContextId}`,
    executionContextId: input.executionContextId,
    executionType: input.executionType,
    workerId: input.workerId,
    ruknId: input.ruknId,
    campaignId: input.campaignId,
    createdAt: now,
  }

  const outcome = String(input.outcomeCode)
  const type = String(input.executionType)

  if (outcome === 'wrong_number') {
    return {
      ...base,
      code: 'VERIFY_CONTACT',
      reason: 'Contact details appear incorrect and must be verified before retry.',
      priority: 'high',
      routeHint: '/rukn/my-karkun',
    }
  }

  if (outcome === 'no_answer' || outcome === 'reschedule') {
    return {
      ...base,
      code: 'RETRY_CONTACT',
      reason: 'Contact was not completed; retry after a suitable interval.',
      priority: 'medium',
      suggestedDelayMinutes: outcome === 'no_answer' ? 180 : 1440,
    }
  }

  if (type === 'phone_call' && (outcome === 'success' || outcome === 'partial')) {
    return {
      ...base,
      code: 'SCHEDULE_MEETING',
      reason: 'Phone contact succeeded; schedule a meeting to advance the objective.',
      priority: 'high',
      routeHint: '/rukn/meetings',
    }
  }

  if (type === 'meeting' && (outcome === 'success' || outcome === 'partial')) {
    return {
      ...base,
      code: 'CREATE_FOLLOW_UP',
      reason: 'Meeting completed; create a follow-up to continue development.',
      priority: 'high',
      routeHint: '/rukn/follow-ups',
    }
  }

  if (type === 'follow_up' && (outcome === 'success' || outcome === 'partial')) {
    return {
      ...base,
      code: 'CONTINUE_DEVELOPMENT',
      reason: 'Follow-up completed; continue worker development actions.',
      priority: 'medium',
    }
  }

  if (type === 'ijtema' && (outcome === 'success' || outcome === 'partial')) {
    return {
      ...base,
      code: 'RECORD_IJTEMA',
      reason: 'Ijtema participation recorded; confirm related development steps.',
      priority: 'medium',
    }
  }

  if (
    (type === 'baitulmaal' || type === 'jih_portal') &&
    (outcome === 'success' || outcome === 'partial')
  ) {
    return {
      ...base,
      code: 'UPDATE_COMPLIANCE',
      reason: 'Compliance-related execution completed; verify record status.',
      priority: 'medium',
      routeHint: '/rukn/compliance',
    }
  }

  if (outcome === 'declined' || outcome === 'cancelled' || outcome === 'incomplete') {
    return {
      ...base,
      code: 'REVIEW_OUTCOME',
      reason: 'Execution did not complete as planned; review and choose the next step.',
      priority: 'medium',
    }
  }

  return {
    ...base,
    code: 'CLOSE_LOOP',
    reason: 'Execution completed; confirm campaign progress and close the loop.',
    priority: 'low',
  }
}
