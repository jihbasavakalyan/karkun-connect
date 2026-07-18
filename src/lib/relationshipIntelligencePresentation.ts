/**
 * Relationship intelligence — presentation helpers (KC-012).
 * Derived from existing guidance / health / journey data. No engine or store changes.
 */

import { getGuidanceForRuknKarkuns, getKarkunGuidance } from '@/lib/guidance/guidanceEngine'
import { getRuknJourneyStageLabel } from '@/lib/ruknProgressPresentation'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { ruknMaster } from '@/data/ruknMaster'
import { getActiveAssignmentsForRukn } from '@/stores/assignmentStore'
import type {
  JourneyStageId,
  KarkunGuidance,
  RelationshipHealth,
  RelationshipHealthLevel,
} from '@/types/guidance'
import { JOURNEY_STAGE_LABELS, JOURNEY_STAGE_ORDER } from '@/types/guidance'
import { adminRuknDetailPath, ruknVisitPath } from '@/constants/routes'

/** Spec-facing labels — human, meaningful, no formula exposure. */
export type RelationshipHealthDisplayLabel =
  | 'Excellent'
  | 'Good'
  | 'Needs Attention'
  | 'Urgent Follow-up'

export type SmartFollowUpRecommendation = {
  id: string
  text: string
  tone: 'encourage' | 'gently-urgent'
}

export type PriorityMissionItem = {
  id: string
  karkunId: string
  karkunName: string
  title: string
  why: string
  recommendation: string
  healthLabel: RelationshipHealthDisplayLabel
  healthLevel: RelationshipHealthLevel
  route: string
  stageLabel: string
}

export type ConnectedIntelligenceView = {
  stageLabel: string
  healthLabel: RelationshipHealthDisplayLabel
  health: RelationshipHealth
  recentActivity: string | null
  previousVisitSummary: string | null
  nextReminder: string | null
  /** Latest activity lines for compact Connected cards (max 3). */
  recentActivityItems: string[]
  lastContactLabel: string | null
}

export type AdminRelationshipInsights = {
  overdueFollowUpRukns: { ruknId: string; ruknName: string; count: number; route: string }[]
  averageHealthLabel: RelationshipHealthDisplayLabel
  healthDistribution: { label: RelationshipHealthDisplayLabel; count: number }[]
  journeyDistribution: { stageId: JourneyStageId; label: string; count: number }[]
  supportAreas: string[]
  totalConnected: number
  needingAttention: number
}

const LEVEL_WEIGHT: Record<RelationshipHealthLevel, number> = {
  dormant: 0,
  urgent: 1,
  'needs-attention': 2,
  healthy: 3,
}

export function getRelationshipHealthDisplayLabel(
  health: RelationshipHealth,
  stageId?: JourneyStageId,
): RelationshipHealthDisplayLabel {
  if (health.level === 'dormant' || health.level === 'urgent') {
    return 'Urgent Follow-up'
  }
  if (health.level === 'needs-attention') {
    return 'Needs Attention'
  }
  if (stageId === 'connected' || stageId === 'first-meeting' || stageId === 'jih-registration') {
    return 'Good'
  }
  return 'Excellent'
}

export function buildSmartFollowUpRecommendation(
  guidance: KarkunGuidance,
): SmartFollowUpRecommendation {
  const name = guidance.karkunName
  const reason = guidance.health.reasons[0] ?? ''
  const gapMatch = reason.match(/No contact for (\d+) days/i)
  const gapDays = gapMatch ? Number(gapMatch[1]) : null
  const stage = guidance.currentStage
  const action = guidance.nextAction.kind

  if (gapDays !== null && gapDays >= 14) {
    return {
      id: `${guidance.karkunId}-gap`,
      tone: gapDays >= 21 ? 'gently-urgent' : 'encourage',
      text:
        gapDays >= 21
          ? `Last interaction was ${gapDays} days ago. A warm reconnect this week would strengthen the relationship.`
          : `Last interaction was ${gapDays} days ago. A short visit is recommended this week.`,
    }
  }

  if (stage === 'first-meeting' || action === 'invite-ijtema') {
    return {
      id: `${guidance.karkunId}-ijtema`,
      tone: 'encourage',
      text: `First meetings are underway with ${name}. Consider inviting them to the next Ijtema.`,
    }
  }

  if (stage === 'jih-registration' || action === 'help-jih-registration') {
    return {
      id: `${guidance.karkunId}-jih`,
      tone: 'encourage',
      text: `A visit has opened the door. Helping ${name} with JIH registration is a natural next step.`,
    }
  }

  if (stage === 'development' || stage === 'regular-contact') {
    return {
      id: `${guidance.karkunId}-deeper`,
      tone: 'encourage',
      text: `Multiple visits completed with ${name}. This may be an appropriate time for a deeper personal discussion.`,
    }
  }

  if (action === 'honor-commitment') {
    return {
      id: `${guidance.karkunId}-commitment`,
      tone: 'gently-urgent',
      text: `There is an agreed next step with ${name}. Honouring it will deepen trust.`,
    }
  }

  if (action === 'complete-visit-notes') {
    return {
      id: `${guidance.karkunId}-notes`,
      tone: 'encourage',
      text: `A recent visit with ${name} deserves a short note so the relationship continues smoothly.`,
    }
  }

  if (action === 'call-today') {
    return {
      id: `${guidance.karkunId}-call`,
      tone: 'encourage',
      text: `A brief call with ${name} today can keep the relationship warm.`,
    }
  }

  return {
    id: `${guidance.karkunId}-default`,
    tone: 'encourage',
    text: `Stay close to ${name} — a thoughtful follow-up keeps the journey moving forward.`,
  }
}

