/**
 * KC-037A — Report Composer foundation verification.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  composeReport,
  composeKc034CampaignReportModel,
  defaultKc034Config,
  KC034_EXECUTIVE_SECTION_ID,
  listSections,
  registerSection,
  unregisterSectionForTests,
  CAMPAIGN_REPORT_MODEL_KIND,
  resetSectionRegistryForTests,
} from '../src/lib/reporting/v2'
import { registerBuiltinSections } from '../src/lib/reporting/v2/sections/registerBuiltinSections'

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

function ensureBuiltinRegistry(): void {
  resetSectionRegistryForTests()
  registerBuiltinSections({ force: true })
}

function testDefaultCompose(): void {
  ensureBuiltinRegistry()
  const doc = composeReport(defaultKc034Config())
  assert(doc.sections.length === 1, 'exactly one enabled section')
  assert(doc.sections[0]!.definition.id === KC034_EXECUTIVE_SECTION_ID, 'kc034 section')
  assert(doc.sections[0]!.model.kind === CAMPAIGN_REPORT_MODEL_KIND, 'campaign_report_v1 kind')
  const model = composeKc034CampaignReportModel({ generatedBy: 'verify' })
  assert(typeof model.executive.overallCampaignProgress === 'number', 'overall progress')
  assert(Array.isArray(model.allRukns), 'allRukns')
  assert(Array.isArray(model.progressBands), 'progressBands')
  assert(model.cover.generatedBy === 'verify', 'cover generatedBy')
}

function testExtensibleRegistry(): void {
  ensureBuiltinRegistry()
  const id = 'kc037a_test_ephemeral'
  registerSection({
    id,
    displayName: 'Ephemeral Test Section',
    description: 'verify extensibility',
    requiredProviders: ['connections'],
    configurationSchema: 'test',
    renderPriority: 1,
    supportedOutputs: ['pdf'],
    featureFlag: true,
    status: 'active',
    buildModel: (ctx) => {
      const connections = ctx.providers.connections.get()
      return {
        sectionId: id,
        kind: 'test_v1',
        data: { connected: connections.connected },
      }
    },
  })
  const doc = composeReport(
    defaultKc034Config({
      enabledSections: [id],
    }),
  )
  assert(doc.sections.length === 1, 'ephemeral only')
  assert(doc.sections[0]!.model.kind === 'test_v1', 'test kind')
  unregisterSectionForTests(id)
}

function testPlannedStubsNotComposable(): void {
  ensureBuiltinRegistry()
  const planned = listSections().filter((s) => s.status === 'planned')
  assert(planned.length >= 1, 'planned stubs registered')
  const plannedId = planned[0]!.id
  let threw = false
  try {
    composeReport(defaultKc034Config({ enabledSections: [plannedId] }))
  } catch {
    threw = true
  }
  assert(threw, 'planned section must not compose')
}

function testModelAvoidsDirectServiceImports(): void {
  const src = readFileSync(resolve('src/lib/reporting/campaignReportModel.ts'), 'utf8')
  assert(!src.includes("from '@/services/dashboardMetricsService'"), 'no dashboardMetricsService import')
  assert(!src.includes("from '@/services/metricsService'"), 'no metricsService import')
  assert(!src.includes("from '@/services/weeklyIjtemaService'"), 'no weeklyIjtemaService import')
  assert(!src.includes("from '@/services/monthlyBaitulMaalService'"), 'no monthlyBaitulMaalService import')
  assert(src.includes('CanonicalMetricProviders'), 'uses CanonicalMetricProviders')
}

function testPdfUsesComposer(): void {
  const src = readFileSync(resolve('src/lib/reporting/campaignReportPdf.ts'), 'utf8')
  assert(src.includes('composeKc034CampaignReportModel'), 'PDF uses Composer adapter')
  assert(!src.includes('buildCampaignReportModel('), 'PDF does not call buildCampaignReportModel directly')
}

function testProvidersExtended(): void {
  const src = readFileSync(resolve('src/lib/operations/canonicalCampaignMetrics.ts'), 'utf8')
  assert(src.includes('getForRukn'), 'visits/app ForRukn on facade')
  assert(src.includes('getActiveRuknRows'), 'WI/BM active rows on facade')
  assert(src.includes('getModulePct'), 'health module pct on facade')
  assert(src.includes('getCountForRukn'), 'connections count for rukn')
}

const cases = [
  run('default compose → kc034 model', testDefaultCompose),
  run('register ephemeral section without composer edit', testExtensibleRegistry),
  run('planned stubs not composable', testPlannedStubsNotComposable),
  run('campaignReportModel KPIs via CanonicalMetricProviders', testModelAvoidsDirectServiceImports),
  run('PDF obtains model via Composer', testPdfUsesComposer),
  run('CanonicalMetricProviders extended for report', testProvidersExtended),
]

const failed = cases.filter((c) => c.passed === false)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037A',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
