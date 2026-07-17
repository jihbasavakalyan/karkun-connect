/**
 * Operational Q&A for Digital Rafeeq (KC-008) — Urdu-first companion.
 * Answers from live repositories/services — no hardcoded metrics.
 */

import { getPeopleStatistics } from '@/lib/peopleStore'
import { getTeamPerformanceRows } from '@/lib/commandCenterPresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import { getBaitulMaalDashboardMetrics, getRuknBaitulMaalMetrics } from '@/services/baitulMaalService'
import { getCurrentIjtemaAttendance, getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import { getActiveAssignmentsForRukn } from '@/stores/assignmentStore'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getDevelopmentAssessment } from '@/stores/developmentAssessmentStore'
import type { RuknCommandCenterSnapshot, AdminCommandCenterSnapshot } from '@/types/campaignAutomation.types'
import {
  ROUTES,
  adminAssignmentsPath,
  adminCompliancePath,
  adminExecutionPath,
  ruknVisitPath,
} from '@/constants/routes'

export type OpsAnswerAction = {
  id: string
  label: string
  route: string
}

export type OpsAnswer = {
  text: string
  actions: OpsAnswerAction[]
}

function normalize(query: string): string {
  return query.toLowerCase().trim()
}

function matches(query: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(query))
}

export function answerOperationalQuery(
  rawQuery: string,
  context: {
    role: 'administrator' | 'rukn'
    ruknId?: string
    adminSnapshot?: AdminCommandCenterSnapshot
    ruknSnapshot?: RuknCommandCenterSnapshot
  },
): OpsAnswer {
  const query = normalize(rawQuery)
  if (!query) {
    return {
      text: conversational(
        'ملاقات، روابط، اجتماع، فالو اپ یا آج کی ترجیحات کے بارے میں پوچھیں۔',
      ),
      actions: [],
    }
  }

  if (context.role === 'administrator') {
    return answerAdminQuery(query, context.adminSnapshot)
  }
  return answerRuknQuery(query, context.ruknId ?? '', context.ruknSnapshot)
}

function conversational(body: string): string {
  const clean = body.trim()
  if (!clean) return clean
  if (/السلام علیکم/.test(clean)) return clean
  return `السلام علیکم\n\n${clean}`
}

