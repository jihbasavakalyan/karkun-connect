/**
 * MVP capability handlers — existing services only.
 */

import { ROUTES, adminAssignmentsPath, adminExecutionPath, ruknVisitPath } from '@/constants/routes'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import {
  buildOfficialCampaignSummary,
  type OfficialCampaignSummary,
} from '@/lib/ruknWorkspacePresentation'
import { buildContextualRafeeqGuidance } from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'
import { searchPeopleReadOnly } from './adapters/searchAdapter'
import { resolveNavigationTarget } from './navigationMap'
import { getTurnMetricsBundle } from './turnMetricsCache'
import {
  buildCampaignIntelligence,
  formatCampaignIntelligenceText,
  type CampaignIntelTopic,
} from './campaignIntelligence'
import {
  buildPersonSecretaryFacts,
  formatPersonSecretaryReport,
  formatSecretarySections,
  isPersonRemainingFollowUp,
  type SecretaryFocus,
} from './secretaryIntelligence'
import { buildSmartWorkQueue } from './v2/workQueue'
import type { WorkQueueTask } from './v2/types'
import type { RafeeqAction, RafeeqRole, RafeeqTurnResult } from './types'
import type { RafeeqSessionMemory } from './session'

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

export function handleHelp(layers: string[]): RafeeqTurnResult {
  layers.push('help')
  return baseResult({
    text: companion(
      [
        'ڈیجیٹل رفیق کمانڈز:',
        '• تلاش: Find Aslam / Show Imran',
        '• نیویگیشن: Open Dashboard / Open Registry / Open Settings',
        '• بصیرت: How is the campaign progressing? / How many connected?',
        '• رابطہ: Call … / WhatsApp …',
        '• مدد: How do I assign?',
      ].join('\n'),
    ),
    actions: [
      { id: 'help-dashboard', label: 'ڈیش بورڈ', route: ROUTES.ADMIN },
      { id: 'help-settings', label: 'ترتیبات', route: ROUTES.ADMIN_SETTINGS },
    ],
    intentCode: 'HELP',
    requiresConfirmation: false,
    confirmationState: null,
    layersVisited: Object.freeze([...layers]),
    metadata: { kind: 'help' },
  })
}

export function handleInsights(
  layers: string[],
  role: RafeeqRole,
  memory: RafeeqSessionMemory,
  topic: string | null = 'overview',
  ruknId: string | null = null,
): RafeeqTurnResult {
  layers.push('campaign_intelligence')
  layers.push('secretary_intelligence')
  const payload = buildCampaignIntelligence({
    topic: (topic as CampaignIntelTopic | null) ?? 'overview',
    role,
    ruknId,
    memory,
  })
  return baseResult({
    text: companion(formatCampaignIntelligenceText(payload)),
    actions: [...payload.actions],
    intentCode: 'REPORT',
    requiresConfirmation: false,
    confirmationState: 'AUTO_APPROVED',
    layersVisited: Object.freeze([...layers]),
    metadata: {
      campaignIntelligence: payload,
      secretaryIntelligence: true,
      metrics: payload.metrics,
      insights: payload.insights,
      summaryTitle: payload.title,
      sources: payload.sources,
      topic: payload.topic,
      noFirestoreWrite: true,
    },
  })
}

export function handleTasks(layers: string[], role: RafeeqRole): RafeeqTurnResult {
  layers.push('tasks')
  const bundle = getTurnMetricsBundle()
  const pending = bundle.pendingCount
  const people = bundle.people
  const metrics = bundle.campaign

  const lines = [
    'آج کی ترجیحات:',
    `1. منظوری کی منتظر درخواستیں: ${pending}`,
    `2. غیر منسلک کارکنان: ${people.unassignedKarkuns}`,
    `3. مہم پیش رفت: ${metrics.progressPct}% (${metrics.connected}/${metrics.total})`,
  ]

  return baseResult({
    text: companion(lines.join('\n')),
    actions:
      role === 'administrator'
        ? [
            {
              id: 'task-pending',
              label: 'درخواستیں',
              route: ROUTES.ADMIN_INBOX,
            },
            { id: 'task-assign', label: 'روابط', route: adminAssignmentsPath() },
            { id: 'task-exec', label: 'عملدرآمد', route: adminExecutionPath() },
          ]
        : [
            { id: 'task-my', label: 'میرے کارکنان', route: ROUTES.RUKN_MY_KARKUN },
            { id: 'task-avail', label: 'دستیاب', route: ROUTES.RUKN_AVAILABLE_KARKUN },
          ],
    intentCode: 'FOLLOW_UP',
    requiresConfirmation: false,
    confirmationState: 'AUTO_APPROVED',
    layersVisited: Object.freeze([...layers]),
    metadata: { pending, unassigned: people.unassignedKarkuns },
  })
}

