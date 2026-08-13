/**
 * Phase 7 — Rukn “what needs my action?” selector (TASK-055).
 * Derived from existing follow-ups, journey next actions, and in-force Responsibilities.
 * Does not duplicate Work (RuknWorkActionPanel) or occurrence notifications.
 */

import { ROUTES, ruknVisitPath } from '@/constants/routes'
import { buildTodaysFocusItems } from '@/lib/campaignExecutionMatrix'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { listInForceResponsibilities } from '@/lib/responsibility/tenure'
import { todayWorkCalendarDate } from '@/lib/work/ruknActionItems'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'

export type RuknNowActionSource = 'follow-up' | 'journey' | 'responsibility'

export type RuknNowAction = {
  id: string
  source: RuknNowActionSource
  title: string
  detail: string
  href: string
  actionLabel: string
}

export function buildRuknNowActions(
  ruknId: string,
  asOfDate = todayWorkCalendarDate(),
): RuknNowAction[] {
  const items: RuknNowAction[] = []
  const seenPeople = new Set<string>()

  for (const row of buildTodaysFocusItems(ruknId, 6)) {
    seenPeople.add(row.karkunId)
    items.push({
      id: `follow-up:${row.karkunId}`,
      source: 'follow-up',
      title: row.karkunName,
      detail: row.pendingLabel,
      href: row.route,
      actionLabel: 'Open',
    })
  }

  for (const guidance of getGuidanceForRuknKarkuns(ruknId)) {
    if (seenPeople.has(guidance.karkunId)) continue
    seenPeople.add(guidance.karkunId)
    items.push({
      id: `journey:${guidance.karkunId}`,
      source: 'journey',
      title: guidance.karkunName,
      detail: guidance.nextAction.label,
      href: guidance.nextAction.route || ruknVisitPath(guidance.karkunId),
      actionLabel: 'Act',
    })
  }

  const responsibilities = unwrapRepository(
    getRepositories().responsibility.listByRuknId(ruknId),
    [],
  )
  for (const row of listInForceResponsibilities(responsibilities, { asOfDate, ruknId })) {
    items.push({
      id: `responsibility:${row.id}`,
      source: 'responsibility',
      title: row.nature.trim() || 'Responsibility',
      detail: 'Active responsibility — act on related work on this page.',
      href: ROUTES.RUKN,
      actionLabel: 'Open work',
    })
  }

  return items.slice(0, 8)
}
