/**
 * KC-035A — Context resolver (infrastructure only).
 * Resolves active operational slots from session context.
 * Does NOT perform name search / intent recognition / CRUD.
 */

import {
  buildMissingContextClarification,
  type ClarificationFramework,
} from '../clarification/ClarificationFramework'
import { SECRETARY_URDU } from '../style/secretaryUrduCopy'
import type { ClarificationRequest } from '../types/Clarification'
import type {
  ConversationContext,
  ConversationPersonRef,
} from '../types/ConversationContext'

export type PersonResolution =
  | { readonly status: 'resolved'; readonly person: ConversationPersonRef }
  | { readonly status: 'needs_clarification'; readonly clarification: ClarificationRequest }
  | { readonly status: 'missing'; readonly clarification: ClarificationRequest }

export type CampaignResolution =
  | { readonly status: 'resolved'; readonly campaignId: string; readonly campaignName: string | null }
  | { readonly status: 'missing'; readonly clarification: ClarificationRequest }

export class ContextResolver {
  private readonly clarifications: ClarificationFramework

  constructor(clarifications: ClarificationFramework) {
    this.clarifications = clarifications
  }

  /** Resolve active person from conversation context (no re-asking if set). */
  resolveActivePerson(context: ConversationContext): PersonResolution {
    if (context.activePerson) {
      return { status: 'resolved', person: context.activePerson }
    }
    return {
      status: 'missing',
      clarification: this.clarifications.buildMissingContextClarification(
        SECRETARY_URDU.noActivePerson,
      ),
    }
  }

  resolveActiveCampaign(context: ConversationContext): CampaignResolution {
    if (context.activeCampaignId) {
      return {
        status: 'resolved',
        campaignId: context.activeCampaignId,
        campaignName: context.activeCampaignName,
      }
    }
    return {
      status: 'missing',
      clarification: buildMissingContextClarification(SECRETARY_URDU.noActiveCampaign),
    }
  }

  /**
   * If candidates were already gathered by a future Intent Engine,
   * disambiguate via clarification framework — or return sole candidate.
   */
  resolvePersonAmongCandidates(
    context: ConversationContext,
    candidates: readonly ConversationPersonRef[],
  ): PersonResolution {
    if (context.activePerson) {
      const stillPresent = candidates.find((c) => c.personId === context.activePerson!.personId)
      if (stillPresent || candidates.length === 0) {
        return { status: 'resolved', person: context.activePerson }
      }
    }
    if (candidates.length === 1) {
      return { status: 'resolved', person: candidates[0]! }
    }
    if (candidates.length === 0) {
      return {
        status: 'missing',
        clarification: this.clarifications.buildMissingContextClarification(
          SECRETARY_URDU.noActivePerson,
        ),
      }
    }
    return {
      status: 'needs_clarification',
      clarification: this.clarifications.buildPersonClarification({
        options: candidates.map((c) => ({
          id: c.personId,
          label: c.displayName,
          subtitle: c.disambiguator,
          payload: { kind: c.kind },
        })),
      }),
    }
  }
}

export function createContextResolver(
  clarifications: ClarificationFramework,
): ContextResolver {
  return new ContextResolver(clarifications)
}