function answerAdminQuery(
  query: string,
  snapshot?: AdminCommandCenterSnapshot,
): OpsAnswer {
  const people = getPeopleStatistics()
  const assignments = getAssignmentDashboardMetrics()
  const ijtema = getIjtemaAttendanceDashboardMetrics()
  const baitulMaal = getBaitulMaalDashboardMetrics()
  const jih = getJihWebPortalDashboardMetrics()
  const team = getTeamPerformanceRows()

  if (
    matches(query, [
      /unconnected|remain|available|not connected|pending connection/,
      /غیر مربوط|باقی|دستیاب|رابطہ نہیں/,
    ])
  ) {
    return {
      text: conversational(
        `${people.unassignedKarkuns} کارکن ابھی مربوط نہیں ہیں، جبکہ ${people.assignedKarkuns} پہلے سے مربوط ہیں۔ اگلا قدم روابط پر توجہ دینا چاہیے۔`,
      ),
      actions: [
        { id: 'connections', label: 'روابط کھولیں', route: adminAssignmentsPath() },
        { id: 'execution', label: 'عملدرآمد کھولیں', route: adminExecutionPath() },
      ],
    }
  }

  if (
    matches(query, [
      /rukn.*(attention|need|poor|weak|behind)|which rukn|leaderboard|performance/,
      /رکن.*(توجہ|کمزور)|کون سا رکن|کارکردگی/,
    ])
  ) {
    const weakest = [...team].sort((a, b) => a.completionPct - b.completionPct)[0]
    const strongest = [...team].sort((a, b) => b.completionPct - a.completionPct)[0]
    if (!weakest) {
      return {
        text: conversational(
          'رکن کی کارکردگی ابھی دستیاب نہیں۔ جب روابط شروع ہوں گے تو میں بتائوں گا کسے مدد درکار ہے۔',
        ),
        actions: [{ id: 'connections', label: 'روابط کھولیں', route: ROUTES.ADMIN_ASSIGNMENTS }],
      }
    }
    return {
      text: conversational(
        `${weakest.ruknName} کو ابھی توجہ درکار ہے (${weakest.completionPct}% تکمیل، ${weakest.pendingWork} باقی)۔ ${strongest.ruknName} اس وقت آگے ہیں (${strongest.completionPct}%)۔`,
      ),
      actions: [
        { id: 'rukn', label: 'ارکان کھولیں', route: ROUTES.ADMIN_RUKN },
        { id: 'execution', label: 'عملدرآمد کھولیں', route: adminExecutionPath() },
      ],
    }
  }

  if (matches(query, [/attendance|ijtema|missed/, /حاضری|اجتماع|غائب/])) {
    return {
      text: conversational(
        `اس ہفتے کا اجتماع: ${ijtema.present} حاضر، ${ijtema.absent} غائب، ${ijtema.excused} معذور، اور ${ijtema.notRecorded} ابھی درج نہیں۔ حاضری فالو اپ سے شرکت بہتر ہوگی۔`,
      ),
      actions: [
        { id: 'attendance', label: 'حاضری کھولیں', route: adminCompliancePath('ijtema') },
        { id: 'reminder', label: 'یاد دہانی بھیجیں', route: ROUTES.ADMIN_COMMUNICATION },
      ],
    }
  }

  if (matches(query, [/bait.?ul.?maal|contribution|target/, /بیت المال|عطیہ/])) {
    return {
      text: conversational(
        `بیت المال کی تکمیل ${baitulMaal.compliancePercentage}% ہے۔ ${baitulMaal.pending} باقی اور ${baitulMaal.paid} ادا شدہ ہیں۔ نرم یاد دہانی سے مہینہ مکمل ہو سکتا ہے۔`,
      ),
      actions: [
        { id: 'baitul', label: 'بیت المال کھولیں', route: adminCompliancePath('baitul-maal') },
        { id: 'reminder', label: 'یاد دہانی بھیجیں', route: ROUTES.ADMIN_COMMUNICATION },
      ],
    }
  }

  if (matches(query, [/follow.?up|overdue/, /فالو اپ|تاخیر/])) {
    const overdue =
      snapshot?.followUpQueue.find((group) => group.section === 'overdue')?.items.length ?? 0
    return {
      text: conversational(
        `${assignments.activeAssignments} فعال روابط میں ${overdue} تاخیر شدہ فالو اپ ہیں۔ پہلے انہیں مکمل کریں تاکہ مہم کی رفتار بحال ہو۔`,
      ),
      actions: [
        { id: 'follow-up', label: 'فالو اپ کھولیں', route: ROUTES.ADMIN_FOLLOW_UP },
        { id: 'execution', label: 'عملدرآمد کھولیں', route: adminExecutionPath() },
      ],
    }
  }

  if (
    matches(query, [
      /today|focus|priorit|should i|what.*(do|work)/,
      /آج|ترجیح|کیا کروں|کام/,
    ])
  ) {
    const title = snapshot?.nextAction.title ?? 'مہم کی ترجیحات دیکھیں'
    const detail = snapshot?.nextAction.description ?? ''
    return {
      text: conversational(
        `آج کی توجہ: ${title}${detail ? `۔ ${detail}` : ''}`,
      ),
      actions: [
        {
          id: 'mission',
          label: snapshot?.nextAction.actionLabel ?? 'مشن کھولیں',
          route: snapshot?.nextAction.route ?? ROUTES.ADMIN,
        },
        { id: 'execution', label: 'عملدرآمد کھولیں', route: adminExecutionPath() },
      ],
    }
  }

  if (matches(query, [/jih|registration/, /اندراج|رجسٹریشن/])) {
    return {
      text: conversational(
        `جے آئی ایچ رجسٹریشن: ${jih.registered} مکمل، ${jih.notRegistered} باقی، اور ${jih.pendingReports} رپورٹ زیر التوا۔ رجسٹریشن سے اگلے مراحل کھلتے ہیں۔`,
      ),
      actions: [
        { id: 'jih', label: 'تعمیل کھولیں', route: adminCompliancePath('jih-portal') },
      ],
    }
  }

  return {
    text: conversational(
      `مہم کا خلاصہ — ${people.assignedKarkuns} مربوط، ${people.unassignedKarkuns} باقی، اور ${team.length} ارکان فعال کام پر۔ ملاقات، حاضری، فالو اپ یا رکن کی کارکردگی پوچھیں۔`,
    ),
    actions: [
      { id: 'connections', label: 'روابط کھولیں', route: ROUTES.ADMIN_ASSIGNMENTS },
      { id: 'compliance', label: 'تعمیل کھولیں', route: ROUTES.ADMIN_COMPLIANCE },
    ],
  }
}

