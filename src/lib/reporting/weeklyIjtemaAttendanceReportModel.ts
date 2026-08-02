/**
 * KC-037C4 — Weekly Ijtema Attendance Report presentation model.
 * Assembles cover → executive summary → overview → Rukn performance → registers
 * → analytics → insights → recommendations → appendix from KC-033 providers
 * + CampaignReportModel. No alternate KPI math. No Firestore. No Composer changes.
 *
 * Product brief labeled this “KC-037C2”; repository id is KC-037C4
 * (KC-037C2 = Individual Rukn Performance Report).
 */

import { APP_VERSION } from '@/constants/app'
import { ruknMaster } from '@/data/ruknMaster'
import { getAllKarkuns } from '@/lib/peopleStore'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { CampaignReportMetricPair, CampaignReportRuknRow } from './campaignReportModel'
import type { ReportContext } from './v2/types'
import { campaignModelFromContext } from './v2/sections/campaignModelAccess'

export const WEEKLY_IJTEMA_ATTENDANCE_SECTION_ID = 'weekly_ijtema_attendance' as const
export const WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND = 'weekly_ijtema_attendance_report_v1' as const
export const WEEKLY_IJTEMA_ATTENDANCE_REPORT_VERSION = 'KC-037C4'

/** Operational excellence threshold for insights (presentation heuristic, not a KPI formula). */
const ATTENDANCE_EXCELLENCE_PCT = 90
/** Operational follow-up threshold (aligned with provider-insight severity bands). */
const ATTENDANCE_TARGET_PCT = 70

export type WeeklyIjtemaAttendanceStatusLabel = 'Present' | 'Absent' | 'Pending'

export type WeeklyIjtemaRuknPerformanceRow = {
  rank: number
  ruknId: string
  ruknName: string
  connected: number
  present: number
  absent: number
  pending: number
  attendancePct: number
  highlight: 'top5' | 'bottom5' | null
}

export type WeeklyIjtemaRegisterRow = {
  karkunId: string
  karkunName: string
  ruknId: string
  ruknName: string
  attendance: WeeklyIjtemaAttendanceStatusLabel
  markedBy: string
  submissionTime: string
}

export type WeeklyIjtemaAbsentRow = {
  karkunId: string
  karkunName: string
  ruknName: string
  assignedRuknName: string
  followUpRequired: string
}