export function buildPriorityWhy(guidance: KarkunGuidance): string {
  const reason = guidance.health.reasons[0] ?? ''
  const gapMatch = reason.match(/No contact for (\d+) days/i)
  if (gapMatch) {
    return `No interaction for ${gapMatch[1]} days.`
  }
  if (/overdue commitment/i.test(reason)) {
    return 'Agreed next step is overdue.'
  }
  if (/commitment due today/i.test(reason)) {
    return 'Commitment due today.'
  }
  if (/JIH/i.test(reason) || guidance.nextAction.kind === 'help-jih-registration') {
    return 'Registration follow-up pending.'
  }
  if (guidance.nextAction.kind === 'invite-ijtema') {
    return 'Ijtema invitation recommended.'
  }
  if (guidance.nextAction.kind === 'visit-this-week' || guidance.nextAction.kind === 'arrange-meeting') {
    return guidance.currentStage === 'connected' || guidance.currentStage === 'first-meeting'
      ? 'First follow-up pending.'
      : 'Recent visit requires continuation.'
  }
  if (guidance.nextAction.kind === 'complete-visit-notes') {
    return 'Recent visit requires continuation.'
  }
  if (guidance.nextAction.kind === 'reconnect') {
    return 'Relationship needs a warm reconnect.'
  }
  if (guidance.reminders[0]) {
    return guidance.reminders[0].title
  }
  return 'Meaningful contact will strengthen this relationship.'
}

export function buildDailyPriorityMission(ruknId: string, limit = 6): PriorityMissionItem[] {
  const sorted = sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))

  return sorted.slice(0, limit).map((guidance) => {
    const recommendation = buildSmartFollowUpRecommendation(guidance)
    return {
      id: guidance.karkunId,
      karkunId: guidance.karkunId,
      karkunName: guidance.karkunName,
      title: guidance.karkunName,
      why: buildPriorityWhy(guidance),
      recommendation: recommendation.text,
      healthLabel: getRelationshipHealthDisplayLabel(guidance.health, guidance.currentStage),
      healthLevel: guidance.health.level,
      route: guidance.nextAction.route || ruknVisitPath(guidance.karkunId),
      stageLabel: getRuknJourneyStageLabel(guidance.currentStage),
    }
  })
}

export function buildConnectedIntelligenceView(
  karkunId: string,
  ruknId: string,
): ConnectedIntelligenceView | null {
  const guidance = getKarkunGuidance(karkunId, ruknId)
  if (!guidance) return null

  const recent = guidance.timeline[0]
  const reminder = guidance.reminders[0]
  const recentActivityItems = guidance.timeline.slice(0, 3).map((entry) =>
    entry.description ? `${entry.title} — ${entry.description}` : entry.title,
  )

  return {
    stageLabel: getRuknJourneyStageLabel(guidance.currentStage),
    healthLabel: getRelationshipHealthDisplayLabel(guidance.health, guidance.currentStage),
    health: guidance.health,
    recentActivity: recent
      ? `${recent.title}${recent.description ? ` — ${recent.description}` : ''}`
      : null,
    previousVisitSummary: recent?.source === 'visit' ? recent.title : recent?.title ?? null,
    nextReminder: reminder ? `${reminder.title}: ${reminder.message}` : null,
    recentActivityItems,
    lastContactLabel: recent?.title ?? null,
  }
}

function displayLabelFromLevel(
  level: RelationshipHealthLevel,
): RelationshipHealthDisplayLabel {
  if (level === 'healthy') return 'Excellent'
  if (level === 'needs-attention') return 'Needs Attention'
  return 'Urgent Follow-up'
}

