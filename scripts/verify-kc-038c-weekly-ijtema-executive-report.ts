/**
 * KC-038C — Weekly Ijtema Executive Report verification.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  blueprintSectionsFor,
  composeKc034CampaignReportModel,
  composeReport,
  createReportContext,
  defaultKc034Config,
  registerBuiltinSections,
  resetSectionRegistryForTests,
  validateReportConfig,
} from '../src/lib/reporting/v2'
import {
  buildWeeklyIjtemaAttendanceReportModel,
  WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND,
  WEEKLY_IJTEMA_ATTENDANCE_SECTION_ID,
  isWeeklyIjtemaAttendanceReportModel,
} from '../src/lib/reporting/weeklyIjtemaAttendanceReportModel'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function ensure(): void {
  resetSectionRegistryForTests()
  registerBuiltinSections({ force: true })
}

function testBlueprintAndCatalog(): void {
  ensure()
  const sections = blueprintSectionsFor('weekly_ijtema')
  assert(
    sections.length === 1 && sections[0] === WEEKLY_IJTEMA_ATTENDANCE_SECTION_ID,
    'weekly_ijtema blueprint is attendance dossier only',
  )
  const typesSrc = readFileSync(resolve('src/lib/reporting/v2/reportTypes.ts'), 'utf8')
  assert(typesSrc.includes('Weekly Ijtema'), 'catalog title')
}

function testComposeExecutiveModel(): void {
  ensure()
  const config = defaultKc034Config({
    reportType: 'weekly_ijtema',
    scope: 'overall_campaign',
    enabledSections: blueprintSectionsFor('weekly_ijtema'),
    outputType: 'pdf',
    detailLevel: 'standard',
    language: 'ur',
    generatedBy: 'verify-kc-038c',
  })
  assert(validateReportConfig(config).ok, 'validates')
  const doc = composeReport(config)
  assert(doc.sections.length === 1, 'one section')
  const data = doc.sections[0]!.model.data
  assert(isWeeklyIjtemaAttendanceReportModel(data), 'model kind')
  assert(data.kind === WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND, 'executive kind constant')
  assert(data.cover.reportTitle.includes('جائزہ'), 'Urdu executive title')
  assert(typeof data.executiveSummary.reminded === 'number', 'reminded kpi')
  assert(typeof data.executiveSummary.attendancePct === 'number', 'attendance pct')
  assert(typeof data.executiveObservation === 'string' && data.executiveObservation.length > 0, 'observation')
  assert(Array.isArray(data.ruknDetails), 'rukn details')
  assert(Array.isArray(data.followUp), 'follow-up')
  assert(Array.isArray(data.futureAnalyticsPlaceholders), 'future placeholders')
  assert(data.appendix.reportVersion === 'KC-038C', 'report version')

  const ctx = createReportContext(config)
  const built = buildWeeklyIjtemaAttendanceReportModel(ctx)
  assert(built.kind === WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND, 'direct build ok')
}

function testNoRankingInPdf(): void {
  const pdfSrc = readFileSync(
    resolve('src/lib/reporting/weeklyIjtemaAttendanceReportPdf.ts'),
    'utf8',
  )
  assert(!pdfSrc.includes('rank-badge'), 'no rank badges')
  assert(!pdfSrc.includes('top5'), 'no top performer highlights')
  assert(!pdfSrc.includes('bottom5'), 'no bottom performer highlights')
  assert(pdfSrc.includes('ijtema-exec-v1'), 'executive design class')
  assert(pdfSrc.includes('wi-summary-row'), 'summary layout')
  assert(pdfSrc.includes('wi-page-footer'), 'page footer')
  assert(pdfSrc.includes('صفحہ'), 'Urdu page numbers')
  assert(!pdfSrc.includes('Karkun Connect ·'), 'no technical header metadata')
  assert(!pdfSrc.includes('generatedTimestamp'), 'no timestamp in HTML output')
  assert(pdfSrc.includes('wi-meeting-dates'), 'meeting dates inside report body')
  assert(!pdfSrc.includes('wi-cover-dates'), 'no meeting dates on cover')
  assert(pdfSrc.includes('pdf-page-rukn'), 'rukn pages avoid split')
  assert(pdfSrc.includes('break-inside: avoid'), 'page-break guard on rukn sections')
  const urduSrc = readFileSync(
    resolve('src/lib/reporting/weeklyIjtemaExecutiveReportUrdu.ts'),
    'utf8',
  )
  assert(urduSrc.includes('خلاصۂ جائزہ'), 'executive summary heading')
  assert(urduSrc.includes('اہم مشاہدات'), 'observation heading')
  assert(urduSrc.includes('شرکت کا جائزہ'), 'comparison heading')
  assert(urduSrc.includes('رکن وار تفصیل'), 'rukn detail heading')
  assert(urduSrc.includes('مزید توجہ کے متقاضی کارکنان'), 'follow-up heading')
}

function testExporterWiring(): void {
  const src = readFileSync(
    resolve('src/lib/reporting/v2/exporters/exportReportDocument.ts'),
    'utf8',
  )
  assert(src.includes('downloadWeeklyIjtemaAttendanceReportPdf'), 'exporter PDF wired')
  const modelSrc = readFileSync(
    resolve('src/lib/reporting/weeklyIjtemaAttendanceReportModel.ts'),
    'utf8',
  )
  assert(modelSrc.includes('getActiveRuknRows'), 'Rukn rows via KC-033')
  assert(modelSrc.includes('getSummariesView'), 'register via KC-033')
  assert(!modelSrc.includes('firestore'), 'no firestore')
}

function testExecutiveUnaffected(): void {
  ensure()
  const model = composeKc034CampaignReportModel({ generatedBy: 'verify-kc-038c' })
  assert(typeof model.executive.overallCampaignProgress === 'number', 'executive progress')
}

const cases = [
  run('blueprint + catalog', testBlueprintAndCatalog),
  run('Composer builds KC-038C executive model', testComposeExecutiveModel),
  run('PDF has no ranking / leaderboard', testNoRankingInPdf),
  run('Exporter + KC-033 path', testExporterWiring),
  run('Executive campaign report unaffected', testExecutiveUnaffected),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-038C',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
