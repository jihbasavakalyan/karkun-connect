/**
 * v2 capability handlers — compose existing services through stack-ready results.
 */

import type { RafeeqRole, RafeeqTurnResult } from '../types'
import type { RafeeqSessionMemory } from '../session'
import { formatWhy } from './explainability'
import { buildProactiveItems, formatProactiveText } from './proactive'
import { buildDailyBriefing } from './briefing'
import {
  buildSmartWorkQueue,
  formatWorkQueueText,
  workQueueActions,
} from './workQueue'
import {
  buildPersonalDashboard,
  formatPersonalDashboardText,
} from './personalDashboard'
import {
  buildRecommendations,
  formatRecommendationsText,
} from './recommendations'
import {
  buildSmartNotifications,
  dismissNotification,
  formatNotificationsText,
  remindNotificationLater,
} from './notifications'
import { buildTimeline, formatTimelineText } from './timeline'
import {
  buildConversationHistory,
  formatHistoryText,
  pinConversation,
  recordConversationTurn,
} from './history'
import { buildSmartQuickActions } from './quickActions'
import {
  buildOperationalEntityCards,
  formatEntityCardsText,
} from './entityCards'
import { buildOperationalInsights, formatInsightsText } from './insights'
import { buildGuidedWorkflow } from './guidedWorkflow'
import { attachSuggestionsMetadata } from './contextualSuggestions'
import { memoizeCompose } from './performance'
import { RAFEEQ_A11Y } from './accessibility'
import { RAFEEQ_UX } from './uxPolish'
import { createVoiceReadySurface, VOICE_READY_NOTES } from './voiceReady'

function companion(text: string): string {
  const body = text.trim()
  if (/السلام علیکم/.test(body)) return body
  return `السلام علیکم\n\n${body}`
}

function baseResult(
  partial: Omit<RafeeqTurnResult, 'usedStack' | 'usedFallback' | 'readOnly'>,
): RafeeqTurnResult {
  return {
    ...partial,
    usedStack: true,
    usedFallback: false,
    readOnly: true,
  }
}

function withSuggestions(
  result: RafeeqTurnResult,
  role: RafeeqRole,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  return {
    ...result,
    metadata: attachSuggestionsMetadata(
      { ...result.metadata },
      role,
      memory,
      result.intentCode,
    ),
  }
}