export function buildAdminRelationshipInsights(): AdminRelationshipInsights {
  const overdueFollowUpRukns: AdminRelationshipInsights['overdueFollowUpRukns'] = []
  const levelCounts: Record<RelationshipHealthLevel, number> = {
    healthy: 0,
    'needs-attention': 0,
    urgent: 0,
    dormant: 0,
  }
  const stageCounts = new Map<JourneyStageId, number>()
  let totalConnected = 0
  let weightedHealth = 0

  for (const rukn of ruknMaster) {
    if (rukn.status !== 'active') continue
    const assignments = getActiveAssignmentsForRukn(rukn.id)
    if (assignments.length === 0) continue

    const guidanceList = getGuidanceForRuknKarkuns(rukn.id)
    totalConnected += guidanceList.length

    let ruknAttention = 0
    for (const guidance of guidanceList) {
      levelCounts[guidance.health.level] += 1
      weightedHealth += LEVEL_WEIGHT[guidance.health.level]
      stageCounts.set(
        guidance.currentStage,
        (stageCounts.get(guidance.currentStage) ?? 0) + 1,
      )
      if (
        guidance.health.level === 'urgent' ||
        guidance.health.level === 'dormant' ||
        guidance.health.level === 'needs-attention'
      ) {
        ruknAttention += 1
      }
    }

    if (ruknAttention > 0) {
      overdueFollowUpRukns.push({
        ruknId: rukn.id,
        ruknName: rukn.name,
        count: ruknAttention,
        route: adminRuknDetailPath(rukn.id),
      })
    }
  }

  overdueFollowUpRukns.sort((a, b) => b.count - a.count)

  const averageWeight =
    totalConnected > 0 ? weightedHealth / totalConnected : LEVEL_WEIGHT.healthy
  const averageLevel: RelationshipHealthLevel =
    averageWeight >= 2.5
      ? 'healthy'
      : averageWeight >= 1.5
        ? 'needs-attention'
        : averageWeight >= 0.75
          ? 'urgent'
          : 'dormant'

  const healthDistribution: AdminRelationshipInsights['healthDistribution'] = [
    { label: 'Excellent', count: levelCounts.healthy },
    {
      label: 'Needs Attention',
      count: levelCounts['needs-attention'],
    },
    {
      label: 'Urgent Follow-up',
      count: levelCounts.urgent + levelCounts.dormant,
    },
  ]

  const journeyDistribution = JOURNEY_STAGE_ORDER.map((stageId) => ({
    stageId,
    label: JOURNEY_STAGE_LABELS[stageId],
    count: stageCounts.get(stageId) ?? 0,
  })).filter((item) => item.count > 0)

  const supportAreas: string[] = []
  if (levelCounts.dormant + levelCounts.urgent > 0) {
    supportAreas.push('Several connections need urgent follow-up support.')
  }
  if (levelCounts['needs-attention'] > 0) {
    supportAreas.push('Some relationships need gentle attention this week.')
  }
  const jihPending = stageCounts.get('jih-registration') ?? 0
  if (jihPending > 0) {
    supportAreas.push('JIH registration remains a common next step across the campaign.')
  }
  if (supportAreas.length === 0) {
    supportAreas.push('Campaign relationships are generally on a healthy footing.')
  }

  return {
    overdueFollowUpRukns: overdueFollowUpRukns.slice(0, 6),
    averageHealthLabel: displayLabelFromLevel(averageLevel),
    healthDistribution,
    journeyDistribution,
    supportAreas,
    totalConnected,
    needingAttention:
      levelCounts['needs-attention'] + levelCounts.urgent + levelCounts.dormant,
  }
}

/** Urdu companion lines for Digital Rafeeq (supportive, never commanding). */
export function buildRafeeqPriorityWhyUrdu(guidance: KarkunGuidance): string {
  const why = buildPriorityWhy(guidance)
  const name = guidance.karkunName

  if (/No interaction for (\d+) days/.test(why)) {
    const days = why.match(/(\d+)/)?.[1]
    return `مناسب ہوگا کہ اس ہفتے ${name} صاحب سے دوبارہ ملاقات کی جائے — ${days} دن سے رابطہ نہیں ہوا۔`
  }
  if (/First follow-up/.test(why)) {
    return `اب ${name} صاحب سے اگلے رابطے کا وقت موزوں ہے۔`
  }
  if (/Ijtema invitation/.test(why)) {
    return `اگر مناسب سمجھیں تو ${name} صاحب کو اگلے اجتماع کی دعوت دینا مفید ہو سکتا ہے۔`
  }
  if (/Registration follow-up/.test(why)) {
    return `${name} صاحب کی رجسٹریشن میں مدد آج کا نرم اور مفید قدم ہو سکتا ہے۔`
  }
  if (/Recent visit requires continuation/.test(why)) {
    return `${name} صاحب سے گزشتہ ملاقات کے بعد آئندہ رابطہ تعلق کو مزید مضبوط بنا سکتا ہے۔`
  }
  if (/overdue|Commitment due/i.test(why)) {
    return `${name} صاحب سے طے شدہ وعدہ پورا کرنا اعتماد بڑھائے گا۔`
  }
  return `اب ${name} صاحب سے ایک مختصر ملاقات مفید ہوگی۔`
}
