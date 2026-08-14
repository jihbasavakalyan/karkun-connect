/**
 * KC-038C — Weekly Ijtema Executive Urdu Report presentation model.
 * Assembles executive summary, Rukn detail, follow-up, and submission sections
 * from KC-033 providers. No alternate KPI math. No Firestore.
 */

import { APP_VERSION } from '@/constants/app'
import { getAllKarkuns } from '@/lib/peopleStore'
import { listOpenWeeklyIjtemaEvents } from '@/services/weeklyIjtemaService'
import { getWeeklyIjtemaSubmissionsForEvent } from '@/stores/weeklyIjtemaStore'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { isWeeklyIjtemaMarkReminded } from '@/lib/operations/weeklyIjtemaInvitationAttendance'
import type { ReportContext } from './v2/types'
import { campaignModelFromContext } from './v2/sections/campaignModelAccess'
import type { WeeklyIjtemaKarkunMark } from '@/types/weeklyIjtema'

export const WEEKLY_IJTEMA_ATTENDANCE_SECTION_ID = 'weekly_ijtema_attendance' as const
export const WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND = 'weekly_ijtema_executive_report_v1' as const
export const WEEKLY_IJTEMA_ATTENDANCE_REPORT_VERSION = 'KC-038C'

export type KarkunIjtemaDisposition = 'present' | 'absent' | 'reminded' | 'pending'

export type WeeklyIjtemaKarkunDetailRow = {
  karkunId: string
  karkunName: string
  disposition: KarkunIjtemaDisposition
  statusLabel: string
}

export type WeeklyIjtemaRuknDetailSection = {
  ruknId: string
  ruknName: string
  connected: number
  reminded: number
  present: number
  absent: number
  attendancePct: number
  karkuns: WeeklyIjtemaKarkunDetailRow[]
}

export type WeeklyIjtemaReportSubmissionRow = {
  ruknName: string
  connected: number
  reminded: number
  present: number
  absent: number
}

export type WeeklyIjtemaFollowUpGroup = {
  ruknName: string
  remindedOnly: string[]
  absent: string[]
}

export type WeeklyIjtemaAttendanceReportModel = {
  kind: typeof WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND
  language: 'ur' | 'en'
  detailLevel: string
  cover: {
    reportTitle: string
    campaignName: string
    campaignUrdu: string
    meetingDateGregorian: string
    meetingDateHijri: string
    reportingDate: string
    attendanceWindow: string
    generatedOn: string
    generatedBy: string
  }
  executiveSummary: {
    totalConnectedKarkuns: number
    reminded: number
    present: number
    absent: number
    reportsSubmitted: number
    reportsPending: number
    attendancePct: number
  }
  executiveObservation: string
  comparisonGraph: {
    reminded: number
    present: number
    attendancePct: number
  }
  reportSubmission: {
    submitted: WeeklyIjtemaReportSubmissionRow[]
    pendingNames: string[]
  }
  ruknDetails: WeeklyIjtemaRuknDetailSection[]
  followUp: WeeklyIjtemaFollowUpGroup[]
  futureAnalyticsPlaceholders: string[]
  appendix: {
    definitions: string[]
    generatedTimestamp: string
    reportVersion: string
    providerVersion: string
    composerVersion: string
    systemVersion: string
    campaign: string
  }
}

function dash(language: 'ur' | 'en'): string {
  return language === 'ur' ? '—' : '—'
}

function pctOf(completed: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((completed / total) * 100)
}

