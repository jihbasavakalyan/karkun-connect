/**
 * Dashboard information architecture — organisational situation view.
 * Run: npx vite-node scripts/verify-dashboard-ia-structure.ts
 *
 * Order: Hero → Ijtema → Meqati year → Shobah → Attention → Quick Actions →
 * important activities → campaign (if active) → deeper analytics
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

const hero = readFileSync(
  resolve('src/components/mission-control/AdminMissionControlHero.tsx'),
  'utf8',
)
const orgHero = readFileSync(
  resolve('src/components/dashboard/OrganisationalSituationHero.tsx'),
  'utf8',
)
const stack = readFileSync(
  resolve('src/components/dashboard/OrganisationalDashboardStack.tsx'),
  'utf8',
)
const command = readFileSync(
  resolve('src/components/mission-control/AdminCommandCenter.tsx'),
  'utf8',
)
const home = readFileSync(resolve('src/pages/admin/AdminHomePage.tsx'), 'utf8')
const quick = readFileSync(
  resolve('src/lib/missionControl/adminCommandCenterWorkflow.ts'),
  'utf8',
)
const picture = readFileSync(
  resolve('src/lib/missionControl/adminOrganisationalPicture.ts'),
  'utf8',
)
const css = readFileSync(resolve('src/index.css'), 'utf8')

assert(orgHero.includes('جماعت کی موجودہ صورتحال'), 'hero uses organisational title')
assert(orgHero.includes('میقاتی منصوبہ — موجودہ صورتحال'), 'hero subtitle is Meqati situation')
assert(!orgHero.includes('Campaign Progress'), 'hero has no campaign progress chrome')
assert(!hero.includes('exdash-hero-banner'), 'campaign-green banner removed from hero wrapper')
assert(orgHero.includes('yearSelection'), 'Meqati year selector is wired')
assert(orgHero.includes('ارکان'), 'people metric ارکان present')
assert(orgHero.includes('کارکنان'), 'people metric کارکنان present')
assert(orgHero.includes('متفقین'), 'people metric متفقین present')
assert(orgHero.includes('روابط'), 'connections metric present')
assert(stack.includes('ہفتہ وار اجتماع'), 'Ijtema snapshot present')
assert(stack.includes('ارکان کی حاضری رپورٹ'), 'Rukn attendance reporting kept separate')
assert(stack.includes('شرکاء کی حاضری سے الگ میٹرک'), 'participant vs Rukn attendance not combined')
assert(stack.includes('میقاتی منصوبہ — موجودہ سال'), 'current-year Meqati summary present')
assert(stack.includes('میقاتی منصوبہ — شعبہ وار صورتحال'), 'Shobah-wise table present')
assert(stack.includes('توجہ طلب'), 'compact attention present')
assert(stack.includes('تفصیل دیکھیں'), 'attention detail action present')
assert(stack.includes('اہم سرگرمیوں کی صورتحال'), 'important activities snapshot present')
assert(stack.includes('فعال مہم'), 'compact campaign card present')
assert(stack.includes('<AdminQuickActionsPanel'), 'Quick Actions mounted once in stack')
assert(!stack.includes("Today's Mission"), "Today's Mission removed from Dashboard")
assert(!stack.includes('Work Queue'), 'Work Queue removed from Dashboard')
assert(!command.includes('Open work'), 'Open work not on Dashboard command center')
assert(!command.includes('Open occurrences'), 'Open occurrences not on Dashboard command center')
assert(!command.includes("Today's Mission"), "Today's Mission not in command center")
assert(command.includes('OrganisationalDashboardStack'), 'command center renders organisational stack')
assert(home.includes('orgdash-page'), 'Admin home uses organisational page class')
assert(home.includes('AskDigitalRafeeqCard'), 'Rafeeq retained as assistance layer')
assert(quick.includes('کارکن شامل کریں'), 'quick action: add karkun')
assert(quick.includes('متفق شامل کریں'), 'quick action: add muttafiq')
assert(quick.includes('رکن تفویض کریں'), 'quick action: assign rukn')
assert(quick.includes('ذمہ داری شامل کریں'), 'quick action: assign responsible to activity')
assert(quick.includes('سرگرمی کی تازہ کاری'), 'quick action: update activity')
assert(quick.includes('تربیت و رہنمائی'), 'quick action: tarbiyah shortcut')
assert(quick.includes('اجتماع ہفتہ وار'), 'quick action: weekly ijtema')
assert(quick.includes('بیت المال'), 'quick action: baitul maal')
assert(!quick.includes("label: 'Record Visit'"), 'Visit is not a global Quick Action')
assert(picture.includes('Open work'), 'Open work remains in internal picture helper (not deleted)')
assert(css.includes('.orgdash-hero'), 'organisational hero styles present')
assert(css.includes('background: #ffffff'), 'organisational cards are white, not campaign-green')

const ijtemaIdx = stack.indexOf('<IjtemaSnapshot')
const meqatiIdx = stack.indexOf('<MeqatiYearSummary')
const shobahIdx = stack.indexOf('<ShobahStatusSection')
const attentionIdx = stack.indexOf('<AttentionCompact')
const quickIdx = stack.indexOf('<AdminQuickActionsPanel')
const importantIdx = stack.indexOf('<ImportantActivities')
const campaignIdx = stack.indexOf('<ActiveCampaignCompact')
const healthIdx = stack.indexOf('<CampaignHealthPanel')
const trendsIdx = stack.indexOf('<ProgressTrendsPanel')
assert(ijtemaIdx > 0, 'Ijtema snapshot rendered')
assert(meqatiIdx > ijtemaIdx, 'Meqati year after Ijtema')
assert(shobahIdx > meqatiIdx, 'Shobah after Meqati year')
assert(attentionIdx > shobahIdx, 'Attention after Shobah')
assert(quickIdx > attentionIdx, 'Quick Actions after Attention')
assert(importantIdx > quickIdx, 'Important activities after Quick Actions')
assert(campaignIdx > importantIdx, 'Campaign after important activities')
assert(healthIdx > campaignIdx, 'Campaign Health moved to deeper analytics')
assert(trendsIdx > healthIdx, 'Trends after Health')

console.log('Dashboard IA structure verification passed (organisational situation).')
