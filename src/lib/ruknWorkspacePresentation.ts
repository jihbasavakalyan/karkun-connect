/**
 * KC-0129 — Rukn workspace presentation helpers.
 * Pending counts and status badges are derived from existing campaign progress only.
 * No new campaign / assignment calculations.
 */

import { buildCampaignExecutionSummary } from '@/lib/campaignExecutionMatrix'
import { shouldSuggestCampaignInitiation } from '@/lib/communication/officialCommunicationEngine'
import { getMessageHistory } from '@/services/historyService'

export type RuknWorkspaceStatusTone = 'green' | 'amber' | 'red'

export type RuknWorkspaceStatus = {
  label: 'On Track' | 'Needs Attention' | 'Immediate Action'
  tone: RuknWorkspaceStatusTone
  icon: '🟢' | '🟡' | '🔴'
  badgeVariant: 'healthy' | 'attention' | 'urgent'
}

export type RuknWorkspacePending = {
  connectedKarkuns: number
  pendingVisits: number
  pendingWeeklyIjtema: number
  pendingMonthlyBaitulMaal: number
  pendingAppRegistration: number
  /** Existing campaign completion % (completed / assigned). */
  completionPct: number
}

/** Presentation-only pending responsibilities from `buildCampaignExecutionSummary`. */
export function buildRuknWorkspacePending(ruknId: string): RuknWorkspacePending {
  const summary = buildCampaignExecutionSummary(ruknId)
  const assigned = summary.assigned
  const completionPct =
    assigned > 0 ? Math.round((summary.completed / assigned) * 100) : 0

  return {
    connectedKarkuns: assigned,
    pendingVisits: Math.max(0, assigned - summary.visitCompleted),
    pendingWeeklyIjtema: Math.max(0, assigned - summary.ijtemaRecorded),
    pendingMonthlyBaitulMaal: Math.max(0, assigned - summary.baitulMaalCommitted),
    pendingAppRegistration: Math.max(0, assigned - summary.jihRegistered),
    completionPct,
  }
}

/**
 * Status from existing campaign progress % — same thresholds as dashboard badges,
 * collapsed to the three operational labels required by the workspace.
 */
export function ruknWorkspaceStatus(
  completionPct: number,
  connectedKarkuns: number,
): RuknWorkspaceStatus {
  if (connectedKarkuns <= 0) {
    return {
      label: 'Needs Attention',
      tone: 'amber',
      icon: '🟡',
      badgeVariant: 'attention',
    }
  }
  if (completionPct >= 60) {
    return {
      label: 'On Track',
      tone: 'green',
      icon: '🟢',
      badgeVariant: 'healthy',
    }
  }
  if (completionPct >= 40) {
    return {
      label: 'Needs Attention',
      tone: 'amber',
      icon: '🟡',
      badgeVariant: 'attention',
    }
  }
  return {
    label: 'Immediate Action',
    tone: 'red',
    icon: '🔴',
    badgeVariant: 'urgent',
  }
}

/** Most recent communication to this Rukn, if any (existing history store). */
export function getRuknLastCommunicationLabel(ruknId: string): string | null {
  const [latest] = getMessageHistory({ personId: ruknId })
  if (!latest?.sentAt) return null
  const when = new Date(latest.sentAt)
  if (!Number.isFinite(when.getTime())) return null
  return when.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Auto-select Official Briefing template for one-click Communicate.
 * Selection only — reuses existing initiation helper and campaign progress.
 */
export function resolveOfficialBriefingTemplateId(ruknId: string): string {
  if (shouldSuggestCampaignInitiation(ruknId)) {
    return 'tpl-oc-campaign-initiation-pending'
  }
  const summary = buildCampaignExecutionSummary(ruknId)
  const pct =
    summary.assigned > 0
      ? Math.round((summary.completed / summary.assigned) * 100)
      : 0
  if (pct >= 80) {
    return 'tpl-oc-appreciation'
  }
  return 'tpl-oc-weekly-encouragement'
}
