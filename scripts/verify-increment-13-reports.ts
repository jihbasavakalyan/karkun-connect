/**
 * Increment 13 — Reports / رپورٹس curated landing.
 * Run: npm run verify:increment-13-reports
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ADMIN_NAV_ITEMS, flattenAdminNavItems } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import {
  adminReportsComposerPath,
  buildReportsLandingSections,
  isKnownReportTypeId,
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

const catalogIds = new Set(listAvailableReportTypes().map((report) => report.id))
const landingIds = new Set(sections.flatMap((section) => section.reports.map((report) => report.id)))
for (const id of catalogIds) {
  assert.ok(landingIds.has(id), `catalog type ${id} must appear somewhere on the landing`)
}

const page = read('src/pages/admin/AdminReportCenterPage.tsx')
assert.match(page, /رپورٹس/)
assert.match(page, /ReportsLandingPanel/)
assert.match(page, /ReportCenterPanel/)
assert.match(page, /initialReportType/)
assert.doesNotMatch(page, /title="Report Center"/)
assert.doesNotMatch(page, /Mission Workspace/)

const landing = read('src/components/reporting/ReportsLandingPanel.tsx')
assert.match(landing, /Configure &amp; Generate/)
assert.match(landing, /Open Report Composer/)
assert.match(landing, /does not download a PDF by itself/)
assert.match(landing, /section\.id === 'more'/)
assert.match(landing, /reports-more-title/)

const catalog = read('src/lib/reporting/reportsLandingCatalog.ts')
assert.match(catalog, /More Reports/)
assert.match(catalog, /title: 'More Reports'/)

const panel = read('src/components/reporting/ReportCenterPanel.tsx')
assert.match(panel, /initialReportType/)
assert.match(panel, /generateConfiguredReport/)
assert.match(panel, /listReportTypes/)

const button = read('src/components/reporting/GenerateCampaignReportButton.tsx')
assert.match(button, /ADMIN_REPORTS/)
assert.match(button, /type=executive_campaign/)
assert.doesNotMatch(button, /downloadCampaignReportPdf/)

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
