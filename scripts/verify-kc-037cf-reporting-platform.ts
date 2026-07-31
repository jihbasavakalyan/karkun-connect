/**
 * KC-037C-F — Reporting & BI platform verification.
 */
import {
  blueprintSectionsFor,
  buildProviderInsights,
  composeReport,
  createReportContext,
  defaultKc034Config,
  getScoringConfig,
  listAvailableReportTypes,
  listBuiltinTemplates,
  listReportTypes,
  registerBuiltinSections,
  resetSectionRegistryForTests,
  scoreFromPairs,
  setScoringWeights,
  validateReportConfig,
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

function ensure(): void {
  resetSectionRegistryForTests()
  registerBuiltinSections({ force: true })
}

function testAllTypesCompose(): void {
  ensure()
  const types = listAvailableReportTypes()
  assert(types.length >= 18, 'suite available')
  for (const t of types) {
    const sections = blueprintSectionsFor(t.id).filter((id) => {
      // individual karkun without person still composes (missing payload)
      return true
    })
    const config = defaultKc034Config({
      reportType: t.id,
      enabledSections: sections,
      outputType: 'json',
      scopeTarget:
        t.id === 'individual_rukn'
          ? { ruknId: 'R001' }
          : t.id === 'individual_karkun'
            ? { personId: 'kr-001' }
            : undefined,
    })
    const diagnostics = validateReportConfig(config)
    assert(diagnostics.ok, `${t.id} validates: ${diagnostics.errors.map((e) => e.message).join('; ')}`)
    const doc = composeReport(config)
    assert(doc.sections.length > 0, `${t.id} composes sections`)
  }
}

function testExportsAndDashboardConfig(): void {
  ensure()
  for (const output of ['pdf', 'dashboard', 'excel', 'csv', 'json'] as const) {
    const config = defaultKc034Config({
      reportType: 'men_performance',
      enabledSections: blueprintSectionsFor('men_performance'),
      outputType: output,
    })
    assert(validateReportConfig(config).ok, `${output} validates`)
  }
}

function testTemplatesAndScoring(): void {
  ensure()
  const templates = listBuiltinTemplates()
  assert(templates.length >= 10, 'builtin templates')
  assert(templates.some((t) => t.id === 'men_review'), 'men template')
  const before = getScoringConfig('individual_rukn').weights.visits
  setScoringWeights('individual_rukn', { visits: 0.4 })
  assert(getScoringConfig('individual_rukn').weights.visits === 0.4, 'weights configurable')
  setScoringWeights('individual_rukn', { visits: before })
  const score = scoreFromPairs({
    connections: { pct: 100 },
    visits: { pct: 100 },
    appRegistration: { pct: 100 },
    weeklyIjtema: { pct: 100 },
    baitulMaal: { pct: 100 },
  })
  assert(score === 100, 'score from pairs')
}

function testInsightsFromProviders(): void {
  ensure()
  const ctx = createReportContext(defaultKc034Config())
  const items = buildProviderInsights(ctx)
  assert(items.length > 0, 'insights produced')
  assert(items.every((i) => i.source === 'provider' || i.source === 'rafeeq'), 'sources')
}

function testExecutiveStillComposes(): void {
  ensure()
  const doc = composeReport(defaultKc034Config())
  assert(
    doc.sections.some((s) => s.definition.id === 'kc034_executive_campaign'),
    'kc034 present',
  )
}

function testConnectionVisitSeparation(): void {
  ensure()
  const doc = composeReport(
    defaultKc034Config({
      reportType: 'visit_progress',
      enabledSections: blueprintSectionsFor('visit_progress'),
    }),
  )
  const visits = doc.sections.find((s) => s.definition.id === 'visits')
  assert(Boolean(visits), 'visits section')
  const payload = JSON.stringify(visits?.model.data ?? {})
  assert(payload.includes('Visit') || payload.includes('visit') || payload.includes('دور'), 'visit labeled')
}

const cases = [
  run('all available report types compose via Composer', testAllTypesCompose),
  run('pdf/dashboard/excel/csv/json configs validate', testExportsAndDashboardConfig),
  run('templates + configurable scoring', testTemplatesAndScoring),
  run('Rafeeq/provider insights from KC-033 path', testInsightsFromProviders),
  run('executive KC-034 still composes', testExecutiveStillComposes),
  run('visit report distinguishes visits', testConnectionVisitSeparation),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037C-F',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
      reportTypeCount: listReportTypes().length,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
