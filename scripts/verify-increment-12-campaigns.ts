/**
 * Increment 12 — Campaigns / مہمات library hub (Option D).
 * Presentation only: Current/Active vs Previous/Archived + links into existing ops.
 * Run: npm run verify:increment-12-campaigns
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ADMIN_NAV_ITEMS, findActiveAdminNavItem, flattenAdminNavItems } from '@/constants/adminNavigation'
import {
  adminCompliancePath,
  adminExecutionPath,
  adminFollowUpPath,
  ROUTES,
} from '@/constants/routes'
import {
  getActiveCampaigns,
  getArchivedCampaigns,
  getCampaignPeriodStatus,
} from '@/services/campaignService'

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

assert.equal(ROUTES.ADMIN_CAMPAIGN, '/admin/campaign')
assert.equal(ROUTES.ADMIN_CAMPAIGN_SETUP, '/admin/campaign/setup')
assert.equal(ROUTES.ADMIN_REPORTS, '/admin/reports')
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'campaign')?.label,
  'مہمات',
)
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'campaign')?.to,
  ROUTES.ADMIN_CAMPAIGN,
)
assert.ok(!flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.id === 'tarbiyah'))
assert.ok(
  !flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.label === 'تربیت و رہنمائی'),
)
assert.equal(adminFollowUpPath(), '/admin/operations?tab=queue')
assert.equal(adminExecutionPath(), '/admin/operations?tab=execute')
assert.equal(adminCompliancePath(), '/admin/operations?tab=review')

assert.equal(findActiveAdminNavItem('/admin/operations', '?tab=queue')?.id, 'campaign')
assert.equal(findActiveAdminNavItem('/admin/operations', '?tab=execute')?.id, 'campaign')
assert.equal(findActiveAdminNavItem('/admin/operations', '?tab=review')?.id, 'campaign')
assert.equal(findActiveAdminNavItem('/admin/reports', '')?.id, 'reports')

const periodEnded = { startDate: '2026-07-18', endDate: '2026-08-09' }
assert.equal(getCampaignPeriodStatus(periodEnded, new Date('2026-08-10T00:00:00')), 'completed')
assert.equal(getCampaignPeriodStatus(periodEnded, new Date('2026-08-05T00:00:00')), 'active')

// Service semantics for Current vs Previous lists remain date + library status.
assert.ok(typeof getActiveCampaigns === 'function')
assert.ok(typeof getArchivedCampaigns === 'function')

const page = read('src/pages/admin/CampaignsPage.tsx')
assert.match(page, /مہمات/)
assert.match(page, /CampaignsListPanel/)
assert.match(page, /CampaignLibraryWorkStrip/)
assert.match(page, /GenerateCampaignReportButton/)
assert.match(page, /ADMIN_CAMPAIGN_SETUP/)
assert.match(page, /does\s+not create or update a durable campaign document/)
assert.match(page, /useRepositoryHydrationStatus/)
assert.doesNotMatch(page, /MissionWorkspace/)
assert.doesNotMatch(page, /ADMIN_MISSION_WORKSPACE/)

const panel = read('src/components/dashboard/CampaignsListPanel.tsx')
assert.match(panel, /getCampaignPeriodStatus/)
assert.match(panel, /Completed/)
assert.match(panel, /Current \/ Active/)
assert.match(panel, /Previous \/ Archived/)
assert.match(panel, /adminFollowUpPath/)
assert.match(panel, /adminExecutionPath/)
assert.match(panel, /adminCompliancePath/)
assert.match(panel, /ADMIN_REPORTS/)
assert.match(panel, /Follow-up \(تربیت و رہنمائی\)/)
assert.match(panel, /Campaign Execution/)
assert.match(panel, /Review/)
assert.match(panel, /Reports/)
assert.match(panel, /getCampaignProgress/)
assert.match(panel, /Period completed\. Library status remains active/)
assert.doesNotMatch(panel, /shadow-card/)
assert.doesNotMatch(panel, /Mission Workspace/)
assert.doesNotMatch(panel, /Work Queue/)

const launch = read('src/components/forms/campaign-setup/StepLaunchCampaign.tsx')
assert.match(launch, /Setup preview complete/)
assert.match(launch, /No durable\s+campaign document was created or updated/)
assert.doesNotMatch(launch, /Campaign Launched/)
assert.doesNotMatch(launch, /is now active and ready for field execution/)

const setupPage = read('src/pages/admin/CampaignSetupPage.tsx')
assert.match(setupPage, /does not create a durable campaign document/)

const repo = read('src/repositories/interfaces/CampaignRepository.ts')
assert.match(repo, /savePlanningLinksDurable/)
assert.doesNotMatch(repo, /createCampaign/)
assert.doesNotMatch(repo, /archiveCampaign/)

const ruknLayout = read('src/layouts/RuknLayout.tsx')
assert.doesNotMatch(ruknLayout, /ADMIN_CAMPAIGN/)
assert.match(ruknLayout, /label: 'Communication'/)
assert.equal(
  (ruknLayout.match(/label: '/g) || []).length >= 5,
  true,
)

const rules = read('firestore.rules')
// Increment 12 must not touch Rules — spot-check campaigns match still Admin write.
assert.match(rules, /match \/campaigns\/\{campaignId\}/)

const router = read('src/routes/AppRouter.tsx')
assert.match(router, /path="campaign" element=\{<CampaignsPage \/>\}/)
assert.match(router, /path="campaign\/setup" element=\{<CampaignSetupPage \/>\}/)
assert.doesNotMatch(router, /path="campaign\/:id"/)

console.log('OK: Increment 12 Campaigns library hub verification passed.')
