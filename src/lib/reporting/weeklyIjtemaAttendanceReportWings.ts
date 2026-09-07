/**
 * Gender-scoped Weekly Ijtema Attendance extras derived from existing events/submissions.
 * Does not write data or invent a second attendance store.
 */

import { getRuknById } from '@/data/ruknMaster'
import { getConnectedKarkunsForRukn } from '@/lib/connections/getConnectedKarkunsForRukn'
import { resolveOfficerKind, type OfficerKind } from '@/lib/officerIdentity'
import { uniqueWeeklyIjtemaMeetingsForDisplay } from '@/lib/weeklyIjtemaPresentation'
import type { WeeklyIjtemaAudienceGender } from '@/lib/weeklyIjtema/attendanceWindowSchedule'
import { getWeeklyIjtemaReport } from '@/services/weeklyIjtemaService'
import { getAllWeeklyIjtemaEvents, getWeeklyIjtemaSubmissionsForEvent } from '@/stores/weeklyIjtemaStore'
import type { PersonGender } from '@/types/people.types'
import type { WeeklyIjtemaEvent } from '@/types/weeklyIjtema'
import type { ReportScope } from './v2/types'

export const WEEKLY_IJTEMA_EXPORT_KINDS = ['male_rukn', 'male_a_rukn', 'women'] as const
export type WeeklyIjtemaExportKind = (typeof WEEKLY_IJTEMA_EXPORT_KINDS)[number]
export type WeeklyIjtemaPaletteId = 'emerald' | 'navy' | 'plum'

export type OfficerExportIdentity = {
  id: string
  gender?: PersonGender
  officerKind?: OfficerKind
}

export type WeeklyIjtemaWeekSnapshot = {
  eventId: string
  meetingDate: string
  title: string
  present: number
  absent: number
  remindedTotal: number
  attendancePct: number
  reportsSubmitted: number
  reportsPending: number
  totalAssigned: number
}

export type WeeklyIjtemaPerformanceRow = {
  ruknId: string
  ruknName: string
  officerKind: OfficerKind
  connected: number
  reminded: number
  present: number
  absent: number
  attendancePct: number
  submitted: boolean
}

export type ConnectedMissedThreeRow = {
  ruknId: string
  ruknName: string
  karkunId: string
  karkunName: string
}

export type NonSubmittingRuknRow = {
  ruknId: string
  ruknName: string
}

export function resolveWeeklyIjtemaReportGenders(scope: ReportScope): WeeklyIjtemaAudienceGender[] {
  if (scope === 'mens_wing') return ['Male']
  if (scope === 'womens_wing') return ['Female']
  return ['Male', 'Female']
}

export function audienceGenderForWeeklyIjtemaExport(
  kind: WeeklyIjtemaExportKind,
): WeeklyIjtemaAudienceGender {
  return kind === 'women' ? 'Female' : 'Male'
}

/**
 * Population: Male Rukn / male عازم رکن use officer `gender` + `officerKind`.
 * Women uses Female officers of both kinds. Unknown gender is excluded (not guessed).
 */
export function officerMatchesWeeklyIjtemaExport(
  officer: OfficerExportIdentity,
  kind: WeeklyIjtemaExportKind,
): boolean {
  const gender = officer.gender
  if (gender !== 'Male' && gender !== 'Female') return false
  const officerKind = resolveOfficerKind({ id: officer.id, officerKind: officer.officerKind })
  if (kind === 'male_rukn') return gender === 'Male' && officerKind === 'rukn'
  if (kind === 'male_a_rukn') return gender === 'Male' && officerKind === 'a_rukn'
  return gender === 'Female'
}

export function officerMatchesWeeklyIjtemaExportId(
  ruknId: string,
  kind: WeeklyIjtemaExportKind,
): boolean {
  const officer = getRuknById(ruknId)
  if (!officer) return false
  return officerMatchesWeeklyIjtemaExport(
    { id: officer.id, gender: officer.gender, officerKind: officer.officerKind },
    kind,
  )
}