export function handleProactive(
  layers: string[],
  role: RafeeqRole,
  ruknId: string | null,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('proactive')
  const items = memoizeCompose(`proactive:${role}:${ruknId ?? ''}`, () =>
    buildProactiveItems(role, ruknId),
  )
  const why = items.flatMap((i) => i.why).slice(0, 6)
  return withSuggestions(
    baseResult({
      text: companion(
        [formatProactiveText(items), '', formatWhy(why)].filter(Boolean).join('\n'),
      ),
      actions: items.filter((i) => i.action).map((i) => i.action!),
      intentCode: 'PROACTIVE',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'proactive',
        proactive: items,
        why,
        explainability: why,
        a11y: RAFEEQ_A11Y,
        ux: RAFEEQ_UX,
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handleDailyBriefing(
  layers: string[],
  role: RafeeqRole,
  ruknId: string | null,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('daily_briefing')
  const briefing = memoizeCompose(`briefing:${role}:${ruknId ?? ''}`, () =>
    buildDailyBriefing(role, ruknId),
  )
  return withSuggestions(
    baseResult({
      text: companion(briefing.text),
      actions: [...briefing.actions],
      intentCode: 'DAILY_BRIEFING',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'daily_briefing',
        briefing,
        why: briefing.why,
        explainability: briefing.why,
        summaryTitle: briefing.title,
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handleWorkQueue(
  layers: string[],
  role: RafeeqRole,
  ruknId: string | null,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('work_queue')
  const tasks = memoizeCompose(`wq:${role}:${ruknId ?? ''}`, () =>
    buildSmartWorkQueue(role, ruknId),
  )
  return withSuggestions(
    baseResult({
      text: companion(formatWorkQueueText(tasks)),
      actions: workQueueActions(tasks),
      intentCode: 'WORK_QUEUE',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'work_queue',
        workQueue: tasks,
        why: tasks.flatMap((t) => t.why).slice(0, 8),
        explainability: tasks.flatMap((t) => t.why).slice(0, 8),
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handlePersonalDashboard(
  layers: string[],
  role: RafeeqRole,
  ruknId: string | null,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('personal_dashboard')
  const snap = buildPersonalDashboard(role, ruknId)
  return withSuggestions(
    baseResult({
      text: companion(formatPersonalDashboardText(snap)),
      actions: [...snap.actions],
      intentCode: 'PERSONAL_DASHBOARD',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'personal_dashboard',
        dashboard: snap,
        why: snap.why,
        explainability: snap.why,
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handleRecommendations(
  layers: string[],
  role: RafeeqRole,
  ruknId: string | null,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('recommendations')
  const items = buildRecommendations(role, ruknId)
  return withSuggestions(
    baseResult({
      text: companion(
        [
          formatRecommendationsText(items),
          '',
          items[0] ? formatWhy(items[0].why) : '',
        ]
          .filter(Boolean)
          .join('\n'),
      ),
      actions: items.flatMap((i) => i.actions).slice(0, 8),
      intentCode: 'RECOMMENDATIONS',
      requiresConfirmation: false,
      confirmationState: null,
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'recommendations',
        recommendations: items,
        why: items.flatMap((i) => i.why).slice(0, 8),
        explainability: items.flatMap((i) => i.why).slice(0, 8),
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handleNotifications(
  layers: string[],
  role: RafeeqRole,
  ruknId: string | null,
  memory: RafeeqSessionMemory,
  sessionId: string,
  control?: { dismissId?: string; remindId?: string },
): RafeeqTurnResult {
  layers.push('notifications')
  if (control?.dismissId) dismissNotification(sessionId, control.dismissId)
  if (control?.remindId) remindNotificationLater(sessionId, control.remindId)
  const items = buildSmartNotifications(role, ruknId, sessionId)
  const actions = items.flatMap((n) => {
    const list = []
    if (n.openRoute) {
      list.push({
        id: `n-open-${n.id}`,
        label: 'Open',
        route: n.openRoute,
      })
    }
    list.push({
      id: `n-dismiss-${n.id}`,
      label: 'Dismiss',
      route: `?rafeeqNotify=dismiss&id=${encodeURIComponent(n.id)}`,
      confirmRole: 'cancel' as const,
    })
    list.push({
      id: `n-later-${n.id}`,
      label: n.remindLaterLabel ?? 'Remind later',
      route: `?rafeeqNotify=later&id=${encodeURIComponent(n.id)}`,
      confirmRole: 'followup' as const,
    })
    return list
  })
  return withSuggestions(
    baseResult({
      text: companion(formatNotificationsText(items)),
      actions,
      intentCode: 'NOTIFICATIONS',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'notifications',
        notifications: items,
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handleTimeline(
  layers: string[],
  role: RafeeqRole,
  ruknId: string | null,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('timeline')
  const entries = buildTimeline(ruknId)
  return withSuggestions(
    baseResult({
      text: companion(formatTimelineText(entries)),
      actions: buildSmartQuickActions(role, memory).slice(0, 4),
      intentCode: 'TIMELINE',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: { kind: 'timeline', timeline: entries, noFirestoreWrite: true },
    }),
    role,
    memory,
  )
}

export function handleHistory(
  layers: string[],
  role: RafeeqRole,
  memory: RafeeqSessionMemory,
  pinLabel?: string | null,
): RafeeqTurnResult {
  layers.push('conversation_history')
  if (pinLabel) pinConversation(memory, pinLabel)
  recordConversationTurn(memory, memory.lastUtterance ?? 'history')
  const snap = buildConversationHistory(memory)
  return withSuggestions(
    baseResult({
      text: companion(formatHistoryText(snap)),
      actions: [...snap.recentActions].slice(0, 6),
      intentCode: 'HISTORY',
      requiresConfirmation: false,
      confirmationState: null,
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'history',
        history: snap,
        ephemeralOnly: true,
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handleEntityCards(
  layers: string[],
  role: RafeeqRole,
  ruknId: string | null,
  memory: RafeeqSessionMemory,
  subject: string | null,
): RafeeqTurnResult {
  layers.push('entity_cards')
  const cards = buildOperationalEntityCards(role, ruknId, subject)
  return withSuggestions(
    baseResult({
      text: companion(formatEntityCardsText(cards)),
      actions: cards.flatMap((c) => c.actions).slice(0, 10),
      intentCode: 'ENTITY_CARDS',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'entity_cards',
        entityCards: cards,
        why: cards.flatMap((c) => c.why).slice(0, 8),
        explainability: cards.flatMap((c) => c.why).slice(0, 8),
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handleOperationalInsights(
  layers: string[],
  role: RafeeqRole,
  ruknId: string | null,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('operational_insights')
  const items = buildOperationalInsights(ruknId)
  return withSuggestions(
    baseResult({
      text: companion(formatInsightsText(items)),
      actions: buildSmartQuickActions(role, memory).slice(0, 4),
      intentCode: 'OPERATIONAL_INSIGHTS',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'operational_insights',
        insights: items.map((i) => i.text),
        insightItems: items,
        why: items.flatMap((i) => i.why),
        explainability: items.flatMap((i) => i.why),
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handleGuidedWorkflow(
  layers: string[],
  role: RafeeqRole,
  memory: RafeeqSessionMemory,
  subject: string | null,
): RafeeqTurnResult {
  layers.push('guided_workflow')
  const flow = buildGuidedWorkflow(role, memory, subject)
  return withSuggestions(
    baseResult({
      text: companion(flow.text),
      actions: [...flow.actions],
      intentCode: 'GUIDED_WORKFLOW',
      requiresConfirmation: false,
      confirmationState: null,
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'guided_workflow',
        steps: flow.steps,
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handleExplainWhy(
  layers: string[],
  role: RafeeqRole,
  ruknId: string | null,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('explainability')
  const tasks = buildSmartWorkQueue(role, ruknId)
  const top = tasks[0]
  const why = top?.why ?? [
    {
      id: 'fallback',
      label: 'No prioritized task — campaign metrics available for briefing',
      sourceField: 'workQueue',
    },
  ]
  const person = memory.lastPersonName
  const text = top
    ? [
        person ? `${person} / ${top.title}` : top.title,
        formatWhy(why),
        '',
        `کام: ${top.reason}`,
      ].join('\n')
    : formatWhy(why)

  return withSuggestions(
    baseResult({
      text: companion(text),
      actions: top
        ? [
            {
              id: 'why-open',
              label: 'Open',
              route: top.openRoute,
            },
          ]
        : [],
      intentCode: 'EXPLAINABILITY',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'explainability',
        why,
        explainability: why,
        noHiddenScoring: true,
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}

export function handleVoiceReadyStatus(
  layers: string[],
  role: RafeeqRole,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('voice_ready')
  const surface = createVoiceReadySurface()
  return withSuggestions(
    baseResult({
      text: companion(
        [
          'صوتی تیاری (انٹرفیس):',
          `• TTS reuse: ${VOICE_READY_NOTES.tts}`,
          `• STT: ${VOICE_READY_NOTES.stt}`,
          `• Barge-in: ${VOICE_READY_NOTES.bargeIn}`,
          `• supportsTts (wired by UI): ${surface.supportsTts}`,
        ].join('\n'),
      ),
      actions: [],
      intentCode: 'VOICE_READY',
      requiresConfirmation: false,
      confirmationState: null,
      layersVisited: Object.freeze([...layers]),
      metadata: {
        kind: 'voice_ready',
        voiceReady: surface,
        notes: VOICE_READY_NOTES,
        noFirestoreWrite: true,
      },
    }),
    role,
    memory,
  )
}
