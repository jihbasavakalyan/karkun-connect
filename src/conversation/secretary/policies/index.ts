/**
 * Placeholder planning policies (KC-0131.4).
 * Architecture only — no business enforcement beyond structural placeholders.
 */

import type {
  ConfirmationPolicy,
  OrderingPolicy,
  PlanningPolicy,
  RolePolicy,
  SafetyPolicy,
} from '../contracts'
import {
  createConfirmationRequirement,
  type ExecutionStep,
  type PlanningContext,
} from '../plans'

const READ_ONLY = new Set(['SEARCH', 'NAVIGATION', 'REPORT'])
const MUTATING = new Set([
  'VISIT_UPDATE',
  'FOLLOW_UP',
  'IJTEMA_ATTENDANCE',
  'BAITUL_MAAL',
  'APP_REGISTRATION',
  'CALL',
  'WHATSAPP',
  'REMINDER',
])

const ORDER_RANK: Record<string, number> = {
  SEARCH: 10,
  NAVIGATION: 20,
  REPORT: 30,
  CALL: 40,
  WHATSAPP: 50,
  VISIT_UPDATE: 60,
  FOLLOW_UP: 70,
  IJTEMA_ATTENDANCE: 80,
  BAITUL_MAAL: 90,
  APP_REGISTRATION: 100,
  REMINDER: 110,
  UNKNOWN: 1000,
}

export function createPlaceholderPlanningPolicy(): PlanningPolicy {
  return {
    name: 'placeholder-planning-policy',
    evaluate(step, _context) {
      if (step.intentCode === 'UNKNOWN') {
        return { allowed: false, reason: 'UNKNOWN intents cannot be planned for execution' }
      }
      return { allowed: true, reason: null }
    },
  }
}

export function createPlaceholderConfirmationPolicy(): ConfirmationPolicy {
  return {
    name: 'placeholder-confirmation-policy',
    decide(step, _context: PlanningContext) {
      if (step.status === 'blocked') {
        return createConfirmationRequirement({
          kind: 'blocked',
          reason: 'Step blocked by policy',
          stepId: step.id ?? 'pending',
          prompt: null,
        })
      }
      if (step.status === 'incomplete') {
        return createConfirmationRequirement({
          kind: 'incomplete',
          reason: 'Missing parameters or ambiguous targets',
          stepId: step.id ?? 'pending',
          prompt: null,
        })
      }
      if (READ_ONLY.has(String(step.intentCode))) {
        return createConfirmationRequirement({
          kind: 'not_required',
          reason: 'Read-only / navigational intent',
          stepId: step.id ?? 'pending',
          prompt: null,
        })
      }
      return createConfirmationRequirement({
        kind: 'required',
        reason: 'Mutating or secretary action requires confirmation (DRDS)',
        stepId: step.id ?? 'pending',
        prompt: `آپ کی ہدایت کے مطابق ${step.intentCode} کے لیے تصدیق مطلوب ہے؟`,
      })
    },
  }
}

export function createPlaceholderOrderingPolicy(): OrderingPolicy {
  return {
    name: 'placeholder-ordering-policy',
    rank(intentCode: string) {
      return ORDER_RANK[intentCode] ?? 500
    },
  }
}

export function createPlaceholderSafetyPolicy(): SafetyPolicy {
  return {
    name: 'placeholder-safety-policy',
    review(steps: readonly ExecutionStep[], _context: PlanningContext) {
      const blockedStepIds: string[] = []
      const reasons: Record<string, string> = {}
      for (const step of steps) {
        if (step.intentCode === 'UNKNOWN') {
          blockedStepIds.push(step.id)
          reasons[step.id] = 'Safety: UNKNOWN intent blocked'
        }
      }
      return { blockedStepIds, reasons }
    },
  }
}

export function createPlaceholderRolePolicy(): RolePolicy {
  return {
    name: 'placeholder-role-policy',
    allows(intentCode: string, context: PlanningContext) {
      // Architecture placeholder: both roles may plan all registered codes.
      // Real authz belongs in platform services — never duplicated here.
      void intentCode
      void context
      return true
    },
  }
}

export function isReadOnlyIntent(code: string): boolean {
  return READ_ONLY.has(code)
}

export function isMutatingIntent(code: string): boolean {
  return MUTATING.has(code)
}
