/**
 * KC-037C4 — Write HTML preview evidence (Composer model → PDF HTML shell).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  blueprintSectionsFor,
  composeReport,
  createReportContext,
  defaultKc034Config,
  registerBuiltinSections,
  resetSectionRegistryForTests,
} from '../src/lib/reporting/v2'
import { buildWeeklyIjtemaAttendanceReportModel } from '../src/lib/reporting/weeklyIjtemaAttendanceReportModel'
import { buildWeeklyIjtemaAttendanceReportHtmlForPreview } from '../src/lib/reporting/weeklyIjtemaAttendanceReportPdf'
import { urduReportShellCss } from '../src/lib/reporting/urduHtmlToPdf'

resetSectionRegistryForTests()
registerBuiltinSections({ force: true })

const config = defaultKc034Config({
  reportType: 'weekly_ijtema',
  enabledSections: blueprintSectionsFor('weekly_ijtema'),
  language: 'en',
  generatedBy: 'KC-037C4 Evidence',
  detailLevel: 'standard',
})

const model = buildWeeklyIjtemaAttendanceReportModel(createReportContext(config))
const body = buildWeeklyIjtemaAttendanceReportHtmlForPreview(model)
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
</style>
</head>
<body>
<div class="meta">KC-037C4 · Weekly Ijtema Attendance Report · ${label} · Present ${model.executiveSummary.present} · Absent ${model.executiveSummary.absent} · Pending ${model.executiveSummary.pending} · ${model.executiveSummary.overallAttendancePct}%</div>
<div class="frame"><div class="urdu-report">${body}</div></div>
</body>
</html>`
}

const outDir = resolve('docs/kc-037c4-evidence')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'preview-desktop.html'), page('Desktop preview', 820))
writeFileSync(resolve(outDir, 'preview-mobile.html'), page('Mobile preview', 390))

const doc = composeReport(config)
writeFileSync(
  resolve(outDir, 'composed-document.json'),
  JSON.stringify(
    {
      reportType: doc.config.reportType,
      sections: doc.sections.map((s) => s.definition.id),
      cover: model.cover,
      executiveSummary: model.executiveSummary,
      analytics: model.analytics,
      insights: model.operationalInsights,
      recommendations: model.operationalRecommendations,
      ruknCount: model.ruknPerformance.length,
      registerCount: model.attendanceRegister.length,
      absentCount: model.absentRegister.length,
    },
    null,
    2,
  ),
)

console.log(
  JSON.stringify(
    {
      ok: true,
      present: model.executiveSummary.present,
      absent: model.executiveSummary.absent,
      pending: model.executiveSummary.pending,
      pct: model.executiveSummary.overallAttendancePct,
      rukns: model.ruknPerformance.length,
      outDir,
    },
    null,
    2,
  ),
)