function answerRuknQuery(
  query: string,
  ruknId: string,
  snapshot?: RuknCommandCenterSnapshot,
): OpsAnswer {
  const assignments = getActiveAssignmentsForRukn(ruknId)
  const connectedIds = assignments.map((record) => record.karkunId)
  const guidance = getGuidanceForRuknKarkuns(ruknId)
  const baitulMaal = getRuknBaitulMaalMetrics(connectedIds)

  if (
    matches(query, [
      /today|focus|mission|should i|what.*(do|work)/,
      /آج|مشن|کیا کروں|کام/,
    ])
  ) {
    return {
      text: conversational(
        `${snapshot?.nextAction.title ?? 'اپنے مربوط کارکنان دیکھیں'}${
          snapshot?.nextAction.description ? `۔ ${snapshot.nextAction.description}` : ''
        }`,
      ),
      actions: [
        {
          id: 'mission',
          label: snapshot?.nextAction.actionLabel ?? 'آج کا مشن',
          route: snapshot?.nextAction.route ?? ROUTES.RUKN_MY_KARKUN,
        },
        { id: 'connected', label: 'روابط کھولیں', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (matches(query, [/visit|meeting|overdue visit/, /ملاقات|وزیٹ|ملاقات باقی/])) {
    const visitItems = (snapshot?.schedule ?? []).filter(
      (item) => item.karkunId || /visit|meeting|ملاقات/i.test(item.title),
    )
    const names = visitItems
      .slice(0, 5)
      .map((item) => (item.karkunId ? getKarkunById(item.karkunId)?.name : item.title))
      .filter(Boolean) as string[]
    const firstId = visitItems.find((item) => item.karkunId)?.karkunId
    const recommendation =
      names.length > 0
        ? ` پہلے ${names.slice(0, 3).join('، ')} کی ملاقات مکمل کریں۔`
        : ''
    return {
      text: conversational(
        visitItems.length === 0
          ? 'آج کی فہرست میں کوئی ملاقات نہیں۔ مربوط کارکنان دیکھ کر اگلی ملاقات طے کریں۔'
          : `آج ${visitItems.length} ملاقات باقی ہیں۔${recommendation}`,
      ),
      actions: [
        ...(firstId
          ? [{ id: 'record', label: 'ملاقات محفوظ کریں', route: ruknVisitPath(firstId) }]
          : []),
        { id: 'connected', label: 'روابط کھولیں', route: ROUTES.RUKN_MY_KARKUN },
        { id: 'schedule', label: 'ملاقات طے کریں', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (matches(query, [/ijtema|attendance|missed/, /اجتماع|حاضری|غائب/])) {
    const missed = connectedIds.filter((id) => {
      const status = getCurrentIjtemaAttendance(id).status
      return status === 'Absent' || status === 'Not recorded'
    })
    const names = missed
      .slice(0, 5)
      .map((id) => getKarkunById(id)?.name)
      .filter(Boolean) as string[]
    return {
      text: conversational(
        missed.length === 0
          ? 'الحمد للہ — اس ہفتے کے اجتماع میں سب مربوط کارکنان حاضر یا معذور ہیں۔'
          : `${missed.length} کارکن کی حاضری پر توجہ درکار ہے${
              names.length ? `: ${names.join('، ')}` : ''
            }۔ مختصر یاد دہانی مددگار ہوگی۔`,
      ),
      actions: [
        { id: 'attendance', label: 'حاضری کھولیں', route: ROUTES.RUKN },
        { id: 'reminder', label: 'یاد دہانی بھیجیں', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (matches(query, [/registration|jih/, /رجسٹریشن|اندراج/])) {
    const pending = connectedIds.filter((id) => {
      const karkun = getKarkunById(id)
      return karkun && karkun.jihAppRegistrationStatus !== 'Registered'
    })
    const names = pending
      .slice(0, 5)
      .map((id) => getKarkunById(id)?.name)
      .filter(Boolean) as string[]
    return {
      text: conversational(
        pending.length === 0
          ? 'سب مربوط کارکنان جے آئی ایچ پر رجسٹر نظر آتے ہیں۔ اب ملاقات اور ترقی پر توجہ دے سکتے ہیں۔'
          : `${pending.length} کو رجسٹریشن میں مدد درکار ہے${
              names.length ? `: ${names.join('، ')}` : ''
            }۔`,
      ),
      actions: [{ id: 'connected', label: 'روابط کھولیں', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  if (matches(query, [/bait.?ul.?maal|contribution/, /بیت المال|عطیہ/])) {
    return {
      text: conversational(
        `آپ کے روابط میں بیت المال: ${baitulMaal.pending} باقی، ${baitulMaal.paid} ادا شدہ، اور ${baitulMaal.exempt} مستثنیٰ۔ نرم یاد دہانی سے مہینہ مکمل ہو سکتا ہے۔`,
      ),
      actions: [
        { id: 'baitul', label: 'بیت المال کھولیں', route: ROUTES.RUKN_MY_KARKUN },
        { id: 'reminder', label: 'یاد دہانی بھیجیں', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (matches(query, [/development|tarbiyah|assessment|performance|overall/, /ترقی|تربیت|جائزہ/])) {
    const due = connectedIds.filter((id) => {
      const stage = guidance.find((item) => item.karkunId === id)?.currentStage
      if (stage !== 'development') return false
      return !getDevelopmentAssessment(id)?.indicators.ready_for_next_stage
    }).length
    return {
      text: conversational(
        `آپ ${connectedIds.length} مربوط کارکنان کے ساتھ ہیں۔ ${due} ترقیاتی جائزے باقی ہیں — ایک ایک کر کے مکمل کریں۔`,
      ),
      actions: [{ id: 'connected', label: 'روابط کھولیں', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  if (matches(query, [/follow.?up/, /فالو اپ/])) {
    const count = snapshot?.followUpQueue.reduce((sum, group) => sum + group.items.length, 0) ?? 0
    return {
      text: conversational(
        `آپ کے پاس ${count} فالو اپ باقی ہیں۔ آج چند مکمل کرنے سے تعلق مضبوط رہے گا۔`,
      ),
      actions: [{ id: 'connected', label: 'روابط کھولیں', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  return {
    text: conversational(
      `اس وقت آپ کے ${connectedIds.length} مربوط کارکن ہیں۔ آج کا مشن، ملاقاتیں، اجتماع، رجسٹریشن یا بیت المال پوچھیں۔`,
    ),
    actions: [
      { id: 'connected', label: 'روابط کھولیں', route: ROUTES.RUKN_MY_KARKUN },
      { id: 'connect', label: 'کارکن مربوط کریں', route: ROUTES.RUKN_AVAILABLE_KARKUN },
    ],
  }
}

export const SUGGESTED_QUESTIONS_ADMIN = [
  'کتنے کارکن ابھی مربوط نہیں؟',
  'کس رکن کو توجہ درکار ہے؟',
  'کمزور حاضری دکھائیں',
  'آج کس پر توجہ دوں؟',
] as const

export const SUGGESTED_QUESTIONS_RUKN = [
  'آج میں کیا کروں؟',
  'کس کی ملاقات باقی ہے؟',
  'اجتماع کون چھوٹ گیا؟',
  'کس کارکن کی رجسٹریشن باقی ہے؟',
  'میری ترقی کیسی ہے؟',
] as const
