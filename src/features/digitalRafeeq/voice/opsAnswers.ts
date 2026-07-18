/**
 * Operational Q&A for Digital Rafeeq — Urdu-first companion (رفیق).
 * Answers from live repositories/services — presentation/wording only (KC-016.1).
 */

import { getPeopleStatistics } from '@/lib/peopleStore'
import { getTeamPerformanceRows } from '@/lib/commandCenterPresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getAssignmentDashboardMetrics } from '@/services/assignmentService'
import { getBaitulMaalDashboardMetrics, getRuknBaitulMaalMetrics } from '@/services/baitulMaalService'
import { getCurrentIjtemaAttendance, getIjtemaAttendanceDashboardMetrics } from '@/services/ijtemaAttendanceService'
import { getJihWebPortalDashboardMetrics } from '@/services/jihWebPortalService'
import { getConnectedKarkunIdsForRukn } from '@/lib/connections/getConnectedKarkunsForRukn'
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

function respectName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return 'کارکن'
  if (/صاحب$|بیگم$|آپہ$/.test(trimmed)) return trimmed
  return `${trimmed} صاحب`
}

/** Salam + observation (+ optional guidance / soft encouragement). */
function companionReply(
  observation: string,
  guidance?: string,
  encouragement?: string,
): string {
  const parts = [observation.trim()]
  if (guidance?.trim()) parts.push(guidance.trim())
  if (encouragement?.trim()) parts.push(encouragement.trim())
  const body = parts.filter(Boolean).join('\n\n')
  if (/السلام علیکم/.test(body)) return body
  return `السلام علیکم\n\n${body}`
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
      text: companionReply(
        'میں کارکنان، ملاقاتوں، ترجیحات اور جماعتی ذمہ داریوں کے بارے میں آپ کی رہنمائی کے لیے حاضر ہوں۔',
        'آپ جو چاہیں پوچھ سکتے ہیں۔',
      ),
      actions: [],
    }
  }

  if (context.role === 'administrator') {
    return answerAdminQuery(query, context.adminSnapshot)
  }
  return answerRuknQuery(query, context.ruknId ?? '', context.ruknSnapshot)
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
      text: companionReply(
        `ابھی ${people.unassignedKarkuns} کارکن کا رابطہ باقی ہے، جبکہ ${people.assignedKarkuns} پہلے سے مربوط ہیں۔`,
        'اگر مناسب سمجھیں تو اگلا قدم روابط پر توجہ دینا بہتر ہوگا۔',
        'اللہ اس کوشش میں آسانی عطا فرمائے۔',
      ),
      actions: [
        { id: 'connections', label: 'روابط دیکھیں', route: adminAssignmentsPath() },
        { id: 'execution', label: 'عملدرآمد دیکھیں', route: adminExecutionPath() },
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
        text: companionReply(
          'رکن کی کارکردگی ابھی سامنے نہیں آئی۔',
          'جب روابط شروع ہوں گے تو میں بتاؤں گا کسے مدد درکار ہے۔',
        ),
        actions: [{ id: 'connections', label: 'روابط دیکھیں', route: ROUTES.ADMIN_ASSIGNMENTS }],
      }
    }
    return {
      text: companionReply(
        `${weakest.ruknName} کو اس وقت زیادہ توجہ درکار لگتی ہے — تکمیل تقریباً ${weakest.completionPct}% ہے اور ${weakest.pendingWork} کام باقی ہیں۔ ${strongest.ruknName} اس وقت بہتر رفتار پر ہیں (${strongest.completionPct}%)۔`,
        'اگر ممکن ہو تو ان کی مدد کے لیے ایک مختصر بات چیت مفید ہوگی۔',
        'اللہ ارکان کی خدمت میں برکت عطا فرمائے۔',
      ),
      actions: [
        { id: 'rukn', label: 'ارکان دیکھیں', route: ROUTES.ADMIN_RUKN },
        { id: 'execution', label: 'عملدرآمد دیکھیں', route: adminExecutionPath() },
      ],
    }
  }

  if (matches(query, [/attendance|ijtema|missed|absent/, /حاضری|اجتماع|غائب|غیر حاضر/])) {
    return {
      text: companionReply(
        `اس ہفتے کے اجتماع میں ${ijtema.present} حاضر رہے، ${ijtema.absent} شریک نہیں ہو سکے، ${ijtema.excused} معذور ہیں، اور ${ijtema.notRecorded} کی حاضری ابھی درج نہیں۔`,
        'نرم یاد دہانی سے شرکت بہتر ہو سکتی ہے۔',
      ),
      actions: [
        { id: 'attendance', label: 'حاضری دیکھیں', route: adminCompliancePath('ijtema') },
        { id: 'reminder', label: 'یاد دہانی بھیجیں', route: ROUTES.ADMIN_COMMUNICATION },
      ],
    }
  }

  if (matches(query, [/bait.?ul.?maal|contribution|target/, /بیت المال|عطیہ/])) {
    return {
      text: companionReply(
        `بیت المال کی صورتحال تقریباً ${baitulMaal.compliancePercentage}% مکمل ہے۔ ${baitulMaal.pending} باقی اور ${baitulMaal.paid} ادا شدہ ہیں۔`,
        'اگر مناسب سمجھیں تو نرم یاد دہانی سے مہینہ مکمل ہو سکتا ہے۔',
      ),
      actions: [
        { id: 'baitul', label: 'بیت المال دیکھیں', route: adminCompliancePath('baitul-maal') },
        { id: 'reminder', label: 'یاد دہانی بھیجیں', route: ROUTES.ADMIN_COMMUNICATION },
      ],
    }
  }

  if (matches(query, [/follow.?up|overdue/, /فالو اپ|باقی فالو/])) {
    const overdue =
      snapshot?.followUpQueue.find((group) => group.section === 'overdue')?.items.length ?? 0
    return {
      text: companionReply(
        `${assignments.activeAssignments} فعال روابط میں ${overdue} فالو اپ ابھی باقی ہیں۔`,
        'اگر ممکن ہو تو پہلے انہیں مکمل کر لیجیے تاکہ تعلق مضبوط رہے۔',
        'آپ کی توجہ امانت کا حصہ ہے۔',
      ),
      actions: [
        { id: 'follow-up', label: 'فالو اپ دیکھیں', route: ROUTES.ADMIN_FOLLOW_UP },
        { id: 'execution', label: 'عملدرآمد دیکھیں', route: adminExecutionPath() },
      ],
    }
  }

  if (
    matches(query, [
      /today|focus|priorit|should i|what.*(do|work)/,
      /آج|ترجیح|کیا کروں|کام/,
    ])
  ) {
    const title = snapshot?.nextAction.title ?? 'مہم کی ترجیحات'
    const detail = snapshot?.nextAction.description ?? ''
    return {
      text: companionReply(
        `آج کی توجہ یہ لگتی ہے: ${title}${detail ? `۔ ${detail}` : ''}`,
        'اگر مناسب سمجھیں تو اسی سے آغاز کیجیے۔',
      ),
      actions: [
        {
          id: 'mission',
          label: snapshot?.nextAction.actionLabel ?? 'آگے بڑھیں',
          route: snapshot?.nextAction.route ?? ROUTES.ADMIN,
        },
        { id: 'execution', label: 'عملدرآمد دیکھیں', route: adminExecutionPath() },
      ],
    }
  }

  if (matches(query, [/jih|registration/, /اندراج|رجسٹریشن/])) {
    return {
      text: companionReply(
        `جے آئی ایچ اندراج کی صورتحال: ${jih.registered} مکمل، ${jih.notRegistered} باقی، اور ${jih.pendingReports} رپورٹ زیر التوا۔`,
        'اندراج مکمل ہونے سے اگلے مراحل آسان ہو جاتے ہیں۔',
      ),
      actions: [
        { id: 'jih', label: 'اندراج دیکھیں', route: adminCompliancePath('jih-portal') },
      ],
    }
  }

  return {
    text: companionReply(
      `اس وقت ${people.assignedKarkuns} کارکن مربوط ہیں، ${people.unassignedKarkuns} کا رابطہ باقی ہے، اور ${team.length} ارکان خدمت پر ہیں۔`,
      'ملاقات، حاضری، فالو اپ یا رکن کی کارکردگی کے بارے میں کچھ بھی پوچھیے۔',
      'میں آپ کے ساتھ ہوں۔',
    ),
    actions: [
      { id: 'connections', label: 'روابط دیکھیں', route: ROUTES.ADMIN_ASSIGNMENTS },
      { id: 'compliance', label: 'تعمیل دیکھیں', route: ROUTES.ADMIN_COMPLIANCE },
    ],
  }
}