export function filterRowsForWeeklyIjtemaExport<T extends { ruknId: string }>(
  rows: T[],
  kind: WeeklyIjtemaExportKind,
): T[] {
  return rows.filter((row) => officerMatchesWeeklyIjtemaExportId(row.ruknId, kind))
}

export function weeklyIjtemaExportMeta(
  kind: WeeklyIjtemaExportKind,
  language: 'ur' | 'en',
): {
  kind: WeeklyIjtemaExportKind
  palette: WeeklyIjtemaPaletteId
  fileSlug: string
  showRuknPerformance: boolean
  showAazimPerformance: boolean
  reportTitle: string
  label: string
} {
  if (kind === 'male_rukn') {
    return {
      kind,
      palette: 'emerald',
      fileSlug: 'Rukn',
      showRuknPerformance: true,
      showAazimPerformance: false,
      reportTitle:
        language === 'ur'
          ? 'ہفتہ وار اجتماع کی جائزہ رپورٹ — رکن'
          : 'Weekly Ijtema Attendance Report — Rukn',
      label: language === 'ur' ? 'رکن' : 'Rukn',
    }
  }
  if (kind === 'male_a_rukn') {
    return {
      kind,
      palette: 'navy',
      fileSlug: 'Aazim_Rukn',
      showRuknPerformance: false,
      showAazimPerformance: true,
      reportTitle:
        language === 'ur'
          ? 'ہفتہ وار اجتماع کی جائزہ رپورٹ — عازم رکن'
          : 'Weekly Ijtema Attendance Report — Aazim Rukn',
      label: language === 'ur' ? 'عازم رکن' : 'Aazim Rukn',
    }
  }
  return {
    kind,
    palette: 'plum',
    fileSlug: 'Women',
    showRuknPerformance: true,
    showAazimPerformance: true,
    reportTitle:
      language === 'ur'
        ? 'ہفتہ وار اجتماع کی جائزہ رپورٹ — زنانہ'
        : 'Weekly Ijtema Attendance Report — Women',
    label: language === 'ur' ? 'زنانہ' : 'Women',
  }
}

export function listCanonicalIjtemaMeetingsForAudience(
  gender: WeeklyIjtemaAudienceGender,
): WeeklyIjtemaEvent[] {
  const unique = uniqueWeeklyIjtemaMeetingsForDisplay(getAllWeeklyIjtemaEvents())
  const gendered = unique.filter((event) => event.audienceGender === gender)
  const pool = gendered.length > 0 ? gendered : unique.filter((event) => !event.audienceGender)
  return [...pool].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
}

export function snapshotFromRuknRows(
  event: WeeklyIjtemaEvent,
  rows: Array<{
    assigned: number
    remindedTotal: number
    present: number
    absent: number
    submitted: boolean
  }>,
): WeeklyIjtemaWeekSnapshot {
  const present = rows.reduce((sum, row) => sum + row.present, 0)
  const absent = rows.reduce((sum, row) => sum + row.absent, 0)
  const remindedTotal = rows.reduce((sum, row) => sum + row.remindedTotal, 0)
  const reportsSubmitted = rows.filter((row) => row.submitted).length
  const reportsPending = rows.filter((row) => !row.submitted).length
  const totalAssigned = rows.reduce((sum, row) => sum + row.assigned, 0)
  return {
    eventId: event.id,
    meetingDate: event.meetingDate,
    title: event.title,
    present,
    absent,
    remindedTotal,
    attendancePct: remindedTotal === 0 ? 0 : Math.round((present / remindedTotal) * 100),
    reportsSubmitted,
    reportsPending,
    totalAssigned,
  }
}

export function snapshotFromEvent(
  event: WeeklyIjtemaEvent,
  kind?: WeeklyIjtemaExportKind,
): WeeklyIjtemaWeekSnapshot | null {
  const report = getWeeklyIjtemaReport(event.id)
  if (!report) return null
  const rows = kind ? filterRowsForWeeklyIjtemaExport(report.ruknRows, kind) : report.ruknRows
  return snapshotFromRuknRows(event, rows)
}

