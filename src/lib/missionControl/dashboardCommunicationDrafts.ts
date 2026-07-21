/**
 * KC-0071.3 — Dashboard communication drafts & badges (presentation only).
 * Reuses existing Communication module; does not send by itself.
 */

import { getRuknById } from '@/data/ruknMaster'
import type { MessageRecipient } from '@/types/communication'

export type DashboardPerformanceBadge = {
  label: string
  tone: 'green' | 'amber' | 'orange' | 'red' | 'neutral'
  icon: string
}

/** Presentation-only badge mapping — does not change progress calculations. */
export function dashboardPerformanceBadge(
  completionPct: number,
  assignedKarkuns: number,
): DashboardPerformanceBadge {
  if (assignedKarkuns <= 0) {
    return { label: 'No Activity', tone: 'neutral', icon: '•' }
  }
  if (completionPct >= 80) {
    return { label: 'Excellent', tone: 'green', icon: '🟢' }
  }
  if (completionPct >= 60) {
    return { label: 'On Track', tone: 'green', icon: '🟢' }
  }
  if (completionPct >= 40) {
    return { label: 'Needs Attention', tone: 'amber', icon: '🟡' }
  }
  if (completionPct >= 20) {
    return { label: 'Behind Schedule', tone: 'orange', icon: '🟠' }
  }
  return { label: 'Immediate Action', tone: 'red', icon: '🔴' }
}

export function shouldOfferAppreciate(completionPct: number, assignedKarkuns: number): boolean {
  return assignedKarkuns > 0 && completionPct >= 60
}

export function shouldOfferReminder(completionPct: number, assignedKarkuns: number): boolean {
  return assignedKarkuns > 0 && completionPct < 40
}

export function buildAppreciationDraft(ruknName: string): string {
  return `Assalamu Alaikum ${ruknName}.

JazakAllahu Khair for your sincere efforts. Your consistent work is strengthening our campaign. May Allah accept your efforts and grant you steadfastness.`
}

export function buildReminderDraft(ruknName: string): string {
  return `Assalamu Alaikum ${ruknName}.

Today's activity is below the expected progress. Kindly update your visits and continue the campaign work. May Allah grant barakah in your efforts.`
}

export function buildRuknMessageRecipient(ruknId: string): MessageRecipient | null {
  const rukn = getRuknById(ruknId)
  if (!rukn || !rukn.mobile.trim()) return null
  return {
    personId: rukn.id,
    personKind: 'rukn',
    name: rukn.name,
    mobile: rukn.mobile,
    whatsapp: rukn.whatsapp,
  }
}

export function buildRuknMessageRecipients(ruknIds: string[]): MessageRecipient[] {
  return ruknIds
    .map((id) => buildRuknMessageRecipient(id))
    .filter((item): item is MessageRecipient => Boolean(item))
}
