/**
 * KC-038C — Write HTML preview evidence for Executive Weekly Ijtema PDF.
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
import {
  buildWeeklyIjtemaAttendanceReportHtmlForPreview,
  ijtemaExecutiveReportCss,
} from '../src/lib/reporting/weeklyIjtemaAttendanceReportPdf'
import { urduReportShellCss } from '../src/lib/reporting/urduHtmlToPdf'

resetSectionRegistryForTests()
registerBuiltinSections({ force: true })

const config = defaultKc034Config({
  reportType: 'weekly_ijtema',
  enabledSections: blueprintSectionsFor('weekly_ijtema'),
  language: 'ur',
  generatedBy: 'KC-038C Evidence',
  detailLevel: 'standard',
})

const model = buildWeeklyIjtemaAttendanceReportModel(createReportContext(config))
const body = buildWeeklyIjtemaAttendanceReportHtmlForPreview(model)
const css = urduReportShellCss() + '\n' + ijtemaExecutiveReportCss()

function page(label: string, maxWidth: number): string {
  return `<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>KC-038C ${label}</title>
<style>
${css}
body { margin: 0; background: #ecfdf5; }
.frame { max-width: ${maxWidth}px; margin: 16px auto; }
.urdu-report { margin: 0 auto; box-shadow: 0 12px 40px rgba(6,78,59,.15); }
.meta { font-family: ui-sans-serif, system-ui, sans-serif; padding: 12px 16px; color: #475569; font-size: 13px; direction: ltr; text-align: left; }
</style>
</head>
<body>
<div class="meta">KC-038C · Executive Weekly Ijtema PDF · ${label} · Reminded ${model.executiveSummary.reminded} · Present ${model.executiveSummary.present} · Absent ${model.executiveSummary.absent} · ${model.executiveSummary.attendancePct}%</div>
<div class="frame"><article class="urdu-report">${body}</article></div>
</body>
</html>`
}

const outDir = resolve('docs/kc-038c-evidence')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'preview-desktop.html'), page('Desktop preview', 820))
writeFileSync(resolve(outDir, 'preview-mobile.html'), page('Mobile preview', 390))
writeFileSync(
  resolve(outDir, 'composed-document.json'),
  JSON.stringify(
    {
      reportType: 'weekly_ijtema',
      cover: model.cover,
      executiveSummary: model.executiveSummary,
      executiveObservation: model.executiveObservation,
      comparisonGraph: model.comparisonGraph,
      reportSubmission: model.reportSubmission,
      ruknDetailCount: model.ruknDetails.length,
      followUpCount: model.followUp.length,
      futurePlaceholders: model.futureAnalyticsPlaceholders,
    },
    null,
    2,
  ),
)

console.log('KC-038C evidence written to docs/kc-038c-evidence/')