export function buildWeekOverWeekHighlights(input: {
  language: 'ur' | 'en'
  current: WeeklyIjtemaWeekSnapshot | null
  previous: WeeklyIjtemaWeekSnapshot | null
}): string[] {
  const { language, current, previous } = input
  if (!current) {
    return [
      language === 'ur'
        ? 'اس صنف کے لیے کوئی موجودہ اجتماع نہیں ملا۔'
        : 'No current Weekly Ijtema meeting was found for this audience.',
    ]
  }
  if (!previous) {
    return [
      language === 'ur'
        ? 'گزشتہ ہفتے کا اجتماع دستیاب نہیں — موازنہ بعد میں دکھایا جائے گا۔'
        : 'No previous-week meeting is available yet — comparison will appear once a prior Ijtema exists.',
    ]
  }

  const presentDelta = current.present - previous.present
  const pctDelta = current.attendancePct - previous.attendancePct
  const submittedDelta = current.reportsSubmitted - previous.reportsSubmitted
  const lines: string[] = []

  if (language === 'ur') {
    lines.push(
      `موجودہ ہفتہ ${current.meetingDate} · گزشتہ ہفتہ ${previous.meetingDate}`,
    )
    lines.push(
      presentDelta === 0
        ? `شرکت گزشتہ ہفتے جتنی رہی (${current.present})۔`
        : presentDelta > 0
          ? `شرکت گزشتہ ہفتے سے ${presentDelta} زیادہ ہے (${previous.present} سے ${current.present})۔`
          : `شرکت گزشتہ ہفتے سے ${Math.abs(presentDelta)} کم ہے (${previous.present} سے ${current.present})۔`,
    )
    lines.push(
      pctDelta === 0
        ? `شرکت کی شرح ${current.attendancePct}٪ پر برقرار رہی۔`
        : pctDelta > 0
          ? `شرکت کی شرح ${pctDelta} پوائنٹ بڑھ کر ${current.attendancePct}٪ ہوگئی۔`
          : `شرکت کی شرح ${Math.abs(pctDelta)} پوائنٹ کم ہوکر ${current.attendancePct}٪ رہی۔`,
    )
    lines.push(
      submittedDelta === 0
        ? `رپورٹ جمع کرنے والے ارکان ${current.reportsSubmitted} رہے۔`
        : submittedDelta > 0
          ? `رپورٹ جمع ${submittedDelta} ارکان بڑھ کر ${current.reportsSubmitted} ہوگئی۔`
          : `رپورٹ جمع ${Math.abs(submittedDelta)} ارکان کم ہوکر ${current.reportsSubmitted} رہی۔`,
    )
    return lines
  }

  lines.push(`Current week ${current.meetingDate} · previous week ${previous.meetingDate}`)
  lines.push(
    presentDelta === 0
      ? `Attendance held at ${current.present} (same as last week).`
      : presentDelta > 0
        ? `Attendance rose by ${presentDelta} (${previous.present} → ${current.present}).`
        : `Attendance fell by ${Math.abs(presentDelta)} (${previous.present} → ${current.present}).`,
  )
  lines.push(
    pctDelta === 0
      ? `Attendance rate held at ${current.attendancePct}%.`
      : pctDelta > 0
        ? `Attendance rate rose ${pctDelta} points to ${current.attendancePct}%.`
        : `Attendance rate fell ${Math.abs(pctDelta)} points to ${current.attendancePct}%.`,
  )
  lines.push(
    submittedDelta === 0
      ? `Rukn reports submitted held at ${current.reportsSubmitted}.`
      : submittedDelta > 0
        ? `Rukn reports submitted rose by ${submittedDelta} to ${current.reportsSubmitted}.`
        : `Rukn reports submitted fell by ${Math.abs(submittedDelta)} to ${current.reportsSubmitted}.`,
  )
  return lines
}