export function handleSuggestions(layers: string[], role: RafeeqRole): RafeeqTurnResult {
  layers.push('suggestions')
  const bundle = getTurnMetricsBundle()
  const people = bundle.people
  const pending = bundle.pendingCount
  const metrics = bundle.campaign

  return baseResult({
    text: companion(
      [
        'تجاویز (خودکار عمل نہیں):',
        `• رابطہ کے امیدوار: ${people.unassignedKarkuns} غیر منسلک`,
        `• رکاوٹ: پیش رفت ${metrics.progressPct}% — روابط پر توجہ`,
        pending > 0
          ? `• ${pending} درخواست(یں) منظوری کی منتظر`
          : '• کوئی منظوری کی منتظر درخواست نہیں',
        '• اجتماع کی یاددہانی: ہفتہ وار حاضری چیک کریں',
      ].join('\n'),
    ),
    actions:
      role === 'administrator'
        ? [
            { id: 'sug-assign', label: 'روابط', route: adminAssignmentsPath() },
            { id: 'sug-ijtema', label: 'اجتما', route: ROUTES.ADMIN_WEEKLY_IJTEMA },
          ]
        : [
            { id: 'sug-my', label: 'میرے کارکنان', route: ROUTES.RUKN_MY_KARKUN },
            { id: 'sug-ijtema', label: 'اجتما', route: ROUTES.RUKN_WEEKLY_IJTEMA },
          ],
    intentCode: 'FOLLOW_UP',
    requiresConfirmation: false,
    confirmationState: null,
    layersVisited: Object.freeze([...layers]),
    metadata: { suggestionsOnly: true },
  })
}

const STATUS_LABEL_URDU: Record<
  OfficialCampaignSummary['overallStatus']['label'],
  string
> = {
  'On Track': 'صحیح سمت',
  'Needs Attention': 'توجہ درکار',
  'Immediate Action': 'فوری عمل',
}

function workQueueTitleUrdu(task: WorkQueueTask): string {
  const map: Array<[RegExp, string]> = [
    [/pending visits|overdue/i, 'باقی / تاخیر شدہ ملاقاتیں'],
    [/follow-?ups?/i, 'فالو اپ'],
    [/weekly ijtema|ijtema/i, 'ہفتہ وار اجتماع'],
    [/registration/i, 'رجسٹریشن باقی'],
    [/baitul.?maal/i, 'بیت المال'],
    [/campaign/i, 'باقی مہم کے کام'],
  ]
  for (const [pattern, urdu] of map) {
    if (pattern.test(task.title) || pattern.test(task.context)) return urdu
  }
  return task.title
    .replace(/\bPending\b/gi, 'باقی')
    .replace(/\bOverdue\b/gi, 'تاخیر شدہ')
    .replace(/\bRecommendation\b/gi, 'تجویز')
    .replace(/\bRisk\b/gi, 'خطرہ')
    .replace(/\bStatus\b/gi, 'صورتِ حال')
}

