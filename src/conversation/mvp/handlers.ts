/**
 * MVP capability handlers — existing services only.
 */

import { ROUTES, adminAssignmentsPath, adminExecutionPath, ruknVisitPath } from '@/constants/routes'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { searchPeopleReadOnly } from './adapters/searchAdapter'
import { resolveNavigationTarget } from './navigationMap'
import { getTurnMetricsBundle } from './turnMetricsCache'
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
        '• بصیرت: How many connected? / Pending tasks?',
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

export function handleInsights(layers: string[], role: RafeeqRole): RafeeqTurnResult {
  layers.push('insights')
  const bundle = getTurnMetricsBundle()
  const metrics = bundle.campaign
  const assignments = bundle.assignments
  const ijtema = bundle.ijtema
  const people = bundle.people

  const actions: RafeeqAction[] =
    role === 'administrator'
      ? [
          { id: 'ins-conn', label: 'روابط', route: adminAssignmentsPath() },
          { id: 'ins-exec', label: 'عملدرآمد', route: adminExecutionPath() },
          {
            id: 'ins-ijtema',
            label: 'اجتما',
            route: ROUTES.ADMIN_WEEKLY_IJTEMA,
          },
        ]
      : [
          { id: 'ins-my', label: 'میرے کارکنان', route: ROUTES.RUKN_MY_KARKUN },
          { id: 'ins-ijtema', label: 'اجتما', route: ROUTES.RUKN_WEEKLY_IJTEMA },
        ]

  return baseResult({
    text: companion(
      [
        `منسلک: ${metrics.connected}`,
        `باقی / غیر منسلک: ${metrics.remaining}`,
        `پیش رفت: ${metrics.progressPct}%`,
        `فعال روابط: ${assignments.activeAssignments}`,
        `حاضری: حاضر ${ijtema.present} / غیر حاضر ${ijtema.absent} / غیر درج ${ijtema.notRecorded}`,
        `دستیاب کارکنان: ${people.unassignedKarkuns}`,
      ].join('\n'),
    ),
    actions,
    intentCode: 'REPORT',
    requiresConfirmation: false,
    confirmationState: 'AUTO_APPROVED',
    layersVisited: Object.freeze([...layers]),
    metadata: { metrics, sourceOfTruth: metrics.sourceOfTruth },
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
    `1. Pending Karkun Requests: ${pending}`,
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
        pending > 0 ? `• ${pending} درخواست(یں) منظوری کی منتظر` : '• کوئی pending request نہیں',
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

export function handleKarkunInfo(
  layers: string[],
  subject: string | null,
  memory: RafeeqSessionMemory,
): RafeeqTurnResult {
  layers.push('karkun_info')
  const query = subject?.trim() || memory.lastPersonName || ''
  if (!query) {
    return baseResult({
      text: companion('کس کارکن کی معلومات چاہیے؟ نام لکھیں۔'),
      actions: [],
      intentCode: 'SEARCH',
      requiresConfirmation: false,
      confirmationState: null,
      layersVisited: Object.freeze([...layers]),
      metadata: {},
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
      metadata: { query },
    })
  }

  const primary = hits[0]!
  memory.lastPersonId = primary.personId
  memory.lastPersonName = primary.name

  return baseResult({
    text: companion(
      [
        `نام: ${primary.name}`,
        `موبائل: ${primary.mobile || '—'}`,
        'تفصیل پروفائل میں دستیاب ہے (read-only)۔',
      ].join('\n'),
    ),
    actions: hits.map((hit) => ({
      id: `info-${hit.personId}`,
      label: hit.name,
      route: hit.profilePath,
    })),
    intentCode: 'SEARCH',
    requiresConfirmation: false,
    confirmationState: 'AUTO_APPROVED',
    layersVisited: Object.freeze([...layers]),
    metadata: { hits, readOnly: true },
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
