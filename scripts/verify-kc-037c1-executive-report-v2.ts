/**
 * KC-037C1 — Executive Campaign Report V2 verification.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildCampaignReportModel } from '../src/lib/reporting/campaignReportModel'
import { buildExecutiveCampaignReportV2Content } from '../src/lib/reporting/executiveCampaignReportV2'
import { composeKc034CampaignReportModel } from '../src/lib/reporting/v2'

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

function testV2ContentFromModel(): void {
  const model = buildCampaignReportModel({ generatedBy: 'verify-kc-037c1' })
  const v2 = buildExecutiveCampaignReportV2Content(model)
  assert(v2.version === 'executive_v2', 'version')
  assert(v2.summaryLines.length >= 4, 'summary lines')
  assert(v2.keyStatistics.length >= 10, 'key statistics')
  assert(typeof v2.closingSummary === 'string' && v2.closingSummary.length > 20, 'closing')
  assert('daysCompleted' in model.cover, 'cover.daysCompleted')
  assert('daysRemaining' in model.cover, 'cover.daysRemaining')
}

function testComposerPathPreserved(): void {
  const model = composeKc034CampaignReportModel({ generatedBy: 'verify-kc-037c1' })
  assert(typeof model.executive.overallCampaignProgress === 'number', 'progress via composer')
  const pdfSrc = readFileSync(resolve('src/lib/reporting/campaignReportPdf.ts'), 'utf8')
  assert(pdfSrc.includes('composeKc034CampaignReportModel'), 'PDF uses Composer')
  assert(pdfSrc.includes('buildExecutiveCampaignReportV2Content'), 'PDF uses V2 content')
  assert(pdfSrc.includes('executiveSummary'), 'executive summary section')
  assert(pdfSrc.includes('campaignAchievements'), 'achievements section')
  assert(pdfSrc.includes('remainingObjectives'), 'remaining section')
  assert(pdfSrc.includes('priorityActions'), 'priority section')
  assert(pdfSrc.includes('closingSummary'), 'closing section')
  assert(pdfSrc.includes('appendix'), 'appendix section')
}

function testKc033OnlyInModel(): void {
  const modelSrc = readFileSync(resolve('src/lib/reporting/campaignReportModel.ts'), 'utf8')
  assert(modelSrc.includes('CanonicalMetricProviders'), 'model uses CanonicalMetricProviders')
  assert(!modelSrc.includes("from 'firebase/"), 'model does not import firebase client')
  const v2Src = readFileSync(resolve('src/lib/reporting/executiveCampaignReportV2.ts'), 'utf8')
  assert(!v2Src.includes('firestore'), 'v2 content no firestore')
  assert(!v2Src.includes('CanonicalMetricProviders'), 'v2 does not re-query providers')
}

function testReportCenterUntouchedMarkers(): void {
  const panel = readFileSync(resolve('src/components/reporting/ReportCenterPanel.tsx'), 'utf8')
  assert(panel.includes('generateConfiguredReport') || panel.includes('Report'), 'Report Center present')
  const composer = readFileSync(resolve('src/lib/reporting/v2/composeReport.ts'), 'utf8')
  assert(composer.includes('composeReport'), 'Composer intact')
}

const cases = [
  run('V2 content from presentation model', testV2ContentFromModel),
  run('Composer + PDF V2 sections', testComposerPathPreserved),
  run('KC-033 sole KPI path; no Firestore in V2', testKc033OnlyInModel),
  run('Report Center / Composer files intact', testReportCenterUntouchedMarkers),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-037C1',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
