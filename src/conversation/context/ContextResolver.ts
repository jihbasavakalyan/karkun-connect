/**
 * Context resolution — merge, normalize, conflict resolution, completeness (KC-004 Sprint 1.1).
 *
 * Purpose: Turn provider contributions into a single ConversationContext and snapshot data.
 * Ownership: ContextResolver is stateless; Context Manager invokes it on each resolve cycle.
 * Future provider examples: AiContextProvider contributions merged at lower priority than user.
 * Extension notes: Add field-specific merge strategies if multi-provider overlap grows.
 */

import { createEmptyConversationContext } from '../ConversationContext'
import type { ConversationContext } from '../ConversationContext'
import type {
  ConversationObjective,
  PendingConfirmation,
} from '../ConversationTypes'
import { ContextSnapshot } from './ContextSnapshot'
import type { ContextSnapshotData } from './ContextSnapshot'
import type {
  ContextCompletenessReport,
  ContextConflictRecord,
  ContextProviderContribution,
  ContextProviderId,
  ContextProviderPartial,
  NavigationContext,
  PendingActionContext,
  TransientSessionValues,
} from './ContextTypes'

export type ContextResolutionInput = {
  contributions: readonly ContextProviderContribution[]
  baseConversation?: ConversationContext
  navigation?: NavigationContext
  transient?: TransientSessionValues
  pendingConfirmation?: PendingConfirmation | null
  pendingAction?: PendingActionContext | null
  extensions?: Readonly<Record<string, unknown>>
}

export type ContextResolutionResult = {
  snapshot: ContextSnapshot
  conversation: ConversationContext
  completeness: ContextCompletenessReport
  conflicts: readonly ContextConflictRecord[]
}

const DEFAULT_NAVIGATION: NavigationContext = {
  currentView: 'unknown',
}

const STRUCTURAL_SLOTS: readonly { path: string; isFilled: (ctx: ConversationContext) => boolean }[] = [
  { path: 'sessionMetadata', isFilled: (ctx) => Boolean(ctx.sessionMetadata?.startedAt) },
  { path: 'currentObjective', isFilled: (ctx) => ctx.currentObjective !== 'none' && ctx.currentObjective !== 'unknown' },
  { path: 'currentUser', isFilled: (ctx) => Boolean(ctx.currentUser?.id) },
  { path: 'currentRole', isFilled: (ctx) => Boolean(ctx.currentRole) },
  { path: 'currentCampaign', isFilled: (ctx) => Boolean(ctx.currentCampaign?.campaignId) },
]

function sortContributions(
  contributions: readonly ContextProviderContribution[],
): ContextProviderContribution[] {
  return [...contributions].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.timestamp - a.timestamp
  })
}

function mergePartial(
  target: ContextProviderPartial,
  source: ContextProviderPartial,
  winnerId: ContextProviderId,
  loserIds: ContextProviderId[],
  fieldPath: string,
  conflicts: ContextConflictRecord[],
): void {
  const hasOverlap =
    (source.conversation !== undefined && target.conversation !== undefined) ||
    (source.navigation !== undefined && target.navigation !== undefined) ||
    (source.objective !== undefined && target.objective !== undefined) ||
    (source.pendingAction !== undefined && target.pendingAction !== undefined) ||
    (source.pendingConfirmation !== undefined && target.pendingConfirmation !== undefined)

  if (hasOverlap && loserIds.length > 0) {
    conflicts.push({
      fieldPath,
      winnerProviderId: winnerId,
      loserProviderIds: loserIds,
    })
  }

  if (source.conversation) {
    target.conversation = {
      ...target.conversation,
      ...source.conversation,
      extensions: {
        ...target.conversation?.extensions,
        ...source.conversation.extensions,
      },
    }
  }

  if (source.navigation) {
    target.navigation = { ...target.navigation, ...source.navigation }
  }

  if (source.objective !== undefined) {
    target.objective = source.objective
  }

  if (source.pendingAction !== undefined) {
    target.pendingAction = source.pendingAction
  }

  if (source.pendingConfirmation !== undefined) {
    target.pendingConfirmation = source.pendingConfirmation
  }

  if (source.transient) {
    target.transient = { ...target.transient, ...source.transient }
  }

  if (source.extensions) {
    target.extensions = { ...target.extensions, ...source.extensions }
  }
}