function formatSelfReportSections(summary: OfficialCampaignSummary, advice: string): string {
  const statusUrdu = STATUS_LABEL_URDU[summary.overallStatus.label]
  const progress: string[] = []
  if (summary.completedVisits > 0) {
    progress.push(`${summary.completedVisits} ملاقاتیں مکمل`)
  }
  if (summary.completedWeeklyIjtema > 0) {
    progress.push(`${summary.completedWeeklyIjtema} ہفتہ وار اجتماع درج`)
  }
  if (summary.completedAppRegistration > 0) {
    progress.push(`${summary.completedAppRegistration} JIH App رجسٹریشن`)
  }
  if (summary.completedMonthlyBaitulMaal > 0) {
    progress.push(`${summary.completedMonthlyBaitulMaal} بیت المال`)
  }

  const remaining: string[] = []
  if (summary.pendingVisits > 0) remaining.push(`${summary.pendingVisits} ملاقاتیں باقی`)
  if (summary.pendingWeeklyIjtema > 0) {
    remaining.push(`${summary.pendingWeeklyIjtema} اجتماع باقی`)
  }
  if (summary.pendingAppRegistration > 0) {
    remaining.push(`${summary.pendingAppRegistration} رجسٹریشن باقی`)
  }
  if (summary.pendingMonthlyBaitulMaal > 0) {
    remaining.push(`${summary.pendingMonthlyBaitulMaal} بیت المال باقی`)
  }

  const attention: string[] = []
  if (summary.connectedKarkuns <= 0) {
    attention.push('ابھی کوئی کارکن منسلک نہیں۔')
  } else if (summary.overallStatus.label !== 'On Track') {
    attention.push(`مجموعی صورتِ حال: ${statusUrdu}`)
  }
  if (summary.pendingVisits > summary.connectedKarkuns / 2 && summary.connectedKarkuns > 0) {
    attention.push('ملاقاتوں کی تکمیل منسلکیت سے پیچھے ہے۔')
  }

  const nextPlan: string[] = []
  if (summary.pendingVisits > 0) nextPlan.push('باقی ملاقاتیں جلد مکمل کریں۔')
  if (summary.pendingWeeklyIjtema > 0) nextPlan.push('ہفتہ وار اجتماع کی حاضری درج کریں۔')
  if (summary.pendingAppRegistration > 0) nextPlan.push('باقی JIH App رجسٹریشن مکمل کریں۔')
  if (summary.pendingMonthlyBaitulMaal > 0) nextPlan.push('بیت المال کی وابستگی مکمل کریں۔')
  if (summary.allResponsibilitiesComplete) {
    nextPlan.push('الحمد للہ — موجودہ ذمہ داریاں مکمل نظر آتی ہیں۔')
  }

  return formatSecretarySections({
    situation: `آپ کی عملی رپورٹ: ${summary.connectedKarkuns} منسلک کارکن؛ تکمیل ${summary.completionPct}% — ${statusUrdu}۔`,
    progress,
    remaining,
    attention,
    nextPlan,
    advice,
  })
}

function formatSelfPrioritiesSections(
  tasks: readonly WorkQueueTask[],
  advice: string,
): string {
  const nextPlan =
    tasks.length > 0
      ? tasks.slice(0, 5).map((t, i) => `${i + 1}. ${workQueueTitleUrdu(t)}`)
      : []
  const remaining = nextPlan.map((line) => line.replace(/^\d+\.\s*/, ''))
  return formatSecretarySections({
    situation: 'آج آپ کی عملی ترجیحات درج ذیل قطار سے اخذ کی گئی ہیں۔',
    progress: [],
    remaining,
    attention: tasks.length === 0 ? ['اس وقت کوئی فوری ترجیحی کام نظر نہیں آتا۔'] : [],
    nextPlan: nextPlan.length > 0 ? nextPlan : ['موجودہ رفتار برقرار رکھیں۔'],
    advice,
    remainingFirst: true,
  })
}

/**
 * KC-027 — Logged-in Rukn first-person secretary report / priorities.
 * Never asks «کس کارکن کی رپورٹ؟»; uses official campaign summary SSoT.
 */
