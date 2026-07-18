/**
 * KC-014 — Presentation helpers for continuous Rukn workflow.
 * Uses existing guidance urgency ordering only — no engine changes.
 */

import { ROUTES, ruknVisitPath } from '@/constants/routes'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'

export type WorkflowSuccessState = {
  successMessage: string
  nextActionLabel?: string
  nextActionRoute?: string
}

/** Next highest-urgency visit route, optionally excluding a just-completed Karkun. */
export function resolveNextPriorityVisitRoute(
  ruknId: string,
  excludeKarkunId?: string,
): { karkunId: string; karkunName: string; route: string } | null {
  const sorted = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))
  const next = sorted.find((item) => item.karkunId !== excludeKarkunId)
  if (!next) return null
  return {
    karkunId: next.karkunId,
    karkunName: next.karkunName,
    route: next.nextAction.route || ruknVisitPath(next.karkunId),
  }
}

/** Top priority for Home primary CTA (single-tap into visit workflow). */
export function resolveHomePrimaryWorkflow(ruknId: string): {
  label: string
  route: string
  karkunName?: string
} | null {
  const next = resolveNextPriorityVisitRoute(ruknId)
  if (!next) return null
  return {
    label: `Record visit — ${next.karkunName}`,
    route: `${next.route}#visit-details`,
    karkunName: next.karkunName,
  }
}

/**
 * After saving a visit, continue to the next priority task when possible.
 * Admin destinations unchanged.
 */
export function resolvePostVisitWorkflowDestination(options: {
  isAdminContext: boolean
  followUpRequired: boolean
  ruknId: string
  completedKarkunId: string
  completedKarkunName: string
}): { route: string; state: WorkflowSuccessState } {
  const { isAdminContext, followUpRequired, ruknId, completedKarkunId, completedKarkunName } =
    options

  const baseMessage = `Visit recorded for ${completedKarkunName}.${
    followUpRequired ? ' Follow-up scheduled.' : ''
  }`

  if (isAdminContext) {
    return {
      route: followUpRequired
        ? `${ROUTES.ADMIN_FOLLOW_UP}?section=follow-ups`
        : `${ROUTES.ADMIN_EXECUTION}?section=pending`,
      state: { successMessage: baseMessage },
    }
  }

  const next = resolveNextPriorityVisitRoute(ruknId, completedKarkunId)
  if (next) {
    return {
      route: `${next.route}#visit-details`,
      state: {
        successMessage: `${baseMessage} Next: ${next.karkunName}.`,
        nextActionLabel: `Continue with ${next.karkunName}`,
        nextActionRoute: `${next.route}#visit-details`,
      },
    }
  }

  return {
    route: ROUTES.RUKN,
    state: {
      successMessage: `${baseMessage} You're caught up for now.`,
      nextActionLabel: 'Back to Home',
      nextActionRoute: ROUTES.RUKN,
    },
  }
}