export type WeeklyIjtemaAttendanceReportModel = {
  kind: typeof WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND
  language: 'ur' | 'en'
  detailLevel: string
  cover: {
    reportTitle: string
    campaignName: string
    campaignUrdu: string
    reportingDate: string
    attendanceWindow: string
    generatedOn: string
    generatedBy: string
  }
  executiveSummary: {
    totalConnectedKarkuns: number
    present: number
    absent: number
    pending: number
    overallAttendancePct: number
    maleAttendancePct: number
    femaleAttendancePct: number
    narrative: string
  }
  attendanceOverview: {
    present: number
    absent: number
    pending: number
    attendancePct: number
  }
  ruknPerformance: WeeklyIjtemaRuknPerformanceRow[]
  attendanceRegister: WeeklyIjtemaRegisterRow[]
  absentRegister: WeeklyIjtemaAbsentRow[]
  analytics: {
    bestPerformingRukn: string
    lowestPerformingRukn: string
    highestAttendancePct: number
    lowestAttendancePct: number
    overallAttendancePct: number
    maleAttendancePct: number
    femaleAttendancePct: number
    maleFemaleComparison: string
  }
  operationalInsights: string[]
  operationalRecommendations: string[]
  appendix: {
    attendanceByRukn: Array<{
      ruknName: string
      connected: number
      present: number
      absent: number
      pending: number
      attendancePct: number
    }>
    overallTotals: {
      connected: number
      present: number
      absent: number
      pending: number
      attendancePct: number
    }
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

function sumPair(rows: CampaignReportRuknRow[], key: 'weeklyIjtema'): CampaignReportMetricPair {
  let completed = 0
  let total = 0
  let pending = 0
  for (const row of rows) {
    const m = row[key]
    completed += m.completed
    total += m.total
    pending += m.pending
  }
  return {
    completed,
    total,
    pending,
    pct: pctOf(completed, total),
  }
}

function formatSubmissionTime(iso: string | undefined, language: 'ur' | 'en'): string {
  if (!iso?.trim()) return dash(language)
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(language === 'ur' ? 'ur-PK' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(
  status: string,
  language: 'ur' | 'en',
): WeeklyIjtemaAttendanceStatusLabel {
  if (status === 'Present') return 'Present'
  if (status === 'Absent') return 'Absent'
  return 'Pending'
}

function buildNarrative(
  language: 'ur' | 'en',
  overallPct: number,
  present: number,
  absent: number,
  pending: number,
  connected: number,
): string {
  if (language === 'ur') {
    if (connected === 0 && present + absent + pending === 0) {
      return 'اس ہفتے کے لیے اجتماع کی حاضری کا ڈیٹا دستیاب نہیں — رپورٹ خالی حالت میں ہے۔'
    }
    if (overallPct >= ATTENDANCE_EXCELLENCE_PCT) {
      return `مجموعی حاضری ${overallPct}٪ ہے — حاضر ${present}، غیر حاضر ${absent}، زیر التواء ${pending}۔ کارکردگی بہترین سطح پر ہے۔`
    }
    if (overallPct >= ATTENDANCE_TARGET_PCT) {
      return `مجموعی حاضری ${overallPct}٪ ہے — حاضر ${present}، غیر حاضر ${absent}، زیر التواء ${pending}۔ آپریشنل ہدف کے قریب؛ فالو اپ جاری رکھیں۔`
    }
    return `مجموعی حاضری ${overallPct}٪ ہے — حاضر ${present}، غیر حاضر ${absent}، زیر التواء ${pending}۔ فوری آپریشنل فالو اپ درکار ہے۔`
  }
  if (connected === 0 && present + absent + pending === 0) {
    return 'No Weekly Ijtema attendance data is available for this reporting window — empty state.'
  }
  if (overallPct >= ATTENDANCE_EXCELLENCE_PCT) {
    return `Overall attendance is ${overallPct}% — Present ${present}, Absent ${absent}, Pending ${pending}. Performance is at excellence level.`
  }
  if (overallPct >= ATTENDANCE_TARGET_PCT) {
    return `Overall attendance is ${overallPct}% — Present ${present}, Absent ${absent}, Pending ${pending}. Near operational target; continue follow-up.`
  }
  return `Overall attendance is ${overallPct}% — Present ${present}, Absent ${absent}, Pending ${pending}. Immediate operational follow-up is required.`
}

function buildInsights(input: {
  language: 'ur' | 'en'
  overallPct: number
  absent: number
  pending: number
  lowRuknCount: number
  malePct: number
  femalePct: number
  hasEvent: boolean
}): string[] {
  const { language: lang, overallPct, absent, pending, lowRuknCount, malePct, femalePct, hasEvent } =
    input
  const lines: string[] = []
  const ur = lang === 'ur'

  if (!hasEvent) {
    lines.push(
      ur
        ? 'فعال ہفتہ وار اجتماع کی تقریب نہیں ملی — حاضری کا سنیپ شاٹ دستیاب نہیں۔'
        : 'No active Weekly Ijtema event — attendance snapshot unavailable.',
    )
    return lines
  }

  if (overallPct >= ATTENDANCE_EXCELLENCE_PCT) {
    lines.push(
      ur
        ? `حاضری ${ATTENDANCE_EXCELLENCE_PCT}٪ سے تجاوز کر گئی۔`
        : `Attendance exceeded ${ATTENDANCE_EXCELLENCE_PCT}%.`,
    )
  } else if (overallPct < ATTENDANCE_TARGET_PCT) {
    lines.push(
      ur
        ? 'حاضری مہم کے آپریشنل ہدف سے کم ہے۔'
        : 'Attendance below campaign operational target.',
    )
  }

  if (lowRuknCount > 0) {
    lines.push(
      ur
        ? `${lowRuknCount} ارکان کو فوری فالو اپ درکار ہے۔`
        : `${lowRuknCount} Rukn${lowRuknCount === 1 ? '' : 's'} require immediate follow-up.`,
    )
  }

  if (femalePct > malePct && (malePct > 0 || femalePct > 0)) {
    lines.push(
      ur
        ? 'خواتین کی حاضری مردوں کی حاضری سے زیادہ ہے۔'
        : 'Female attendance exceeded Male attendance.',
    )
  } else if (malePct > femalePct && (malePct > 0 || femalePct > 0)) {
    lines.push(
      ur
        ? 'مردوں کی حاضری خواتین کی حاضری سے زیادہ ہے۔'
        : 'Male attendance exceeded Female attendance.',
    )
  }

  if (absent > 0) {
    lines.push(
      ur
        ? `${absent} کارکنان غیر حاضر — فالو اپ فہرست تیار ہے۔`
        : `${absent} Karkuns absent — follow-up register is ready.`,
    )
  }

  if (pending > 0) {
    lines.push(
      ur
        ? `${pending} حاضری اندراجات زیر التواء ہیں۔`
        : `${pending} attendance submissions remain pending.`,
    )
  }

  lines.push(
    ur
      ? 'گزشتہ ہفتے سے موازنہ: سنیپ شاٹ فقط (تاریخی ڈیٹا دستیاب نہیں)۔'
      : 'Week-over-week comparison: snapshot only (historical series not available).',
  )

  return lines.slice(0, 8)
}

function buildRecommendations(input: {
  language: 'ur' | 'en'
  overallPct: number
  absent: number
  pending: number
  lowRuknNames: string[]
  hasEvent: boolean
}): string[] {
  const { language: lang, overallPct, absent, pending, lowRuknNames, hasEvent } = input
  const ur = lang === 'ur'
  const lines: string[] = []

  if (!hasEvent) {
    lines.push(
      ur
        ? 'ہفتہ وار اجتماع کی تقریب کھولیں تاکہ حاضری ریکارڈ ہو سکے۔'
        : 'Open a Weekly Ijtema event so attendance can be recorded.',
    )
    return lines
  }

  if (absent > 0) {
    lines.push(
      ur
        ? 'تمام غیر حاضر کارکنان سے 24 گھنٹوں کے اندر رابطہ کیجیے۔'
        : 'Follow up with all absent Karkuns within 24 hours.',
    )
  }

  if (lowRuknNames.length > 0) {
    const names = lowRuknNames.slice(0, 3).join(ur ? '، ' : ', ')
    lines.push(
      ur
        ? `ان ارکان سے رابطہ کیجیے جن کی حاضری ہدف سے کم ہے: ${names}۔`
        : `Contact Rukns with attendance below campaign target: ${names}.`,
    )
  }

  if (pending > 0) {
    lines.push(
      ur
        ? 'زیر التواء حاضری اندراجات کا جائزہ لے کر مکمل کیجیے۔'
        : 'Review pending attendance submissions and close them.',
    )
  }

  if (overallPct < ATTENDANCE_TARGET_PCT) {
    lines.push(
      ur
        ? 'اگلے ہفتہ وار اجتماع سے پہلے دعوتیں مکمل کرنے کی تاکید کیجیے۔'
        : 'Encourage invitation completion before the next Weekly Ijtema.',
    )
  }

  if (lines.length === 0) {
    lines.push(
      ur
        ? 'حاضری مضبوط ہے — موجودہ آپریشنل رفتار برقرار رکھیے۔'
        : 'Attendance is strong — maintain current operational pace.',
    )
  }

  return lines.slice(0, 6)
}

/**
 * Build Weekly Ijtema Attendance presentation model from Composer context.
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

  const present = health.current ?? kpi.present
  const totalAssigned = health.total ?? kpi.totalAssigned
  const absent = kpi.absent
  const pending = Math.max(0, totalAssigned - present - absent)
  const overallPct = health.pct ?? pctOf(present, totalAssigned)
  const hasEvent = Boolean(kpi.eventId)

  const malePair = sumPair(campaign.maleRukns, 'weeklyIjtema')
  const femalePair = sumPair(campaign.femaleRukns, 'weeklyIjtema')
  const malePct = malePair.pct
  const femalePct = femalePair.pct

  const ruknNameById = new Map(ruknMaster.map((r) => [r.id, r.name]))
  const peopleById = new Map(getAllKarkuns().map((k) => [k.id, k]))

  // Rank by attendance % (highest → lowest); tie-break by present then name.
  const rankedSource = [...ruknRows].sort((a, b) => {
    if (b.attendancePct !== a.attendancePct) return b.attendancePct - a.attendancePct
    if (b.present !== a.present) return b.present - a.present
    return a.ruknName.localeCompare(b.ruknName)
  })

  const ranked: WeeklyIjtemaRuknPerformanceRow[] = rankedSource.map((row, index) => {
    const pendingRow = Math.max(0, row.assigned - row.present - row.absent)
    const campaignRow = campaign.allRukns.find((r) => r.ruknId === row.ruknId)
    return {
      rank: index + 1,
      ruknId: row.ruknId,
      ruknName: row.ruknName,
      connected: campaignRow?.connections.completed ?? row.assigned,
      present: row.present,
      absent: row.absent,
      pending: pendingRow,
      attendancePct: row.attendancePct,
      highlight: null,
    }
  })

  const withAssigned = ranked.filter((r) => r.present + r.absent + r.pending > 0)
  const topIds = new Set(withAssigned.slice(0, 5).map((r) => r.ruknId))
  const bottomIds = new Set(withAssigned.slice(-5).map((r) => r.ruknId))
  for (const row of ranked) {
    if (topIds.has(row.ruknId) && bottomIds.has(row.ruknId) && withAssigned.length <= 5) {
      row.highlight = 'top5'
    } else if (topIds.has(row.ruknId)) {
      row.highlight = 'top5'
    } else if (bottomIds.has(row.ruknId)) {
      row.highlight = 'bottom5'
    }
  }

  const assignedRuknIds = new Set(ruknRows.map((r) => r.ruknId))
  const registerRows: WeeklyIjtemaRegisterRow[] = []

  for (const summary of summaries) {
    const assignment = getActiveAssignmentsForKarkun(summary.karkunId)[0]
    const assignedRuknId = assignment?.ruknId?.trim() || summary.ruknId || ''
    if (assignedRuknIds.size > 0 && assignedRuknId && !assignedRuknIds.has(assignedRuknId)) {
      // Limit register to karkuns under Rukns in the active WI report set.
      continue
    }
    if (assignedRuknIds.size > 0 && !assignedRuknId) continue

    const person = peopleById.get(summary.karkunId)
    const markRuknId = summary.ruknId || assignedRuknId
    const ruknName =
      ruknNameById.get(markRuknId) ||
      person?.assignedRukn ||
      dash(language)
    const attendance = statusLabel(summary.status, language)
    const markedBy =
      attendance === 'Pending'
        ? dash(language)
        : summary.updatedBy?.trim() ||
          ruknNameById.get(summary.ruknId ?? '') ||
          ruknName
    const submissionTime =
      attendance === 'Pending'
        ? dash(language)
        : formatSubmissionTime(summary.updatedAt, language)

    registerRows.push({
      karkunId: summary.karkunId,
      karkunName: summary.karkunName || person?.name || summary.karkunId,
      ruknId: markRuknId || assignedRuknId,
      ruknName,
      attendance,
      markedBy,
      submissionTime,
    })
  }

  // Group by Rukn name for register readability.
  registerRows.sort((a, b) => {
    const byRukn = a.ruknName.localeCompare(b.ruknName)
    if (byRukn !== 0) return byRukn
    return a.karkunName.localeCompare(b.karkunName)
  })

  const absentRegister: WeeklyIjtemaAbsentRow[] = registerRows
    .filter((r) => r.attendance === 'Absent')
    .map((r) => {
      const assignment = getActiveAssignmentsForKarkun(r.karkunId)[0]
      const assignedName =
        ruknNameById.get(assignment?.ruknId ?? '') ||
        peopleById.get(r.karkunId)?.assignedRukn ||
        r.ruknName
      return {
        karkunId: r.karkunId,
        karkunName: r.karkunName,
        ruknName: r.ruknName,
        assignedRuknName: assignedName,
        followUpRequired: language === 'ur' ? 'ہاں — 24 گھنٹے' : 'Yes — within 24h',
      }
    })

  const scored = ranked.filter((r) => r.present + r.absent + r.pending > 0)
  const best = scored[0]
  const worst = scored[scored.length - 1]
  const lowRukns = scored.filter((r) => r.attendancePct < ATTENDANCE_TARGET_PCT)
  const lowRuknNames = lowRukns.map((r) => r.ruknName)

  const maleFemaleComparison =
    language === 'ur'
      ? `مرد ${malePct}٪ · خواتین ${femalePct}٪`
      : `Male ${malePct}% · Female ${femalePct}%`

  const reportingDate =
    kpi.meetingDate ||
    campaign.cover.generatedDate ||
    new Date().toISOString().slice(0, 10)
  const attendanceWindow = hasEvent
    ? `${kpi.title ?? 'Weekly Ijtema'} · ${kpi.meetingDate ?? '—'} · ${kpi.eventStatus ?? '—'}`
    : language === 'ur'
      ? 'کوئی فعال تقریب نہیں'
      : 'No active event'

  const reportTitle =
    language === 'ur' ? 'ہفتہ وار اجتماع حاضری رپورٹ' : 'Weekly Ijtema Attendance Report'

  const narrative = buildNarrative(
    language,
    overallPct,
    present,
    absent,
    pending,
    connections.connected,
  )

  const insights = buildInsights({
    language,
    overallPct,
    absent,
    pending,
    lowRuknCount: lowRukns.length,
    malePct,
    femalePct,
    hasEvent,
  })

  const recommendations = buildRecommendations({
    language,
    overallPct,
    absent,
    pending,
    lowRuknNames,
    hasEvent,
  })

  const definitions =
    language === 'ur'
      ? [
          'حاضر — اجتماع میں شرکت درج ہے۔',
          'غیر حاضر — اجتماع میں غیر حاضری درج ہے۔',
          'زیر التواء — مخصوص کارکن کی حاضری ابھی درج نہیں۔',
          'حاضری ٪ — حاضر ÷ مخصوص (Campaign Health / KC-033)۔',
        ]
      : [
          'Present — marked present for the Weekly Ijtema event.',
          'Absent — marked absent for the Weekly Ijtema event.',
          'Pending — assigned Karkun not yet marked.',
          'Attendance % — Present ÷ Assigned (Campaign Health / KC-033).',
        ]

  return {
    kind: WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND,
    language,
    detailLevel: ctx.config.detailLevel,
    cover: {
      reportTitle,
      campaignName: campaign.cover.campaignName,
      campaignUrdu: 'فعال کارکن، فعال جماعت',
      reportingDate,
      attendanceWindow,
      generatedOn: campaign.cover.generatedOn,
      generatedBy: ctx.config.generatedBy?.trim() || dash(language),
    },
    executiveSummary: {
      totalConnectedKarkuns: connections.connected,
      present,
      absent,
      pending,
      overallAttendancePct: overallPct,
      maleAttendancePct: malePct,
      femaleAttendancePct: femalePct,
      narrative,
    },
    attendanceOverview: {
      present,
      absent,
      pending,
      attendancePct: overallPct,
    },
    ruknPerformance: ranked,
    attendanceRegister: registerRows,
    absentRegister,
    analytics: {
      bestPerformingRukn: best?.ruknName ?? dash(language),
      lowestPerformingRukn: worst?.ruknName ?? dash(language),
      highestAttendancePct: best?.attendancePct ?? 0,
      lowestAttendancePct: worst?.attendancePct ?? 0,
      overallAttendancePct: overallPct,
      maleAttendancePct: malePct,
      femaleAttendancePct: femalePct,
      maleFemaleComparison,
    },
    operationalInsights: insights,
    operationalRecommendations: recommendations,
    appendix: {
      attendanceByRukn: ranked.map((r) => ({
        ruknName: r.ruknName,
        connected: r.connected,
        present: r.present,
        absent: r.absent,
        pending: r.pending,
        attendancePct: r.attendancePct,
      })),
      overallTotals: {
        connected: connections.connected,
        present,
        absent,
        pending,
        attendancePct: overallPct,
      },
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
