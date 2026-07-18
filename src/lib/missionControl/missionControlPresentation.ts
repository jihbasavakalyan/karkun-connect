/**
 * KC-012.1 — Home Mission Control presentation helpers.
 * Derives campaign task + development snapshots from existing services only.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getConnectedKarkunIdsForRukn } from '@/lib/connections/getConnectedKarkunsForRukn'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { isJihRegistered } from '@/lib/guidance/journeyEngine'
import { getRuknBaitulMaalMetrics } from '@/services/baitulMaalService'
import { getDevelopmentAssessment } from '@/stores/developmentAssessmentStore'
import type { RuknMissionControlModel } from './buildRuknMissionControl'

export type CampaignTaskBadge = {
  id: string
  label: string
  current: number
  target: number
}

export type DevelopmentSummaryItem = {
  id: string
  label: string
  current: number
  target: number | null
}

export function buildCampaignTaskBadges(
  ruknId: string,
  model: RuknMissionControlModel,
): CampaignTaskBadge[] {
  const connectedIds = getConnectedKarkunIdsForRukn(ruknId)
  const target = Math.max(connectedIds.length, 1)

  const ijtemaPresent = model.attendanceStrip.present
  const baitul = getRuknBaitulMaalMetrics(connectedIds)

  let jihRegistered = 0
  let literature = 0
  let training = 0

  for (const karkunId of connectedIds) {
    const karkun = getKarkunById(karkunId)
    if (karkun && isJihRegistered(karkun)) {
      jihRegistered += 1
    }
    const assessment = getDevelopmentAssessment(karkunId)
    if (assessment?.indicators.islamic_literature) {
      literature += 1
    }
    if (
      assessment?.indicators.quran_study ||
      assessment?.indicators.hadith_study ||
      assessment?.indicators.personal_growth
    ) {
      training += 1
    }
  }

  return [
    { id: 'ijtema', label: 'Ijtema', current: ijtemaPresent, target },
    {
      id: 'baitul-maal',
      label: 'Bait-ul-Mal',
      current: baitul.paid,
      target,
    },
    { id: 'jih-app', label: 'JIH App', current: jihRegistered, target },
    { id: 'literature', label: 'Literature', current: literature, target },
    { id: 'training', label: 'Training', current: training, target },
  ]
}

export function buildDevelopmentSummary(
  ruknId: string,
  model: RuknMissionControlModel,
): DevelopmentSummaryItem[] {
  const connectedIds = getConnectedKarkunIdsForRukn(ruknId)
  const target = connectedIds.length
  const guidance = getGuidanceForRuknKarkuns(ruknId)

  let regularContact = 0
  let active = 0
  let needsAttention = 0

  for (const item of guidance) {
    if (
      item.currentStage === 'regular-contact' ||
      item.currentStage === 'participation' ||
      item.currentStage === 'development'
    ) {
      regularContact += 1
    }
    if (item.health.level === 'healthy') {
      active += 1
    }
    if (
      item.health.level === 'needs-attention' ||
      item.health.level === 'urgent' ||
      item.health.level === 'dormant'
    ) {
      needsAttention += 1
    }
  }

  const ijtemaPresent = model.attendanceStrip.present
  const baitul = getRuknBaitulMaalMetrics(connectedIds)

  let jihRegistered = 0
  for (const karkunId of connectedIds) {
    const karkun = getKarkunById(karkunId)
    if (karkun && isJihRegistered(karkun)) {
      jihRegistered += 1
    }
  }

  return [
    { id: 'connected', label: 'Connected', current: target, target: null },
    {
      id: 'regular-contact',
      label: 'Regular Contact',
      current: regularContact,
      target: target || null,
    },
    {
      id: 'weekly-ijtema',
      label: 'Weekly Ijtema',
      current: ijtemaPresent,
      target: target || null,
    },
    {
      id: 'baitul-contributors',
      label: 'Bait-ul-Mal Contributors',
      current: baitul.paid,
      target: target || null,
    },
    {
      id: 'jih-registered',
      label: 'JIH Registered',
      current: jihRegistered,
      target: target || null,
    },
    {
      id: 'active',
      label: 'Active Karkuns',
      current: active,
      target: target || null,
    },
    {
      id: 'needs-attention',
      label: 'Needs Attention',
      current: needsAttention,
      target: null,
    },
  ]
}

/** Enrich priority list with today's scheduled visit notes (avoids a second queue). */
export function buildPriorityScheduleNotes(
  model: RuknMissionControlModel,
): Map<string, string> {
  const notes = new Map<string, string>()
  for (const visit of model.todaysVisits) {
    const match = visit.route.match(/\/visit\/([^/?#]+)/)
    const karkunId = match?.[1]
    if (!karkunId) continue
    const label = visit.subtitle?.trim() || 'Scheduled today'
    if (!notes.has(karkunId)) {
      notes.set(karkunId, label)
    }
  }
  return notes
}

/** Scheduled visits not already represented in the priority list. */
export function buildOrphanVisitQueueItems(
  model: RuknMissionControlModel,
  priorityKarkunIds: readonly string[],
): RuknMissionControlModel['todaysVisits'] {
  const prioritySet = new Set(priorityKarkunIds)
  return model.todaysVisits.filter((visit) => {
    const match = visit.route.match(/\/visit\/([^/?#]+)/)
    const karkunId = match?.[1]
    if (!karkunId) return true
    return !prioritySet.has(karkunId)
  })
}
