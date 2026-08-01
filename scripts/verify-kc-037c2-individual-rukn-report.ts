/**
 * KC-037C2 — Individual Rukn Performance Report verification.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ruknMaster } from '../src/data/ruknMaster'
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
  buildIndividualRuknReportModel,
  INDIVIDUAL_RUKN_MODEL_KIND,
  INDIVIDUAL_RUKN_SECTION_ID,
  isIndividualRuknReportModel,
} from '../src/lib/reporting/individualRuknReportModel'

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

function testRequiresRuknSelection(): void {
  ensure()
  const missing = validateReportConfig(
    defaultKc034Config({
      reportType: 'individual_rukn',
      scope: 'individual_rukn',
      enabledSections: blueprintSectionsFor('individual_rukn'),
      outputType: 'pdf',
    }),
  )
  assert(!missing.ok, 'missing rukn should fail')
  assert(
    missing.errors.some((e) => e.code === 'RUKN_REQUIRED'),
    'RUKN_REQUIRED error',
  )
}

function testComposeIndividualRukn(): void {
  ensure()
  const ruknId = ruknMaster.find((r) => r.status === 'active' && !r.isArchived)?.id
  assert(Boolean(ruknId), 'active rukn available')
  const config = defaultKc034Config({
    reportType: 'individual_rukn',
    scope: 'individual_rukn',
    enabledSections: blueprintSectionsFor('individual_rukn'),
    outputType: 'pdf',
    detailLevel: 'standard',
    language: 'ur',
    scopeTarget: { ruknId },
  })
  assert(validateReportConfig(config).ok, 'validates with rukn')
  const doc = composeReport(config)
  assert(doc.sections.length === 1, 'one section')
  assert(doc.sections[0]!.definition.id === INDIVIDUAL_RUKN_SECTION_ID, 'section id')
  const data = doc.sections[0]!.model.data
  assert(isIndividualRuknReportModel(data), 'model kind')
  assert(data.kind === INDIVIDUAL_RUKN_MODEL_KIND, 'kind constant')
  assert(data.cover.selectedRuknId === ruknId, 'selected rukn')
  assert(Array.isArray(data.assignedKarkuns), 'assigned list')
  assert(Array.isArray(data.recommendations), 'recommendations')
  assert(data.appendix.providerVersion === 'KC-033', 'provider version')
  assert(data.appendix.composerVersion === 'KC-037A', 'composer version')

  const ctx = createReportContext(config)
  const built = buildIndividualRuknReportModel(ctx)
  assert(!('missing' in built), 'direct build ok')
}

function testExecutiveUnaffected(): void {
  ensure()
  const model = composeKc034CampaignReportModel({ generatedBy: 'verify-kc-037c2' })
  assert(typeof model.executive.overallCampaignProgress === 'number', 'executive progress')
  const pdfSrc = readFileSync(resolve('src/lib/reporting/campaignReportPdf.ts'), 'utf8')
  assert(pdfSrc.includes('composeKc034CampaignReportModel'), 'executive PDF still Composer')
  assert(pdfSrc.includes('buildExecutiveCampaignReportV2Content'), 'executive V2 intact')
}

function testExporterWiring(): void {
  const src = readFileSync(
    resolve('src/lib/reporting/v2/exporters/exportReportDocument.ts'),
    'utf8',
  )
  assert(src.includes('downloadIndividualRuknReportPdf'), 'exporter PDF wired')
  assert(src.includes("reportType === 'individual_rukn'"), 'routes by report type')
  const panel = readFileSync(resolve('src/components/reporting/ReportCenterPanel.tsx'), 'utf8')
  assert(panel.includes('scopeTarget'), 'Report Center selection')
  assert(panel.includes('individual_rukn'), 'individual_rukn in UI')
  const modelSrc = readFileSync(resolve('src/lib/reporting/individualRuknReportModel.ts'), 'utf8')
  assert(modelSrc.includes('campaignModelFromContext'), 'uses campaign model')
  assert(!modelSrc.includes('firestore'), 'no firestore')
  assert(modelSrc.includes('getCurrentAttendanceView'), 'WI via KC-033')
  assert(modelSrc.includes('getComplianceStatusView'), 'BM via KC-033')
}

const cases = [
  run('requires Rukn selection', testRequiresRuknSelection),
  run('Composer builds Individual Rukn model', testComposeIndividualRukn),
  run('Executive Report unaffected', testExecutiveUnaffected),
  run('Exporter + Report Center + KC-033 path', testExporterWiring),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037C2',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
