/**
 * KC-0129 / KC-0130 — Rukn workspace presentation helpers.
 * Pending counts and status badges derive from existing campaign progress only.
 * Card + Official Briefing share `buildOfficialCampaignSummary` (single source of truth).
 */

import { buildCampaignExecutionSummary } from '@/lib/campaignExecutionMatrix'
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

/** KC-0130 — Structured campaign summary for card + Official Briefing parity. */
export type OfficialCampaignSummary = {
  connectedKarkuns: number
  completedVisits: number
  pendingVisits: number
  completedWeeklyIjtema: number
  pendingWeeklyIjtema: number
  completedMonthlyBaitulMaal: number
  pendingMonthlyBaitulMaal: number
  completedAppRegistration: number
  pendingAppRegistration: number
  lastCommunication: string
  overallStatus: RuknWorkspaceStatus
  completionPct: number
  allResponsibilitiesComplete: boolean
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
 * Live campaign summary from existing `buildCampaignExecutionSummary` only.
 * Connections card and Official Briefing both consume this object.
 */
export function buildOfficialCampaignSummary(ruknId: string): OfficialCampaignSummary {
  const execution = buildCampaignExecutionSummary(ruknId)
  const connectedKarkuns = execution.assigned
  const completedVisits = execution.visitCompleted
  const completedWeeklyIjtema = execution.ijtemaRecorded
  const completedMonthlyBaitulMaal = execution.baitulMaalCommitted
  const completedAppRegistration = execution.jihRegistered
  const pendingVisits = Math.max(0, connectedKarkuns - completedVisits)
  const pendingWeeklyIjtema = Math.max(0, connectedKarkuns - completedWeeklyIjtema)
  const pendingMonthlyBaitulMaal = Math.max(0, connectedKarkuns - completedMonthlyBaitulMaal)
  const pendingAppRegistration = Math.max(0, connectedKarkuns - completedAppRegistration)
  const completionPct =
    connectedKarkuns > 0
      ? Math.round((execution.completed / connectedKarkuns) * 100)
      : 0
  const overallStatus = ruknWorkspaceStatus(completionPct, connectedKarkuns)

  return {
    connectedKarkuns,
    completedVisits,
    pendingVisits,
    completedWeeklyIjtema,
    pendingWeeklyIjtema,
    completedMonthlyBaitulMaal,
    pendingMonthlyBaitulMaal,
    completedAppRegistration,
    pendingAppRegistration,
    lastCommunication: getRuknLastCommunicationLabel(ruknId) ?? '-',
    overallStatus,
    completionPct,
    allResponsibilitiesComplete:
      connectedKarkuns > 0 &&
      pendingVisits === 0 &&
      pendingWeeklyIjtema === 0 &&
      pendingMonthlyBaitulMaal === 0 &&
      pendingAppRegistration === 0,
  }
}

/** Presentation-only pending slice — identical numbers to Official Briefing. */
export function buildRuknWorkspacePending(ruknId: string): RuknWorkspacePending {
  const summary = buildOfficialCampaignSummary(ruknId)
  return {
    connectedKarkuns: summary.connectedKarkuns,
    pendingVisits: summary.pendingVisits,
    pendingWeeklyIjtema: summary.pendingWeeklyIjtema,
    pendingMonthlyBaitulMaal: summary.pendingMonthlyBaitulMaal,
    pendingAppRegistration: summary.pendingAppRegistration,
    completionPct: summary.completionPct,
  }
}

/**
 * Auto-select Official Briefing template id (legacy library path).
 * KC-0130 Communicate uses live Urdu generation instead.
 */
export function resolveOfficialBriefingTemplateId(ruknId: string): string {
  const summary = buildCampaignExecutionSummary(ruknId)
  // Same rule as shouldSuggestCampaignInitiation — no import (avoids cycle with OC engine).
  if (summary.assigned > 0 && summary.visitCompleted === 0 && summary.completed === 0) {
    return 'tpl-oc-campaign-initiation-pending'
  }
  const pct =
    summary.assigned > 0
      ? Math.round((summary.completed / summary.assigned) * 100)
      : 0
  if (pct >= 80) {
    return 'tpl-oc-appreciation'
  }
  return 'tpl-oc-weekly-encouragement'
}