function answerRuknQuery(
  query: string,
  ruknId: string,
  snapshot?: RuknCommandCenterSnapshot,
): OpsAnswer {
  const connectedIds = getConnectedKarkunIdsForRukn(ruknId)
  const guidance = getGuidanceForRuknKarkuns(ruknId)
  const baitulMaal = getRuknBaitulMaalMetrics(connectedIds)
  const urgent = sortGuidanceByUrgency(guidance)

  if (
    matches(query, [
      /phone|call.*karkun|want to call/,
      /فون کرنا|نام بولیے، میں خدمت/,
    ])
  ) {
    return {
      text: companionReply(
        'فون کمانڈ جلد آپ کی خدمت میں حاضر ہوگی۔',
        'ابھی آپ مربوط کارکنان کی فہرست سے براہِ راست کال کر سکتے ہیں۔',
        'میں آپ کے ساتھ ہوں۔',
      ),
      actions: [
        { id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (
    matches(query, [
      /plan.*(visit|meeting)|order.*visit|schedule.*tomorrow|upcoming.*plan/,
      /ترتیب|منصوبہ بندی|آئندہ ملاقات|کل کی ملاقات/,
    ])
  ) {
    const topNames = urgent.slice(0, 4).map((item) => respectName(item.karkunName))
    if (topNames.length === 0) {
      return {
        text: companionReply(
          'ابھی منصوبہ بندی کے لیے کافی تفصیل نہیں۔',
          'پہلے چند کارکنان سے رابطہ قائم کریں، پھر ترتیب بنانا آسان ہوگا۔',
        ),
        actions: [
          { id: 'connect', label: 'کارکن مربوط کریں', route: ROUTES.RUKN_AVAILABLE_KARKUN },
        ],
      }
    }
    return {
      text: companionReply(
        `مناسب ترتیب یہ ہو سکتی ہے: ${topNames.join('، پھر ')}۔`,
        'اگر آپ چاہیں تو اسی ترتیب سے آج یا کل رابطہ شروع کیجیے۔',
        'اللہ منصوبے میں برکت عطا فرمائے۔',
      ),
      actions: [
        ...(urgent[0]
          ? [{ id: 'record', label: 'ملاقات محفوظ کریں', route: ruknVisitPath(urgent[0].karkunId) }]
          : []),
        { id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (
    matches(query, [
      /today|focus|mission|should i|what.*(do|work)|priorit|goal|target/,
      /آج|مشن|کیا کروں|کام|ترجیح|ہدف/,
    ])
  ) {
    return {
      text: companionReply(
        `${snapshot?.nextAction.title ?? 'آج اپنے مربوط کارکنان کو دیکھ لیجیے'}${
          snapshot?.nextAction.description ? `۔ ${snapshot.nextAction.description}` : ''
        }`,
        'اگر مناسب سمجھیں تو اسی ترجیح سے آغاز کیجیے۔',
        'اللہ آپ کی خدمت قبول فرمائے۔',
      ),
      actions: [
        {
          id: 'mission',
          label: snapshot?.nextAction.actionLabel ?? 'آج کی ترجیح',
          route: snapshot?.nextAction.route ?? ROUTES.RUKN_MY_KARKUN,
        },
        { id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (
    matches(query, [
      /who.*(meet|visit)|should.*(meet|visit)|recommend.*meet/,
      /کس سے ملاقات|ملاقات کرنی چاہیے|کس سے رابطہ/,
    ])
  ) {
    const top = urgent[0]
    if (!top) {
      return {
        text: companionReply(
          'ابھی کوئی خاص ملاقات تجویز کرنے کے لیے کافی تفصیل نہیں۔',
          'جب آپ تیار ہوں تو کسی قریبی کارکن سے رابطہ شروع کیجیے۔',
        ),
        actions: [
          { id: 'connect', label: 'کارکن مربوط کریں', route: ROUTES.RUKN_AVAILABLE_KARKUN },
        ],
      }
    }
    const name = respectName(top.karkunName)
    return {
      text: companionReply(
        `آج ${name} سے ملاقات زیادہ مناسب لگتی ہے۔`,
        'اگر ممکن ہو تو ایک مختصر، نرم گفتگو بھی کافی ہو سکتی ہے۔',
        'اللہ تعلق میں خیر عطا فرمائے۔',
      ),
      actions: [
        { id: 'record', label: 'ملاقات محفوظ کریں', route: ruknVisitPath(top.karkunId) },
        { id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN },
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
    const named = names.slice(0, 3).map(respectName)
    return {
      text: companionReply(
        visitItems.length === 0
          ? 'آج کی فہرست میں کوئی ملاقات باقی نہیں۔'
          : `آج ${visitItems.length} ملاقات باقی ہیں${
              named.length ? ` — خاص طور پر ${named.join('، ')}` : ''
            }۔`,
        visitItems.length === 0
          ? 'اگر مناسب سمجھیں تو مربوط کارکنان دیکھ کر اگلی ملاقات طے کر لیجیے۔'
          : 'اگر ممکن ہو تو پہلے ان سے رابطہ کر لیجیے۔',
        visitItems.length > 0 ? 'آپ کی توجہ ان کے لیے قیمتی ہے۔' : undefined,
      ),
      actions: [
        ...(firstId
          ? [{ id: 'record', label: 'ملاقات محفوظ کریں', route: ruknVisitPath(firstId) }]
          : []),
        { id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN },
        { id: 'schedule', label: 'ملاقات طے کریں', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (
    matches(query, [
      /ijtema|attendance|missed|absent|how many.*(attend|present|participat)/,
      /اجتماع|حاضری|غائب|غیر حاضر|شریک ہوئے|حاضر ہوئے/,
    ])
  ) {
    const missed = connectedIds.filter((id) => {
      const status = getCurrentIjtemaAttendance(id).status
      return status === 'Absent' || status === 'Not recorded'
    })
    const present = connectedIds.filter((id) => {
      const status = getCurrentIjtemaAttendance(id).status
      return status === 'Present' || status === 'Excused'
    })
    const names = missed
      .slice(0, 5)
      .map((id) => getKarkunById(id)?.name)
      .filter(Boolean) as string[]
    const named = names.map(respectName)

    if (/شریک ہوئے|حاضر ہوئے|how many.*(attend|present|participat)/.test(query)) {
      return {
        text: companionReply(
          `آج اجتماع میں ${present.length} کارکن شریک ہوئے، جبکہ ${missed.length} غیر حاضر یا غیر محفوظ ہیں۔`,
          missed.length > 0
            ? 'اگر مناسب سمجھیں تو غیر حاضر کارکنان سے نرم رابطہ مفید ہوگا۔'
            : 'الحمد للہ — اسی تسلسل کو برقرار رکھیے۔',
        ),
        actions: [
          { id: 'attendance', label: 'حاضری دیکھیں', route: ROUTES.RUKN },
          { id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN },
        ],
      }
    }

    return {
      text: companionReply(
        missed.length === 0
          ? 'الحمد للہ — اس ہفتے کے اجتماع میں سب مربوط کارکنان حاضر یا معذور نظر آتے ہیں۔'
          : `آج اجتماع میں ${missed.length} کارکن شریک نہیں ہو سکے${
              named.length ? `: ${named.join('، ')}` : ''
            }۔`,
        missed.length === 0
          ? 'اسی تسلسل کو برقرار رکھیے۔'
          : 'اگر مناسب سمجھیں تو مختصر اور نرم یاد دہانی مفید ہوگی۔',
        missed.length > 0 ? 'دوبارہ رابطہ تعلق مضبوط کرتا ہے۔' : 'اللہ حاضری میں برکت عطا فرمائے۔',
      ),
      actions: [
        { id: 'attendance', label: 'حاضری دیکھیں', route: ROUTES.RUKN },
        { id: 'reminder', label: 'یاد دہانی', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (
    matches(query, [
      /attention|need support|priority karkun|more care/,
      /توجہ درکار|زیادہ توجہ|مدد درکار/,
    ])
  ) {
    const topNames = urgent
      .slice(0, 4)
      .map((item) => respectName(item.karkunName))
    if (topNames.length === 0) {
      return {
        text: companionReply(
          'اس وقت کوئی خاص توجہ والی صورتحال نظر نہیں آ رہی۔',
          'ایک ہلکا سا رابطہ بھی خیر کا کام ہے۔',
        ),
        actions: [{ id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN }],
      }
    }
    return {
      text: companionReply(
        `ان کارکنان کو زیادہ توجہ درکار لگتی ہے: ${topNames.join('، ')}۔`,
        'اگر ممکن ہو تو آج ان میں سے کسی ایک سے رابطہ کر لیجیے۔',
        'آپ کی مہربانی ان کے لیے سہارا بنتی ہے۔',
      ),
      actions: [
        ...(urgent[0]
          ? [{ id: 'record', label: 'ملاقات محفوظ کریں', route: ruknVisitPath(urgent[0].karkunId) }]
          : []),
        { id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (
    matches(query, [
      /this week|week.*(contact|reach|call)/,
      /اس ہفتے|ہفتے.*رابطہ/,
    ])
  ) {
    const top = urgent[0]
    if (!top) {
      return {
        text: companionReply(
          'اس ہفتے کے لیے ابھی کوئی خاص تجویز نہیں۔',
          'جب آپ مناسب سمجھیں تو کسی مربوط کارکن سے نرم رابطہ مفید ہوگا۔',
        ),
        actions: [{ id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN }],
      }
    }
    return {
      text: companionReply(
        `اس ہفتے ${respectName(top.karkunName)} سے رابطہ کرنا زیادہ مناسب لگتا ہے۔`,
        'اگر آپ کی سہولت ہو تو مختصر ملاقات یا بات چیت کافی ہو سکتی ہے۔',
        'اللہ تعلق میں خیر رکھے۔',
      ),
      actions: [
        { id: 'record', label: 'ملاقات محفوظ کریں', route: ruknVisitPath(top.karkunId) },
        { id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (matches(query, [/registration|jih|incomplete|missing.*(info|detail)/, /رجسٹریشن|اندراج|نامکمل|معلومات/])) {
    const pending = connectedIds.filter((id) => {
      const karkun = getKarkunById(id)
      return karkun && karkun.jihAppRegistrationStatus !== 'Registered'
    })
    const names = pending
      .slice(0, 5)
      .map((id) => getKarkunById(id)?.name)
      .filter(Boolean) as string[]
    const named = names.map(respectName)
    return {
      text: companionReply(
        pending.length === 0
          ? 'الحمد للہ — سب مربوط کارکنان کی بنیادی معلومات اور اندراج مکمل نظر آتے ہیں۔'
          : `${pending.length} کارکن کی معلومات یا اندراج ابھی نامکمل ہے${
              named.length ? `: ${named.join('، ')}` : ''
            }۔`,
        pending.length === 0
          ? 'اب ملاقات اور تعلق پر توجہ دے سکتے ہیں۔'
          : 'اگر مناسب سمجھیں تو نرم رہنمائی سے اندراج مکمل کروا لیجیے۔',
      ),
      actions: [{ id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  if (matches(query, [/bait.?ul.?maal|contribution/, /بیت المال|عطیہ/])) {
    return {
      text: companionReply(
        `آپ کے روابط میں بیت المال کی صورتحال: ${baitulMaal.pending} باقی، ${baitulMaal.paid} ادا شدہ، اور ${baitulMaal.exempt} مستثنیٰ۔`,
        'اگر مناسب سمجھیں تو نرم یاد دہانی سے مہینہ مکمل ہو سکتا ہے۔',
      ),
      actions: [
        { id: 'baitul', label: 'بیت المال', route: ROUTES.RUKN_MY_KARKUN },
        { id: 'reminder', label: 'یاد دہانی', route: ROUTES.RUKN_MY_KARKUN },
      ],
    }
  }

  if (
    matches(query, [
      /development|tarbiyah|assessment|performance|overall|situation|status/,
      /ترقی|تربیت|جائزہ|کارکردگی|صورتحال|مجموعی/,
    ])
  ) {
    const due = connectedIds.filter((id) => {
      const stage = guidance.find((item) => item.karkunId === id)?.currentStage
      if (stage !== 'development') return false
      return !getDevelopmentAssessment(id)?.indicators.ready_for_next_stage
    }).length
    return {
      text: companionReply(
        `آپ اس وقت ${connectedIds.length} مربوط کارکنان کے ساتھ ہیں۔ مجموعی طور پر سلسلہ جاری ہے؛ ${due} ترقیاتی جائزے ابھی باقی ہیں۔`,
        'اگر ممکن ہو تو ایک ایک کر کے آگے بڑھیں — جلدی کی ضرورت نہیں۔',
        'آپ کی کارکردگی امانت داری سے جڑی ہے۔ اللہ قبول فرمائے۔',
      ),
      actions: [{ id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  if (matches(query, [/follow.?up/, /فالو اپ/])) {
    const count = snapshot?.followUpQueue.reduce((sum, group) => sum + group.items.length, 0) ?? 0
    return {
      text: companionReply(
        `آپ کے پاس ${count} فالو اپ باقی ہیں۔`,
        'اگر ممکن ہو تو آج چند مکمل کر لیجیے تاکہ تعلق مضبوط رہے۔',
        'چھوٹی کوشش بھی خیر کا ذریعہ بنتی ہے۔',
      ),
      actions: [{ id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN }],
    }
  }

  return {
    text: companionReply(
      `اس وقت آپ کے ${connectedIds.length} مربوط کارکن ہیں۔`,
      'ترجیحات، ملاقاتیں، اجتماع، اندراج یا مجموعی صورتحال — جو پوچھنا چاہیں پوچھیے۔',
      'میں آپ کا رفیق ہوں۔',
    ),
    actions: [
      { id: 'connected', label: 'مربوط کارکنان', route: ROUTES.RUKN_MY_KARKUN },
      { id: 'connect', label: 'کارکن مربوط کریں', route: ROUTES.RUKN_AVAILABLE_KARKUN },
    ],
  }
}

export {
  RAFEEQ_WELCOME_MESSAGE,
  RAFEEQ_SUGGESTION_CATALOG,
  resolveContextualSuggestions,
  getSuggestionTexts,
  SUGGESTED_QUESTIONS_ADMIN,
  SUGGESTED_QUESTIONS_RUKN,
} from './suggestionCatalog'
export type { RafeeqSuggestion, RafeeqSuggestionCategory, RafeeqSuggestionContext } from './suggestionCatalog'
