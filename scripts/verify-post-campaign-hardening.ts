/**
 * Post-campaign consistency: Ijtema snapshot window, campaign period, PWA update.
 * Run: npx vite-node scripts/verify-post-campaign-hardening.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getCampaignPeriodStatus } from '../src/services/campaignService'

const ended = {
  startDate: '2026-07-18',
  endDate: '2026-08-09',
}
assert.equal(getCampaignPeriodStatus(ended, new Date('2026-08-09T00:00:00')), 'active')
assert.equal(getCampaignPeriodStatus(ended, new Date('2026-08-10T00:00:00')), 'completed')
assert.equal(getCampaignPeriodStatus(ended, new Date('2026-08-15T00:00:00')), 'completed')
assert.equal(getCampaignPeriodStatus(ended, new Date('2026-07-17T00:00:00')), 'upcoming')
assert.equal(
  getCampaignPeriodStatus(
    { startDate: '2026-07-18', endDate: '2026-08-20' },
    new Date('2026-08-15T00:00:00'),
  ),
  'active',
)

const situation = readFileSync(resolve('src/lib/dashboard/organisationalSituation.ts'), 'utf8')
assert.match(situation, /getWeeklyIjtemaDashboardGenderPresent/)
assert.doesNotMatch(
  situation,
  /getWeeklyIjtemaDashboardKpi\(\{\s*audienceGender:\s*'Male'/,
)

const kpi = readFileSync(resolve('src/services/weeklyIjtemaService.ts'), 'utf8')
assert.match(kpi, /export function getWeeklyIjtemaDashboardGenderPresent/)
assert.match(kpi, /listOpenWeeklyIjtemaEvents\(\{ audienceGender: 'Male' \}\)/)

const campaignService = readFileSync(resolve('src/services/campaignService.ts'), 'utf8')
assert.match(campaignService, /getCampaignPeriodStatus\(campaign\) === 'active'/)
assert.match(campaignService, /getCampaignPeriodStatus\(campaign\) === 'completed'/)

const campaignCard = readFileSync(
  resolve('src/components/dashboard/CampaignsListPanel.tsx'),
  'utf8',
)
assert.match(campaignCard, /getCampaignPeriodStatus/)
assert.match(campaignCard, /Completed/)

const topBar = readFileSync(resolve('src/components/layout/AdminTopBar.tsx'), 'utf8')
assert.match(topBar, /timeline\?\.status === 'active' \? campaignName/)
assert.match(topBar, /کارکن کنیکٹ/)

const subtitle = readFileSync(resolve('src/components/layout/CampaignStatusBar.tsx'), 'utf8')
assert.match(subtitle, /timeline\?\.status === 'completed'/)
assert.match(subtitle, /Campaign Completed|dayLabel/)

const pwa = readFileSync(resolve('src/components/pwa/PwaRuntimeChrome.tsx'), 'utf8')
assert.match(pwa, /SW_UPDATE_CHECK_MS/)
assert.match(pwa, /updateServiceWorker\(true\)/)
assert.match(pwa, /visibilitychange/)
assert.match(pwa, /isAttendanceWorkflowPath\(location.pathname\)/)

const tagline = readFileSync(resolve('src/constants/app.ts'), 'utf8')
assert.match(tagline, /Campaign Execution Platform/)

console.log('OK: post-campaign hardening verification passed.')
