/**
 * Increment 13 — Reports / رپورٹس curated landing + honest Composer navigation.
 * Run: npm run verify:increment-13-reports
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ADMIN_NAV_ITEMS, flattenAdminNavItems } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import { resolveNavigationTarget } from '@/conversation/mvp/navigationMap'
import {
  adminReportsComposerPath,
  buildReportsLandingSections,
  getReportPresentationKind,
  hasPurposeBuiltPdf,
  isKnownReportTypeId,
  reportPresentationKindLabel,
} from '@/lib/reporting/reportsLandingCatalog'
import { listAvailableReportTypes } from '@/lib/reporting/v2'

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

assert.equal(ROUTES.ADMIN_REPORTS, '/admin/reports')
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'reports')?.label,
  'رپورٹس',
)
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'reports')?.to,
  ROUTES.ADMIN_REPORTS,
)

assert.ok(isKnownReportTypeId('executive_campaign'))
assert.ok(isKnownReportTypeId('weekly_ijtema'))
assert.ok(isKnownReportTypeId('baitul_maal'))
assert.equal(adminReportsComposerPath('executive_campaign'), '/admin/reports?type=executive_campaign')
assert.equal(adminReportsComposerPath(), '/admin/reports?compose=1')

const sections = buildReportsLandingSections()
assert.ok(sections.some((section) => section.id === 'featured'))
assert.ok(sections.some((section) => section.id === 'campaigns'))
assert.ok(sections.some((section) => section.id === 'weekly_ijtema'))
assert.ok(sections.some((section) => section.id === 'baitul_maal'))
assert.ok(sections.some((section) => section.id === 'more'))

const featured = sections.find((section) => section.id === 'featured')
assert.ok(featured?.reports.some((report) => report.id === 'executive_campaign'))
assert.ok(featured?.reports.some((report) => report.id === 'campaign_progress'))
assert.match(featured?.title ?? '', /Featured/)

const weeklySection = sections.find((section) => section.id === 'weekly_ijtema')
assert.match(weeklySection?.description ?? '', /Per-event attendance/)
assert.match(weeklySection?.description ?? '', /Composer/)

const catalogIds = new Set(listAvailableReportTypes().map((report) => report.id))
const landingIds = new Set(sections.flatMap((section) => section.reports.map((report) => report.id)))
for (const id of catalogIds) {
  assert.ok(landingIds.has(id), `catalog type ${id} must appear somewhere on the landing`)
}

const exec = listAvailableReportTypes().find((r) => r.id === 'executive_campaign')
assert.ok(exec)
assert.equal(getReportPresentationKind(exec!), 'executive')
assert.equal(reportPresentationKindLabel('executive'), 'Executive')
assert.ok(hasPurposeBuiltPdf('executive_campaign'))
assert.ok(hasPurposeBuiltPdf('weekly_ijtema'))
assert.equal(hasPurposeBuiltPdf('campaign_progress'), false)

const page = read('src/pages/admin/AdminReportCenterPage.tsx')
assert.match(page, /رپورٹس/)
assert.match(page, /ReportsLandingPanel/)
assert.match(page, /ReportCenterPanel/)
assert.match(page, /initialReportType/)
assert.match(page, /useRepositoryHydrationStatus/)
assert.doesNotMatch(page, /title="Report Center"/)
assert.doesNotMatch(page, /Mission Workspace/)

const landing = read('src/components/reporting/ReportsLandingPanel.tsx')
assert.match(landing, /Configure &amp; Generate/)
assert.match(landing, /Open Report Composer/)
assert.match(landing, /does not download a PDF by itself/)
assert.match(landing, /section\.id === 'more'/)
assert.match(landing, /reports-more-title/)
assert.match(landing, /Purpose-built export/)
assert.match(landing, /Composer export/)

const catalog = read('src/lib/reporting/reportsLandingCatalog.ts')
assert.match(catalog, /More Reports/)
assert.match(catalog, /title: 'More Reports'/)
assert.match(catalog, /getReportPresentationKind/)
assert.match(catalog, /hasPurposeBuiltPdf/)

const panel = read('src/components/reporting/ReportCenterPanel.tsx')
assert.match(panel, /initialReportType/)
assert.match(panel, /generateConfiguredReport/)
assert.match(panel, /listReportTypes/)
assert.match(panel, /htmlFor/)
assert.match(panel, /fieldset/)
assert.match(panel, /role="alert"/)
assert.match(panel, /min-h-11/)

const button = read('src/components/reporting/GenerateCampaignReportButton.tsx')
assert.match(button, /ADMIN_REPORTS/)
assert.match(button, /type=executive_campaign/)
assert.match(button, /Does not download a PDF by itself/)
assert.match(button, /aria-label/)
assert.doesNotMatch(button, /downloadCampaignReportPdf/)

const navReports = resolveNavigationTarget('reports', 'administrator')
assert.equal(navReports?.route, ROUTES.ADMIN_REPORTS)
assert.equal(navReports?.label, 'رپورٹس')
const navRuknReports = resolveNavigationTarget('reports', 'rukn')
assert.equal(navRuknReports?.route, ROUTES.RUKN_CAMPAIGN_RECORD)

const quickActions = read('src/conversation/mvp/v2/quickActions.ts')
assert.match(quickActions, /ADMIN_REPORTS/)
assert.doesNotMatch(
  quickActions,
  /qa-reports[\s\S]*ADMIN_ACTIVITIES/,
)

const search = read('src/conversation/mvp/universalSearch.ts')
assert.match(search, /target: 'activities'/)
assert.doesNotMatch(
  search,
  /names: \['reports', 'report', 'رپورٹ', 'رپورٹس', 'activities'\]/,
)

const execution = read('src/pages/admin/ExecutionModulePage.tsx')
assert.match(execution, /label: 'Visit Records'/)
assert.doesNotMatch(execution, /id: 'reports', label: 'Reports'/)

const settings = read('src/components/settings/DataManagementSettingsSection.tsx')
assert.match(settings, /ADMIN_REPORTS/)
assert.match(settings, /Open Reports/)
assert.doesNotMatch(settings, /Open Execution Reports/)

const help = read('src/pages/admin/HelpPage.tsx')
assert.match(help, /Visit Records/)
assert.match(help, /ADMIN_REPORTS/)

const ruknLayout = read('src/layouts/RuknLayout.tsx')
assert.doesNotMatch(ruknLayout, /ADMIN_REPORTS/)
assert.match(ruknLayout, /label: 'Communication'/)

const rules = read('firestore.rules')
assert.match(rules, /match \/campaigns\/\{campaignId\}/)

console.log('OK: Increment 13 Reports verification passed.')