export function handleRuknSelfReport(
  layers: string[],
  mode: 'report' | 'priorities',
  role: RafeeqRole,
  ruknId: string | null,
): RafeeqTurnResult {
  layers.push('rukn_self_report')
  layers.push('secretary_intelligence')

  if (!ruknId) {
    return baseResult({
      text: companion(
        'ذاتی رپورٹ / ترجیحات کے لیے رکن کے طور پر سائن ان کریں۔',
      ),
      actions: [{ id: 'self-login', label: 'سائن ان', route: ROUTES.LOGIN }],
      intentCode: mode === 'report' ? 'REPORT' : 'FOLLOW_UP',
      requiresConfirmation: false,
      confirmationState: null,
      layersVisited: Object.freeze([...layers]),
      metadata: {
        secretaryIntelligence: true,
        ruknSelf: mode,
        missingRuknId: true,
        noFirestoreWrite: true,
      },
    })
  }

  const home = role === 'administrator' ? ROUTES.ADMIN : ROUTES.RUKN
  const myKarkun =
    role === 'administrator' ? adminAssignmentsPath() : ROUTES.RUKN_MY_KARKUN
  const advice = buildContextualRafeeqGuidance(ruknId)

  if (mode === 'priorities') {
    const tasks = buildSmartWorkQueue(role, ruknId)
    const body = formatSelfPrioritiesSections(tasks, advice)
    return baseResult({
      text: companion(body),
      actions: [
        { id: 'self-priorities-home', label: 'ہوم', route: home },
        { id: 'self-priorities-karkun', label: 'میرے کارکنان', route: myKarkun },
      ],
      intentCode: 'FOLLOW_UP',
      requiresConfirmation: false,
      confirmationState: 'AUTO_APPROVED',
      layersVisited: Object.freeze([...layers]),
      metadata: {
        secretaryIntelligence: true,
        ruknSelf: 'priorities',
        ruknId,
        workQueue: tasks,
        noFirestoreWrite: true,
      },
    })
  }

  const summary = buildOfficialCampaignSummary(ruknId)
  const body = formatSelfReportSections(summary, advice)
  return baseResult({
    text: companion(body),
    actions: [
      { id: 'self-report-home', label: 'ہوم', route: home },
      { id: 'self-report-karkun', label: 'میرے کارکنان', route: myKarkun },
    ],
    intentCode: 'REPORT',
    requiresConfirmation: false,
    confirmationState: 'AUTO_APPROVED',
    layersVisited: Object.freeze([...layers]),
    metadata: {
      secretaryIntelligence: true,
      ruknSelf: 'report',
      ruknId,
      officialCampaignSummary: summary,
      noFirestoreWrite: true,
    },
  })
}

export function handleKarkunInfo(
  layers: string[],
  subject: string | null,
  memory: RafeeqSessionMemory,
  options?: { focus?: SecretaryFocus; utterance?: string; ruknId?: string | null },
): RafeeqTurnResult {
  layers.push('karkun_info')
  layers.push('secretary_intelligence')
  const focus: SecretaryFocus =
    options?.focus ??
    (options?.utterance && isPersonRemainingFollowUp(options.utterance)
      ? 'remaining'
      : 'full')
  const query = subject?.trim() || memory.lastPersonName || ''
  if (!query) {
    return baseResult({
      text: companion('کس کارکن کی رپورٹ چاہیے؟ نام لکھیں۔'),
      actions: [],
      intentCode: 'SEARCH',
      requiresConfirmation: false,
      confirmationState: null,
      layersVisited: Object.freeze([...layers]),
      metadata: { secretaryIntelligence: true },
    })
  }

  const hits = searchPeopleReadOnly(query, 5)
  if (hits.length === 0) {
    return baseResult({
      text: companion(`“${query}” نہیں ملا۔`),
      actions: [],
      intentCode: 'SEARCH',
      requiresConfirmation: false,
      confirmationState: null,
      layersVisited: Object.freeze([...layers]),
      metadata: { query, secretaryIntelligence: true },
    })
  }

  const primary = hits[0]!
  memory.lastPersonId = primary.personId
  memory.lastPersonName = primary.name
  memory.followUpHint = 'کیا باقی ہے؟ / تفصیل / ملاقات'

  const facts = buildPersonSecretaryFacts({
    personId: primary.personId,
    name: primary.name,
    mobile: primary.mobile,
    profilePath: primary.profilePath,
    ruknId: options?.ruknId ?? null,
  })

  const report = facts
    ? formatPersonSecretaryReport(facts, focus)
    : `${primary.name}\nموبائل: ${primary.mobile || '—'}`

  return baseResult({
    text: companion(report),
    actions: hits.map((hit) => ({
      id: `info-${hit.personId}`,
      label: hit.name,
      route: hit.profilePath,
    })),
    intentCode: 'SEARCH',
    requiresConfirmation: false,
    confirmationState: 'AUTO_APPROVED',
    layersVisited: Object.freeze([...layers]),
    metadata: {
      hits,
      readOnly: true,
      secretaryIntelligence: true,
      personReport: facts,
      focus,
      noFirestoreWrite: true,
    },
  })
}

