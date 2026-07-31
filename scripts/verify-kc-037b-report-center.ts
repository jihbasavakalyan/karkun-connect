/**
 * KC-037B — Report Center / multi-report configuration verification.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildReportPreview,
  composeReport,
  defaultKc034Config,
  getReportType,
  KC034_EXECUTIVE_SECTION_ID,
  listEnabledReportPresets,
  listReportTypes,
  listSectionsForReportType,
  registerBuiltinSections,
  resetSectionRegistryForTests,
  validateReportConfig,
  ReportComposeError,
} from '../src/lib/reporting/v2'

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

function ensureRegistry(): void {
  resetSectionRegistryForTests()
  registerBuiltinSections({ force: true })
}

function testCatalog(): void {
  ensureRegistry()
  const types = listReportTypes()
  assert(types.length >= 15, 'report types registered')
  const exec = getReportType('executive_campaign')
  assert(Boolean(exec?.available), 'executive available')
  assert(types.some((t) => t.id === 'historical_comparison' && !t.available), 'placeholder type')
  const presets = listEnabledReportPresets()
  assert(presets.some((p) => p.id === 'executive_weekly_review'), 'weekly preset')
  const sections = listSectionsForReportType('executive_campaign')
  assert(sections.some((s) => s.id === KC034_EXECUTIVE_SECTION_ID), 'kc034 in executive sections')
  assert(sections.some((s) => s.id === 'muttafiqeen_summary'), 'muttafiqeen section metadata')
}

function testValidation(): void {
  ensureRegistry()
  const ok = validateReportConfig(defaultKc034Config())
  assert(ok.ok, 'default config valid')
  const badType = validateReportConfig(
    defaultKc034Config({ reportType: 'historical_comparison', enabledSections: ['trend_analysis'] }),
  )
  assert(!badType.ok, 'unavailable type rejected')
  assert(badType.errors.some((e) => e.code === 'REPORT_TYPE_UNAVAILABLE'), 'unavailable code')
  const badOutput = validateReportConfig(defaultKc034Config({ outputType: 'excel' }))
  assert(!badOutput.ok, 'excel rejected')
  const badSection = validateReportConfig(
    defaultKc034Config({ enabledSections: ['executive_summary'] }),
  )
  assert(!badSection.ok, 'planned section rejected')
}

function testComposerRejectsInvalid(): void {
  ensureRegistry()
  let threw = false
  try {
    composeReport(defaultKc034Config({ outputType: 'csv' }))
  } catch (e) {
    threw = e instanceof ReportComposeError
  }
  assert(threw, 'compose throws ReportComposeError')
}

function testPreviewAndCompose(): void {
  ensureRegistry()
  const config = defaultKc034Config()
  const preview = buildReportPreview(config)
  assert(preview.reportTitle.includes('Executive'), 'preview title')
  assert(preview.connectionVsVisitNote.includes('Connection'), 'connection terminology')
  assert(preview.connectionVsVisitNote.includes('Visit'), 'visit terminology')
  assert(preview.diagnostics.ok, 'preview diagnostics ok')
  const doc = composeReport(config)
  assert(doc.sections.length === 1, 'composed one section')
  assert(doc.sections[0]!.definition.id === KC034_EXECUTIVE_SECTION_ID, 'kc034 composed')
}

function testUiWiring(): void {
  const button = readFileSync(
    resolve('src/components/reporting/GenerateCampaignReportButton.tsx'),
    'utf8',
  )
  assert(button.includes('ADMIN_REPORTS'), 'button opens Report Center')
  assert(!button.includes('downloadCampaignReportPdf'), 'button no longer downloads directly')
  const page = readFileSync(resolve('src/pages/admin/AdminReportCenterPage.tsx'), 'utf8')
  assert(page.includes('ReportCenterPanel'), 'report center page')
  const panel = readFileSync(resolve('src/components/reporting/ReportCenterPanel.tsx'), 'utf8')
  assert(panel.includes('listSectionsForReportType'), 'sections from registry')
  assert(panel.includes('listReportTypes'), 'types from catalog')
  assert(panel.includes('generateConfiguredReport'), 'generate via composer helper')
  const gen = readFileSync(resolve('src/lib/reporting/v2/generateConfiguredReport.ts'), 'utf8')
  assert(gen.includes('composeReport'), 'generate uses composeReport')
  assert(gen.includes('downloadCampaignReportPdf'), 'generate uses PDF exporter')
}

function testNoDirectKpiInUi(): void {
  const panel = readFileSync(resolve('src/components/reporting/ReportCenterPanel.tsx'), 'utf8')
  assert(!panel.includes('dashboardMetricsService'), 'panel no dashboard metrics')
  assert(!panel.includes('getCampaignConnectionMetrics'), 'panel no direct connection metrics')
}

const cases = [
  run('report type / preset / section catalogs', testCatalog),
  run('composer validation diagnostics', testValidation),
  run('compose rejects invalid config', testComposerRejectsInvalid),
  run('preview + successful executive compose', testPreviewAndCompose),
  run('UI wiring to Report Center + Composer', testUiWiring),
  run('UI does not calculate KPIs', testNoDirectKpiInUi),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037B',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