function normalizeObjective(value: ConversationObjective | undefined): ConversationObjective {
  return value ?? 'none'
}

function normalizeNavigation(value: Partial<NavigationContext> | undefined): NavigationContext {
  return {
    currentView: value?.currentView ?? 'unknown',
    routePath: value?.routePath,
    routeParams: value?.routeParams ? { ...value.routeParams } : undefined,
    previousView: value?.previousView,
  }
}

function assessCompleteness(conversation: ConversationContext): ContextCompletenessReport {
  const filledSlots: string[] = []
  const missingSlots: string[] = []
  const warnings: string[] = []

  for (const slot of STRUCTURAL_SLOTS) {
    if (slot.isFilled(conversation)) {
      filledSlots.push(slot.path)
    } else {
      missingSlots.push(slot.path)
    }
  }

  if (conversation.currentObjective !== 'none' && !conversation.currentKarkun?.karkunId) {
    warnings.push('Objective set without Karkun focus — may need clarification later.')
  }

  if (!conversation.currentCampaign?.campaignId) {
    warnings.push('Campaign context not yet supplied.')
  }

  const score =
    STRUCTURAL_SLOTS.length === 0
      ? 1
      : filledSlots.length / STRUCTURAL_SLOTS.length

  return {
    score,
    filledSlots,
    missingSlots,
    warnings,
  }
}

export class ContextResolver {
  resolve(input: ContextResolutionInput): ContextResolutionResult {
    const sorted = sortContributions(input.contributions)
    const conflicts: ContextConflictRecord[] = []
    const merged: ContextProviderPartial = {}
    const seenProviders: ContextProviderId[] = []

    for (const contribution of sorted) {
      const losers = seenProviders.filter((id) => id !== contribution.providerId)
      mergePartial(
        merged,
        contribution.partial,
        contribution.providerId,
        losers,
        contribution.providerId,
        conflicts,
      )
      if (!seenProviders.includes(contribution.providerId)) {
        seenProviders.push(contribution.providerId)
      }
    }

    const base = input.baseConversation ?? createEmptyConversationContext()
    const mergedMetadata = merged.conversation?.sessionMetadata
    const conversation: ConversationContext = {
      ...base,
      ...merged.conversation,
      currentObjective: normalizeObjective(merged.objective ?? merged.conversation?.currentObjective ?? base.currentObjective),
      sessionMetadata: {
        ...base.sessionMetadata,
        ...(mergedMetadata ?? {}),
        startedAt: mergedMetadata?.startedAt ?? base.sessionMetadata.startedAt,
        lastActivityAt: Date.now(),
      },
      extensions: {
        ...base.extensions,
        ...merged.extensions,
        ...merged.conversation?.extensions,
        ...input.extensions,
      },
    }

    const navigation = normalizeNavigation({
      ...DEFAULT_NAVIGATION,
      ...input.navigation,
      ...merged.navigation,
    })

    const pendingConfirmation =
      merged.pendingConfirmation ??
      input.pendingConfirmation ??
      null

    const pendingAction =
      merged.pendingAction ??
      input.pendingAction ??
      (pendingConfirmation
        ? {
            kind: 'confirmation' as const,
            label: pendingConfirmation.summary,
            confirmationId: pendingConfirmation.id,
          }
        : null)

    const transient: TransientSessionValues = {
      ...input.transient,
      ...merged.transient,
    }

    const completeness = assessCompleteness(conversation)

    const snapshotData: ContextSnapshotData = {
      conversation,
      currentView: navigation,
      currentObjective: conversation.currentObjective,
      pendingAction,
      pendingConfirmation,
      metadata: {
        resolvedAt: Date.now(),
        providerCount: sorted.length,
        completeness,
        conflicts,
      },
      transient,
      extensions: conversation.extensions,
    }

    return {
      snapshot: ContextSnapshot.create(snapshotData),
      conversation,
      completeness,
      conflicts,
    }
  }
}

export function createContextResolver(): ContextResolver {
  return new ContextResolver()
}
