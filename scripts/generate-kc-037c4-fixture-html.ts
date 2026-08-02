/**
 * KC-037C4 — Visual fixture HTML for preview/PDF screenshots (layout only).
 * Not used by production Composer / KPI path.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { WeeklyIjtemaAttendanceReportModel } from '../src/lib/reporting/weeklyIjtemaAttendanceReportModel'
import { WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND } from '../src/lib/reporting/weeklyIjtemaAttendanceReportModel'
import { buildWeeklyIjtemaAttendanceReportHtmlForPreview } from '../src/lib/reporting/weeklyIjtemaAttendanceReportPdf'
import { urduReportShellCss } from '../src/lib/reporting/urduHtmlToPdf'

const fixture: WeeklyIjtemaAttendanceReportModel = {
  kind: WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND,
  language: 'en',
  detailLevel: 'standard',
  cover: {
    reportTitle: 'Weekly Ijtema Attendance Report',
    campaignName: 'Faal Karkun Campaign',
    campaignUrdu: 'فعال کارکن، فعال جماعت',
    reportingDate: '2026-08-02',
    attendanceWindow: "Men's Weekly Ijtema · 2026-08-02 · Open",
    generatedOn: '2 Aug 2026, 07:50',
    generatedBy: 'Administrator (fixture)',
  },
  executiveSummary: {
    totalConnectedKarkuns: 120,
    present: 86,
    absent: 18,
    pending: 16,
    overallAttendancePct: 72,
    maleAttendancePct: 74,
    femaleAttendancePct: 68,
    narrative:
      'Overall attendance is 72% — Present 86, Absent 18, Pending 16. Near operational target; continue follow-up.',
  },
  attendanceOverview: {
    present: 86,
    absent: 18,
    pending: 16,
    attendancePct: 72,
  },
  ruknPerformance: [
    { rank: 1, ruknId: 'r1', ruknName: 'Rukn Alpha', connected: 12, present: 11, absent: 1, pending: 0, attendancePct: 92, highlight: 'top5' },
    { rank: 2, ruknId: 'r2', ruknName: 'Rukn Beta', connected: 10, present: 9, absent: 1, pending: 0, attendancePct: 90, highlight: 'top5' },
    { rank: 3, ruknId: 'r3', ruknName: 'Rukn Gamma', connected: 11, present: 9, absent: 2, pending: 0, attendancePct: 82, highlight: 'top5' },
    { rank: 4, ruknId: 'r4', ruknName: 'Rukn Delta', connected: 9, present: 7, absent: 1, pending: 1, attendancePct: 78, highlight: 'top5' },
    { rank: 5, ruknId: 'r5', ruknName: 'Rukn Epsilon', connected: 8, present: 6, absent: 1, pending: 1, attendancePct: 75, highlight: 'top5' },
    { rank: 6, ruknId: 'r6', ruknName: 'Rukn Zeta', connected: 10, present: 6, absent: 2, pending: 2, attendancePct: 60, highlight: null },
    { rank: 7, ruknId: 'r7', ruknName: 'Rukn Eta', connected: 9, present: 5, absent: 2, pending: 2, attendancePct: 56, highlight: 'bottom5' },
    { rank: 8, ruknId: 'r8', ruknName: 'Rukn Theta', connected: 8, present: 4, absent: 3, pending: 1, attendancePct: 50, highlight: 'bottom5' },
    { rank: 9, ruknId: 'r9', ruknName: 'Rukn Iota', connected: 7, present: 3, absent: 2, pending: 2, attendancePct: 43, highlight: 'bottom5' },
    { rank: 10, ruknId: 'r10', ruknName: 'Rukn Kappa', connected: 8, present: 2, absent: 3, pending: 3, attendancePct: 25, highlight: 'bottom5' },
  ],
  attendanceRegister: [
    { karkunId: 'k1', karkunName: 'Karkun One', ruknId: 'r1', ruknName: 'Rukn Alpha', attendance: 'Present', markedBy: 'Rukn Alpha', submissionTime: '2 Aug 2026, 09:10' },
    { karkunId: 'k2', karkunName: 'Karkun Two', ruknId: 'r1', ruknName: 'Rukn Alpha', attendance: 'Absent', markedBy: 'Rukn Alpha', submissionTime: '2 Aug 2026, 09:10' },
    { karkunId: 'k3', karkunName: 'Karkun Three', ruknId: 'r10', ruknName: 'Rukn Kappa', attendance: 'Pending', markedBy: '—', submissionTime: '—' },
    { karkunId: 'k4', karkunName: 'Karkun Four', ruknId: 'r8', ruknName: 'Rukn Theta', attendance: 'Present', markedBy: 'Rukn Theta', submissionTime: '2 Aug 2026, 10:02' },
    { karkunId: 'k5', karkunName: 'Karkun Five', ruknId: 'r8', ruknName: 'Rukn Theta', attendance: 'Absent', markedBy: 'Rukn Theta', submissionTime: '2 Aug 2026, 10:02' },
  ],
  absentRegister: [
    { karkunId: 'k2', karkunName: 'Karkun Two', ruknName: 'Rukn Alpha', assignedRuknName: 'Rukn Alpha', followUpRequired: 'Yes — within 24h' },
    { karkunId: 'k5', karkunName: 'Karkun Five', ruknName: 'Rukn Theta', assignedRuknName: 'Rukn Theta', followUpRequired: 'Yes — within 24h' },
  ],
  analytics: {
    bestPerformingRukn: 'Rukn Alpha',
    lowestPerformingRukn: 'Rukn Kappa',
    highestAttendancePct: 92,
    lowestAttendancePct: 25,
    overallAttendancePct: 72,
    maleAttendancePct: 74,
    femaleAttendancePct: 68,
    maleFemaleComparison: 'Male 74% · Female 68%',
  },
  operationalInsights: [
    'Attendance below campaign operational target.',
    '4 Rukns require immediate follow-up.',
    'Male attendance exceeded Female attendance.',
    '18 Karkuns absent — follow-up register is ready.',
    '16 attendance submissions remain pending.',
    'Week-over-week comparison: snapshot only (historical series not available).',
  ],
  operationalRecommendations: [
    'Follow up with all absent Karkuns within 24 hours.',
    'Contact Rukns with attendance below campaign target: Rukn Eta, Rukn Theta, Rukn Iota.',
    'Review pending attendance submissions and close them.',
    'Encourage invitation completion before the next Weekly Ijtema.',
  ],
  appendix: {
    attendanceByRukn: [],
    overallTotals: { connected: 120, present: 86, absent: 18, pending: 16, attendancePct: 72 },
    definitions: [
      'Present — marked present for the Weekly Ijtema event.',
      'Absent — marked absent for the Weekly Ijtema event.',
      'Pending — assigned Karkun not yet marked.',
      'Attendance % — Present ÷ Assigned (Campaign Health / KC-033).',
    ],
    generatedTimestamp: '2026-08-02 07:50',
    reportVersion: 'KC-037C4',
    providerVersion: 'KC-033',
    composerVersion: 'KC-037A',
    systemVersion: '1.0.0-rc.1',
    campaign: 'Faal Karkun Campaign',
  },
}

fixture.appendix.attendanceByRukn = fixture.ruknPerformance.map((r) => ({
  ruknName: r.ruknName,
  connected: r.connected,
  present: r.present,
  absent: r.absent,
  pending: r.pending,
  attendancePct: r.attendancePct,
}))

const body = buildWeeklyIjtemaAttendanceReportHtmlForPreview(fixture)
const css = urduReportShellCss()

function page(label: string, maxWidth: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>KC-037C4 ${label}</title>
<style>
${css}
body { margin: 0; background: #f1f5f9; }
.frame { max-width: ${maxWidth}px; margin: 16px auto; }
.urdu-report { margin: 0 auto; box-shadow: 0 8px 30px rgba(15,23,42,.12); }
.meta { font-family: ui-sans-serif, system-ui, sans-serif; padding: 12px 16px; color: #475569; font-size: 13px; }
.banner { background: #0f766e; color: #fff; padding: 8px 16px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; }
</style>
</head>
<body>
<div class="banner">VISUAL FIXTURE — layout evidence only · not live campaign KPIs</div>
<div class="meta">KC-037C4 · Weekly Ijtema Attendance Report · ${label} · mixed Present/Absent/Pending · Rukn ranking Top/Bottom 5</div>
<div class="frame"><div class="urdu-report">${body}</div></div>
</body>
</html>`
}

const outDir = resolve('docs/kc-037c4-evidence')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'pdf-fixture-desktop.html'), page('PDF fixture · Desktop', 820))
writeFileSync(resolve(outDir, 'pdf-fixture-mobile.html'), page('PDF fixture · Mobile', 390))
console.log('fixture HTML written', outDir)