function formatGregorianDate(iso: string | null | undefined, language: 'ur' | 'en'): string {
  if (!iso?.trim()) return dash(language)
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatHijriDate(iso: string | null | undefined, language: 'ur' | 'en'): string {
  if (!iso?.trim()) return dash(language)
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return dash(language)
  try {
    return new Intl.DateTimeFormat(language === 'ur' ? 'ur-PK-u-ca-islamic' : 'en-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return dash(language)
  }
}

function buildMarkIndex(): Map<string, WeeklyIjtemaKarkunMark> {
  const index = new Map<string, WeeklyIjtemaKarkunMark>()
  const events = listOpenWeeklyIjtemaEvents()
  for (const event of events) {
    for (const submission of getWeeklyIjtemaSubmissionsForEvent(event.id)) {
      for (const mark of submission.marks) {
        if (!index.has(mark.karkunId)) {
          index.set(mark.karkunId, mark)
        }
      }
    }
  }
  return index
}

function resolveDisposition(
  mark: WeeklyIjtemaKarkunMark | undefined,
  summaryStatus: string,
): KarkunIjtemaDisposition {
  if (summaryStatus === 'Present') return 'present'
  if (summaryStatus === 'Absent') return 'absent'
  if (mark && isWeeklyIjtemaMarkReminded(mark) && !mark.status) return 'reminded'
  if (mark?.reminded === true) return 'reminded'
  return 'pending'
}

function statusLabelForDisposition(
  disposition: KarkunIjtemaDisposition,
  language: 'ur' | 'en',
): string {
  const ur =
    disposition === 'present'
      ? 'اجتماع میں شریک ہوئے'
      : disposition === 'absent'
        ? 'اجتماع میں شریک نہ ہوسکے'
        : disposition === 'reminded'
          ? 'یاد دہانی کی گئی'
          : 'ابھی رابطہ باقی'
  const en =
    disposition === 'present'
      ? 'Attended'
      : disposition === 'absent'
        ? 'Could not attend'
        : disposition === 'reminded'
          ? 'Reminded'
          : 'Not yet contacted'
  return language === 'ur' ? ur : en
}

function buildExecutiveObservation(input: {
  language: 'ur' | 'en'
  reminded: number
  present: number
  absent: number
  attendancePct: number
  reportsPending: number
  followUpCount: number
}): string {
  const { language, reminded, present, absent, attendancePct, reportsPending, followUpCount } =
    input
  if (language === 'ur') {
    if (reminded === 0 && present === 0 && absent === 0) {
      return 'اس ہفتے کے اجتماع کے لیے ابھی کوئی یاد دہانی یا شرکت درج نہیں — رپورٹ خالی حالت میں ہے۔'
    }
    if (attendancePct >= 85 && absent === 0) {
      return `یاد دہانی اور شرکت دونوں مضبوط رہیں — ${present} کارکن اجتماع میں شریک ہوئے۔ موجودہ رفتار برقرار رکھیے۔`
    }
    if (absent > 0 || followUpCount > 0) {
      return `یاد دہانی کی کوششیں ${reminded > 0 ? 'جاری رہیں' : 'شروع ہونا باقی ہیں'}، تاہم ${absent > 0 ? `${absent} کارکن اجتماع میں شریک نہ ہوسکے` : 'کچھ کارکنوں کی شرکت درج نہیں'}۔ آئندہ اجتماع سے قبل ان کارکنان سے دوبارہ رابطہ ضروری ہے۔`
    }
    if (reportsPending > 0) {
      return `${reportsPending} ارکان کی رپورٹ ابھی جمع نہیں — قیادت فوری طور پر ان ارکان سے رابطہ کرے۔`
    }
    return `شرکت کی شرح ${attendancePct}٪ ہے — ${present} کارکن اجتماع میں شریک ہوئے۔`
  }

  if (reminded === 0 && present === 0 && absent === 0) {
    return 'No reminders or attendance recorded for this Weekly Ijtema yet.'
  }
  if (attendancePct >= 85 && absent === 0) {
    return `Reminders and attendance are strong — ${present} Karkuns attended. Maintain this pace.`
  }
  if (absent > 0 || followUpCount > 0) {
    return `Reminder efforts continued, but ${absent > 0 ? `${absent} Karkuns could not attend` : 'some Karkuns still need attendance marks'}. Follow up before the next Weekly Ijtema.`
  }
  if (reportsPending > 0) {
    return `${reportsPending} Rukns have not submitted their report — leadership should follow up promptly.`
  }
  return `Attendance rate is ${attendancePct}% — ${present} Karkuns attended.`
}

/**
 * Build Weekly Ijtema Executive presentation model from Composer context.
 */
export function buildWeeklyIjtemaAttendanceReportModel(
  ctx: ReportContext,
): WeeklyIjtemaAttendanceReportModel {
  const language: 'ur' | 'en' = ctx.config.language === 'en' ? 'en' : 'ur'
  const campaign = campaignModelFromContext(ctx)
  const p = ctx.providers
  const kpi = p.weeklyIjtema.getKpi()
  const health = p.weeklyIjtema.getHealthSlice()
  const ruknRows = p.weeklyIjtema.getActiveRuknRows()
  const summaries = p.weeklyIjtema.getSummariesView()
  const connections = p.connections.get()
  const markIndex = buildMarkIndex()

  const present = health.current ?? kpi.present
  const reminded = kpi.remindedTotal ?? kpi.reminded ?? 0
  const absent = kpi.absent
  const overallPct = health.pct ?? pctOf(present, reminded)
  const reportsSubmitted = kpi.ruknsSubmitted ?? 0
  const reportsPending = kpi.ruknsPending ?? 0
  const hasEvent = Boolean(kpi.eventId)

  const peopleById = new Map(getAllKarkuns().map((k) => [k.id, k]))
  const assignedRuknIds = new Set(ruknRows.map((r) => r.ruknId))

  const karkunsByRukn = new Map<string, WeeklyIjtemaKarkunDetailRow[]>()

  for (const summary of summaries) {
    const assignment = getActiveAssignmentsForKarkun(summary.karkunId)[0]
    const assignedRuknId = assignment?.ruknId?.trim() || summary.ruknId || ''
    if (assignedRuknIds.size > 0 && assignedRuknId && !assignedRuknIds.has(assignedRuknId)) {
      continue
    }
    if (assignedRuknIds.size > 0 && !assignedRuknId) continue

    const mark = markIndex.get(summary.karkunId)
    const disposition = resolveDisposition(mark, summary.status)
    const person = peopleById.get(summary.karkunId)
    const row: WeeklyIjtemaKarkunDetailRow = {
      karkunId: summary.karkunId,
      karkunName: summary.karkunName || person?.name || summary.karkunId,
      disposition,
      statusLabel: statusLabelForDisposition(disposition, language),
    }

    const bucket = assignedRuknId || summary.ruknId || 'unassigned'
    const list = karkunsByRukn.get(bucket) ?? []
    list.push(row)
    karkunsByRukn.set(bucket, list)
  }

  for (const [, list] of karkunsByRukn) {
    list.sort((a, b) => a.karkunName.localeCompare(b.karkunName))
  }

  const ruknDetails: WeeklyIjtemaRuknDetailSection[] = ruknRows
    .map((row) => ({
      ruknId: row.ruknId,
      ruknName: row.ruknName,
      connected: row.assigned,
      reminded: row.remindedTotal,
      present: row.present,
      absent: row.absent,
      attendancePct: row.attendancePct,
      karkuns: karkunsByRukn.get(row.ruknId) ?? [],
    }))
    .sort((a, b) => a.ruknName.localeCompare(b.ruknName))

  const submitted: WeeklyIjtemaReportSubmissionRow[] = ruknRows
    .filter((row) => row.submitted)
    .map((row) => ({
      ruknName: row.ruknName,
      connected: row.assigned,
      reminded: row.remindedTotal,
      present: row.present,
      absent: row.absent,
    }))
    .sort((a, b) => a.ruknName.localeCompare(b.ruknName))

  const pendingNames = ruknRows
    .filter((row) => !row.submitted)
    .map((row) => row.ruknName)
    .sort((a, b) => a.localeCompare(b))

  const followUp: WeeklyIjtemaFollowUpGroup[] = ruknDetails
    .map((section) => ({
      ruknName: section.ruknName,
      remindedOnly: section.karkuns
        .filter((k) => k.disposition === 'reminded')
        .map((k) => k.karkunName),
      absent: section.karkuns.filter((k) => k.disposition === 'absent').map((k) => k.karkunName),
    }))
    .filter((group) => group.remindedOnly.length > 0 || group.absent.length > 0)

  const followUpCount = followUp.reduce(
    (sum, group) => sum + group.remindedOnly.length + group.absent.length,
    0,
  )

  const meetingIso = kpi.meetingDate || campaign.cover.generatedDate
  const reportingDate = meetingIso || new Date().toISOString().slice(0, 10)
  const attendanceWindow = hasEvent
    ? `${kpi.title ?? 'Weekly Ijtema'} · ${kpi.meetingDate ?? '—'} · ${kpi.eventStatus ?? '—'}`
    : language === 'ur'
      ? 'کوئی فعال تقریب نہیں'
      : 'No active event'

  const reportTitle =
    language === 'ur' ? 'ہفتہ وار اجتماع کی جائزہ رپورٹ' : 'Weekly Ijtema Executive Review Report'

  const executiveObservation = buildExecutiveObservation({
    language,
    reminded,
    present,
    absent,
    attendancePct: overallPct,
    reportsPending,
    followUpCount,
  })

  const definitions =
    language === 'ur'
      ? [
          'یاد دہانی — اس ہفتے کے اجتماع کے لیے رکن نے کارکن سے رابطہ کیا۔',
          'اجتماع میں شریک — حاضری درج ہے۔',
          'اجتماع میں شریک نہ ہوسکے — غیر حاضری درج ہے۔',
          'شرکت کی شرح — شرکت ÷ یاد دہانی (کل)۔',
          'رپورٹ جمع — رکن نے اس ہفتے کی رپورٹ جمع کر دی۔',
        ]
      : [
          'Reminded — Rukn contacted the Karkun for this week’s Ijtema.',
          'Attended — present mark recorded.',
          'Could not attend — absent mark recorded.',
          'Attendance rate — Present ÷ Reminded (total).',
          'Report submitted — Rukn submitted this week’s report.',
        ]

  const futureAnalyticsPlaceholders =
    language === 'ur'
      ? [
          'ہفتہ وار حاضری کا رجحان',
          'یاد دہانی کا رجحان',
          'یاد دہانی بمقابلہ شرکت',
          'ماہانہ موازنہ',
          'مہم کی پیش رفت',
        ]
      : [
          'Weekly Attendance Trend',
          'Reminder Trend',
          'Reminder vs Attendance Trend',
          'Monthly Comparison',
          'Campaign Progress Trend',
        ]

  return {
    kind: WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND,
    language,
    detailLevel: ctx.config.detailLevel,
    cover: {
      reportTitle,
      campaignName: campaign.cover.campaignName,
      campaignUrdu: 'فعال رکن، فعال کارکن، فعال جماعت',
      meetingDateGregorian: formatGregorianDate(meetingIso, language),
      meetingDateHijri: formatHijriDate(meetingIso, language),
      reportingDate,
      attendanceWindow,
      generatedOn: campaign.cover.generatedOn,
      generatedBy: ctx.config.generatedBy?.trim() || dash(language),
    },
    executiveSummary: {
      totalConnectedKarkuns: connections.connected,
      reminded,
      present,
      absent,
      reportsSubmitted,
      reportsPending,
      attendancePct: overallPct,
    },
    executiveObservation,
    comparisonGraph: {
      reminded,
      present,
      attendancePct: overallPct,
    },
    reportSubmission: {
      submitted,
      pendingNames,
    },
    ruknDetails,
    followUp,
    futureAnalyticsPlaceholders,
    appendix: {
      definitions,
      generatedTimestamp: `${campaign.cover.generatedDate} ${campaign.cover.generatedTime}`,
      reportVersion: WEEKLY_IJTEMA_ATTENDANCE_REPORT_VERSION,
      providerVersion: 'KC-033',
      composerVersion: 'KC-037A',
      systemVersion: APP_VERSION,
      campaign: campaign.cover.campaignName,
    },
  }
}

export function isWeeklyIjtemaAttendanceReportModel(
  value: unknown,
): value is WeeklyIjtemaAttendanceReportModel {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as WeeklyIjtemaAttendanceReportModel).kind === WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND
  )
}

/** @deprecated KC-038C — ranking removed; kept for legacy test imports. */
export type WeeklyIjtemaRuknPerformanceRow = {
  rank: number
  ruknId: string
  ruknName: string
  connected: number
  present: number
  absent: number
  pending: number
  attendancePct: number
  highlight: null
}

/** @deprecated KC-038C */
export type WeeklyIjtemaRegisterRow = {
  karkunId: string
  karkunName: string
  ruknId: string
  ruknName: string
  attendance: string
  markedBy: string
  submissionTime: string
}

/** @deprecated KC-038C */
export type WeeklyIjtemaAbsentRow = {
  karkunId: string
  karkunName: string
  ruknName: string
  assignedRuknName: string
  followUpRequired: string
}

/** @deprecated KC-038C */
export type WeeklyIjtemaAttendanceStatusLabel = 'Present' | 'Absent' | 'Pending'