export function handleSafeCommunication(
  layers: string[],
  kind: 'CALL' | 'WHATSAPP',
  subject: string | null,
  memory: RafeeqSessionMemory,
  confirmationState: string,
): RafeeqTurnResult {
  layers.push('safe_action')
  const query = subject?.trim() || memory.lastPersonName || ''
  const hits = query ? searchPeopleReadOnly(query, 3) : []
  const person = hits[0]

  if (!person) {
    return baseResult({
      text: companion(
        kind === 'CALL'
          ? 'کال کے لیے کارکن کا نام بتائیں۔'
          : 'واٹس ایپ کے لیے کارکن کا نام بتائیں۔',
      ),
      actions: [],
      intentCode: kind,
      requiresConfirmation: true,
      confirmationState,
      layersVisited: Object.freeze([...layers]),
      metadata: {},
    })
  }

  memory.lastPersonId = person.personId
  memory.lastPersonName = person.name

  const tel = buildTelLink(person.mobile)
  const wa = buildWhatsAppLink(person.mobile)
  const actions: RafeeqAction[] = []
  if (kind === 'CALL' && tel) {
    actions.push({ id: `call-${person.personId}`, label: `کال: ${person.name}`, route: tel })
  }
  if (kind === 'WHATSAPP' && wa) {
    actions.push({
      id: `wa-${person.personId}`,
      label: `واٹس ایپ: ${person.name}`,
      route: wa,
    })
  }
  actions.push({
    id: `profile-${person.personId}`,
    label: 'پروفائل',
    route: person.profilePath,
  })

  return baseResult({
    text: companion(
      `تصدیق کے بعد: ${person.name} سے ${kind === 'CALL' ? 'کال' : 'واٹس ایپ'}۔\n(موجودہ رابطہ لنکس — کوئی نئی منطق نہیں)`,
    ),
    actions,
    intentCode: kind,
    requiresConfirmation: true,
    confirmationState,
    layersVisited: Object.freeze([...layers]),
    metadata: { personId: person.personId, kind },
  })
}

export function handleSafeNavigateAction(
  layers: string[],
  intentCode: string,
  role: RafeeqRole,
  subject: string | null,
  memory: RafeeqSessionMemory,
  confirmationState: string,
): RafeeqTurnResult {
  layers.push('safe_navigate')

  if (intentCode === 'IJTEMA_ATTENDANCE') {
    const nav = resolveNavigationTarget('weekly_ijtema', role)
    return baseResult({
      text: companion('حاضری کے لیے اجتماع اسکرین کھولیں۔ (موجودہ ماڈیول)'),
      actions: nav
        ? [{ id: 'mark-attendance', label: nav.label, route: nav.route }]
        : [],
      intentCode,
      requiresConfirmation: true,
      confirmationState,
      layersVisited: Object.freeze([...layers]),
      metadata: { opensExistingUi: true },
    })
  }

  // VISIT_UPDATE → open visit path if person known
  const query = subject?.trim() || memory.lastPersonName || ''
  const hits = query ? searchPeopleReadOnly(query, 1) : []
  if (hits[0] && role === 'rukn') {
    return baseResult({
      text: companion(`ملاقات درج کرنے کے لیے ${hits[0].name} کا وزٹ اسکرین کھولیں۔`),
      actions: [
        {
          id: `visit-${hits[0].personId}`,
          label: 'وزیٹ اسکرین',
          route: ruknVisitPath(hits[0].personId),
        },
      ],
      intentCode,
      requiresConfirmation: true,
      confirmationState,
      layersVisited: Object.freeze([...layers]),
      metadata: { opensExistingUi: true },
    })
  }

  return baseResult({
    text: companion(
      role === 'administrator'
        ? 'ملاقات / عملدرآمد کے لیے موجودہ عملدرآمد اسکرین استعمال کریں۔'
        : 'ملاقات کے لیے کارکن کا نام بتائیں یا اپنے کارکنان کھولیں۔',
    ),
    actions:
      role === 'administrator'
        ? [{ id: 'exec', label: 'عملدرآمد', route: adminExecutionPath() }]
        : [{ id: 'my', label: 'میرے کارکنان', route: ROUTES.RUKN_MY_KARKUN }],
    intentCode,
    requiresConfirmation: true,
    confirmationState,
    layersVisited: Object.freeze([...layers]),
    metadata: { opensExistingUi: true },
  })
}
