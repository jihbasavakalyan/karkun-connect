/**
 * KC-037C3 — Individual Karkun Performance Report verification.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getKarkunById, MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'
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
  buildIndividualKarkunReportModel,
  INDIVIDUAL_KARKUN_MODEL_KIND,
  INDIVIDUAL_KARKUN_SECTION_ID,
  isIndividualKarkunReportModel,
} from '../src/lib/reporting/individualKarkunReportModel'

const FIXTURE_ID = 'kr-037c3-verify'

function seedFixtureKarkun(): KarkunRegistryRecord {
  const now = new Date().toISOString()
  const person: KarkunRegistryRecord = {
    id: FIXTURE_ID,
    name: 'Verify Karkun C3',
    gender: 'Male',
    mobile: '900037c3001',
    place: 'Ward A',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'verify-kc-037c3',
    address: 'Test Address',
    area: 'Area North',
    assignedRukn: 'Verify Rukn',
    assignedRuknId: 'R001',
    assignmentStatus: 'Assigned',
    assignmentDate: '2026-07-01',
    campaignStatus: 'active',
    visitStatus: 'pending',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
  }
  MOCK_KARKUN_REGISTRY.length = 0
  MOCK_KARKUN_REGISTRY.push(person)
  return person
}

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

function testRequiresKarkunSelection(): void {
  ensure()
  const missing = validateReportConfig(
    defaultKc034Config({
      reportType: 'individual_karkun',
      scope: 'individual_karkun',
      enabledSections: blueprintSectionsFor('individual_karkun'),
      outputType: 'pdf',
    }),
  )
  assert(!missing.ok, 'missing karkun should fail')
  assert(
    missing.errors.some((e) => e.code === 'KARKUN_REQUIRED'),
    'KARKUN_REQUIRED error',
  )
}

function testComposeIndividualKarkun(): void {
  ensure()
  const person = seedFixtureKarkun()
  assert(Boolean(getKarkunById(person.id)), 'lookup works')

  const config = defaultKc034Config({
    reportType: 'individual_karkun',
    scope: 'individual_karkun',
    enabledSections: blueprintSectionsFor('individual_karkun'),
    outputType: 'pdf',
    detailLevel: 'standard',
    language: 'ur',
    scopeTarget: { personId: person.id },
  })
  assert(validateReportConfig(config).ok, 'validates with karkun')
  const doc = composeReport(config)
  assert(doc.sections.length === 1, 'one section')
  assert(doc.sections[0]!.definition.id === INDIVIDUAL_KARKUN_SECTION_ID, 'section id')
  const data = doc.sections[0]!.model.data
  assert(isIndividualKarkunReportModel(data), 'model kind')
  assert(data.kind === INDIVIDUAL_KARKUN_MODEL_KIND, 'kind constant')
  assert(data.cover.karkunName === person.name, 'cover name')
  assert(Array.isArray(data.matrix) && data.matrix.length === 6, 'matrix')
  assert(Array.isArray(data.recommendations), 'recommendations')
  assert(data.appendix.providerVersion === 'KC-033', 'provider version')
  assert(data.appendix.composerVersion === 'KC-037A', 'composer version')

  const built = buildIndividualKarkunReportModel(createReportContext(config))
  assert(!('missing' in built), 'direct build ok')
}

function testExecutiveUnaffected(): void {
  ensure()
  const model = composeKc034CampaignReportModel({ generatedBy: 'verify-kc-037c3' })
  assert(typeof model.executive.overallCampaignProgress === 'number', 'executive progress')
  const pdfSrc = readFileSync(resolve('src/lib/reporting/campaignReportPdf.ts'), 'utf8')
  assert(pdfSrc.includes('composeKc034CampaignReportModel'), 'executive PDF still Composer')
}

function testExporterAndUiWiring(): void {
  const src = readFileSync(
    resolve('src/lib/reporting/v2/exporters/exportReportDocument.ts'),
    'utf8',
  )
  assert(src.includes('downloadIndividualKarkunReportPdf'), 'karkun PDF wired')
  assert(src.includes("reportType === 'individual_karkun'"), 'routes by report type')
  const panel = readFileSync(resolve('src/components/reporting/ReportCenterPanel.tsx'), 'utf8')
  assert(panel.includes('connectedKarkunOptions'), 'karkun selector')
  assert(panel.includes('individual_karkun'), 'type in UI')
  const modelSrc = readFileSync(
    resolve('src/lib/reporting/individualKarkunReportModel.ts'),
    'utf8',
  )
  assert(modelSrc.includes('getCurrentAttendanceView'), 'WI via KC-033')
  assert(modelSrc.includes('getComplianceStatusView'), 'BM via KC-033')
  assert(modelSrc.includes('buildJourneyTimeline'), 'timeline from existing engine')
  assert(!modelSrc.includes('firestore'), 'no firestore')
}

const cases = [
  run('requires Karkun selection', testRequiresKarkunSelection),
  run('Composer builds Individual Karkun model', testComposeIndividualKarkun),
  run('Executive Report unaffected', testExecutiveUnaffected),
  run('Exporter + Report Center + KC-033 path', testExporterAndUiWiring),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037C3',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