export function splitPerformanceRows(
  rows: WeeklyIjtemaPerformanceRow[],
): { rukn: WeeklyIjtemaPerformanceRow[]; aazim: WeeklyIjtemaPerformanceRow[] } {
  const rukn = rows.filter((row) => row.officerKind === 'rukn')
  const aazim = rows.filter((row) => row.officerKind === 'a_rukn')
  const byName = (a: WeeklyIjtemaPerformanceRow, b: WeeklyIjtemaPerformanceRow) =>
    a.ruknName.localeCompare(b.ruknName)
  return { rukn: [...rukn].sort(byName), aazim: [...aazim].sort(byName) }
}

function officerKindForRuknId(ruknId: string): OfficerKind {
  const officer = getRuknById(ruknId)
  return resolveOfficerKind({ id: ruknId, officerKind: officer?.officerKind })
}

export function performanceRowsFromReport(eventId: string): WeeklyIjtemaPerformanceRow[] {
  const report = getWeeklyIjtemaReport(eventId)
  if (!report) return []
  return report.ruknRows.map((row) => ({
    ruknId: row.ruknId,
    ruknName: row.ruknName,
    officerKind: officerKindForRuknId(row.ruknId),
    connected: row.assigned,
    reminded: row.remindedTotal,
    present: row.present,
    absent: row.absent,
    attendancePct: row.attendancePct,
    submitted: row.submitted,
  }))
}

function karkunPresentOnEvent(eventId: string, karkunId: string): boolean {
  for (const submission of getWeeklyIjtemaSubmissionsForEvent(eventId)) {
    for (const mark of submission.marks) {
      if (mark.karkunId === karkunId && mark.status === 'Present') return true
    }
  }
  return false
}

/** Connected Karkuns with no Present mark on any of the last 3 consecutive meetings. */
export function buildMissedThreeConnectedKarkuns(
  meetingsNewestFirst: WeeklyIjtemaEvent[],
  rosterRuknIds: string[],
): ConnectedMissedThreeRow[] {
  const lastThree = meetingsNewestFirst.slice(0, 3)
  if (lastThree.length < 3) return []

  const rows: ConnectedMissedThreeRow[] = []
  for (const ruknId of rosterRuknIds) {
    const officer = getRuknById(ruknId)
    const ruknName = officer?.name ?? ruknId
    for (const karkun of getConnectedKarkunsForRukn(ruknId)) {
      const attendedAny = lastThree.some((event) => karkunPresentOnEvent(event.id, karkun.id))
      if (attendedAny) continue
      rows.push({
        ruknId,
        ruknName,
        karkunId: karkun.id,
        karkunName: karkun.name,
      })
    }
  }
  return rows.sort(
    (a, b) => a.ruknName.localeCompare(b.ruknName) || a.karkunName.localeCompare(b.karkunName),
  )
}

/** Rukns with no submission on each of the last 2 consecutive meetings. */
export function buildNonSubmittingRuknsTwoWeeks(
  meetingsNewestFirst: WeeklyIjtemaEvent[],
  rosterRuknIds: string[],
): NonSubmittingRuknRow[] {
  const lastTwo = meetingsNewestFirst.slice(0, 2)
  if (lastTwo.length < 2) return []

  const rows: NonSubmittingRuknRow[] = []
  for (const ruknId of rosterRuknIds) {
    const missedBoth = lastTwo.every((event) => {
      const report = getWeeklyIjtemaReport(event.id)
      const row = report?.ruknRows.find((item) => item.ruknId === ruknId)
      return !row?.submitted
    })
    if (!missedBoth) continue
    const officer = getRuknById(ruknId)
    rows.push({ ruknId, ruknName: officer?.name ?? ruknId })
  }
  return rows.sort((a, b) => a.ruknName.localeCompare(b.ruknName))
}

export function genderReportLabel(
  gender: WeeklyIjtemaAudienceGender,
  language: 'ur' | 'en',
): string {
  if (language === 'ur') return gender === 'Male' ? 'مردانہ اجتماع' : 'زنانہ اجتماع'
  return gender === 'Male' ? 'Men' : 'Women'
}
