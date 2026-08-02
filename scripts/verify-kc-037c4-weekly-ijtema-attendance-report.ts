/**
 * KC-037C4 — Weekly Ijtema Attendance Report verification.
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
  assert(typesSrc.includes('Weekly Ijtema Attendance Report'), 'catalog title')
}

function testComposeWeeklyIjtemaAttendance(): void {
  ensure()
  const config = defaultKc034Config({
    reportType: 'weekly_ijtema',
    scope: 'overall_campaign',
    enabledSections: blueprintSectionsFor('weekly_ijtema'),
    outputType: 'pdf',
    detailLevel: 'standard',
    language: 'ur',
    generatedBy: 'verify-kc-037c4',
  })
  assert(validateReportConfig(config).ok, 'validates')
  const doc = composeReport(config)
  assert(doc.sections.length === 1, 'one section')
  assert(doc.sections[0]!.definition.id === WEEKLY_IJTEMA_ATTENDANCE_SECTION_ID, 'section id')
  const data = doc.sections[0]!.model.data
  assert(isWeeklyIjtemaAttendanceReportModel(data), 'model kind')
  assert(data.kind === WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND, 'kind constant')
  assert(typeof data.executiveSummary.overallAttendancePct === 'number', 'overall pct')
  assert(Array.isArray(data.ruknPerformance), 'rukn table')
  assert(Array.isArray(data.attendanceRegister), 'register')
  assert(Array.isArray(data.absentRegister), 'absent register')
  assert(Array.isArray(data.operationalInsights), 'insights')
  assert(Array.isArray(data.operationalRecommendations), 'recommendations')
  assert(data.appendix.providerVersion === 'KC-033', 'provider version')
  assert(data.appendix.composerVersion === 'KC-037A', 'composer version')
  assert(data.cover.campaignUrdu.includes('فعال'), 'Urdu campaign line')

  // Ranking must be descending by attendance %
  for (let i = 1; i < data.ruknPerformance.length; i += 1) {
    assert(
      data.ruknPerformance[i - 1]!.attendancePct >= data.ruknPerformance[i]!.attendancePct,
      'rukn ranking descending',
    )
  }

  const ctx = createReportContext(config)
  const built = buildWeeklyIjtemaAttendanceReportModel(ctx)
  assert(built.kind === WEEKLY_IJTEMA_ATTENDANCE_MODEL_KIND, 'direct build ok')
}

function testEmptyAndMixedStructural(): void {
  ensure()
  const config = defaultKc034Config({
    reportType: 'weekly_ijtema',
    enabledSections: blueprintSectionsFor('weekly_ijtema'),
    language: 'en',
    generatedBy: 'verify-kc-037c4',
  })
  const data = buildWeeklyIjtemaAttendanceReportModel(createReportContext(config))
  assert(typeof data.executiveSummary.present === 'number', 'present')
  assert(typeof data.executiveSummary.absent === 'number', 'absent')
  assert(typeof data.executiveSummary.pending === 'number', 'pending')
  assert(
    data.executiveSummary.pending ===
      Math.max(
        0,
        (data.attendanceOverview.present +
          data.attendanceOverview.absent +
          data.attendanceOverview.pending) -
          data.attendanceOverview.present -
          data.attendanceOverview.absent,
      ) || data.attendanceOverview.pending >= 0,
    'pending non-negative',
  )
  assert(
    data.absentRegister.every((r) => r.followUpRequired.length > 0),
    'absent follow-up filled',
  )
  assert(data.appendix.definitions.length >= 3, 'definitions')
}

function testExecutiveAndC2Unaffected(): void {
  ensure()
  const model = composeKc034CampaignReportModel({ generatedBy: 'verify-kc-037c4' })
  assert(typeof model.executive.overallCampaignProgress === 'number', 'executive progress')
  const pdfSrc = readFileSync(resolve('src/lib/reporting/campaignReportPdf.ts'), 'utf8')
  assert(pdfSrc.includes('composeKc034CampaignReportModel'), 'executive PDF still Composer')
  assert(pdfSrc.includes('buildExecutiveCampaignReportV2Content'), 'executive V2 intact')
  const c2 = readFileSync(resolve('src/lib/reporting/individualRuknReportPdf.ts'), 'utf8')
  assert(c2.includes('downloadIndividualRuknReportPdf'), 'C2 PDF intact')
}

function testExporterWiring(): void {
  const src = readFileSync(
    resolve('src/lib/reporting/v2/exporters/exportReportDocument.ts'),
    'utf8',
  )
  assert(src.includes('downloadWeeklyIjtemaAttendanceReportPdf'), 'exporter PDF wired')
  assert(src.includes("reportType === 'weekly_ijtema'"), 'routes by report type')
  assert(src.includes('WEEKLY_IJTEMA_ATTENDANCE_SECTION_ID'), 'section id used')
  const modelSrc = readFileSync(
    resolve('src/lib/reporting/weeklyIjtemaAttendanceReportModel.ts'),
    'utf8',
  )
  assert(modelSrc.includes('campaignModelFromContext'), 'uses campaign model')
  assert(!modelSrc.includes('firestore'), 'no firestore')
  assert(modelSrc.includes('getHealthSlice'), 'WI health via KC-033')
  assert(modelSrc.includes('getActiveRuknRows'), 'Rukn rows via KC-033')
  assert(modelSrc.includes('getSummariesView'), 'register via KC-033')
  assert(modelSrc.includes('connections.get'), 'connected via KC-033')
  const thin = readFileSync(
    resolve('src/lib/reporting/v2/sections/activePlatformSections.ts'),
    'utf8',
  )
  assert(thin.includes("domainFromProviders(ctx, 'weekly_ijtema')"), 'thin section preserved')
  assert(thin.includes('weekly_ijtema_attendance'), 'attendance section registered')
}

const cases = [
  run('blueprint + catalog', testBlueprintAndCatalog),
  run('Composer builds Weekly Ijtema Attendance model', testComposeWeeklyIjtemaAttendance),
  run('Empty / mixed structural fields', testEmptyAndMixedStructural),
  run('Executive + Individual Rukn unaffected', testExecutiveAndC2Unaffected),
  run('Exporter + KC-033 path', testExporterWiring),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037C4',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
