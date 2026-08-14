/**
 * Dashboard information architecture — organisational situation view.
 * Run: npx vite-node scripts/verify-dashboard-ia-structure.ts
 *
 * Order: Hero → Ijtema → Meqati year → Shobah → Attention → Quick Actions →
 * important ongoing activities → campaign (contextual) → Rafeeq
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
const nav = readFileSync(resolve('src/constants/adminNavigation.ts'), 'utf8')
const css = readFileSync(resolve('src/index.css'), 'utf8')

assert(orgHero.includes('جماعت کی موجودہ صورتحال'), 'hero uses organisational title')
assert(orgHero.includes('میقاتی منصوبہ — موجودہ صورتحال'), 'hero subtitle is Meqati situation')
assert(!orgHero.includes('Campaign Progress'), 'hero has no campaign progress chrome')
assert(!orgHero.includes('McProgressRing'), 'empty/duplicate progress ring removed from hero')
assert(!hero.includes('exdash-hero-banner'), 'campaign-green banner removed from hero wrapper')
assert(orgHero.includes('yearSelection'), 'Meqati year selector is wired')
assert(orgHero.includes('ارکان'), 'people metric ارکان present')
assert(orgHero.includes('کارکنان'), 'people metric کارکنان present')
assert(orgHero.includes('متفقین'), 'people metric متفقین present')
assert(orgHero.includes('باہمی ربط'), 'relationship metric باہمی ربط present')
assert(!orgHero.includes('روابط'), 'old روابط label not used on hero')
assert(stack.includes('ہفتہ وار اجتماع'), 'Ijtema snapshot present')
assert(stack.includes('ارکان کی حاضری رپورٹ'), 'Rukn attendance reporting kept separate')
assert(stack.includes('شرکاء کی حاضری سے الگ میٹرک'), 'participant vs Rukn attendance not combined')
assert(stack.includes('میقاتی منصوبہ — موجودہ سال'), 'current-year Meqati summary present')
assert(stack.includes('میقاتی منصوبہ کا ڈیٹا ابھی درج نہیں کیا گیا'), 'refined empty Meqati copy')
assert(stack.includes('میقاتی منصوبہ دیکھیں'), 'empty state links to Planning')
assert(stack.includes('میقاتی منصوبہ — شعبہ وار صورتحال'), 'Shobah-wise table present')
assert(stack.includes('توجہ طلب'), 'compact attention present')
assert(stack.includes('اہم جاری سرگرمیاں'), 'ongoing activities snapshot present')
assert(stack.includes('فعال مہم: کوئی فعال مہم نہیں'), 'quiet inactive campaign line')
assert(stack.includes('<AdminQuickActionsPanel'), 'Quick Actions mounted once in stack')
assert(!stack.includes("Today's Mission"), "Today's Mission removed from Dashboard")
assert(!stack.includes('Work Queue'), 'Work Queue removed from Dashboard')
assert(!stack.includes('CampaignHealthPanel'), 'Campaign Health removed from Home')
assert(!stack.includes('ProgressTrendsPanel'), 'Campaign Trends removed from Home')
assert(!stack.includes('ActivityTimeline'), 'campaign Activity Timeline removed from Home')
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
assert(quick.includes('سرگرمی کی صورتحال'), 'quick action: activity status')
assert(!quick.includes('سرگرمی کی تازہ کاری'), 'old activity update label removed')
assert(quick.includes('تربیت و رہنمائی'), 'quick action: tarbiyah shortcut')
assert(quick.includes('ہفتہ وار اجتماع'), 'quick action: weekly ijtema')
assert(quick.includes('بیت المال'), 'quick action: baitul maal')
assert(!quick.includes("label: 'Record Visit'"), 'Visit is not a global Quick Action')
assert(picture.includes('Open work'), 'Open work remains in internal picture helper (not deleted)')
assert(css.includes('.orgdash-hero'), 'organisational hero styles present')
assert(css.includes('background: #ffffff'), 'organisational cards are white, not campaign-green')
assert(nav.includes("label: 'میقاتی منصوبہ'"), 'sidebar contains میقاتی منصوبہ')
assert(nav.includes("label: 'باہمی ربط'"), 'sidebar contains باہمی ربط')
assert(nav.includes("label: 'ہوم'"), 'sidebar Home is landing, not a module named Dashboard')
assert(!nav.includes("label: 'Activities'"), 'sidebar does not contain generic Activities')
assert(!nav.includes('جاری سرگرمیاں'), 'sidebar does not contain جاری سرگرمیاں')
assert(!nav.includes("label: 'تنظیم'"), 'sidebar does not group people as تنظیم')
assert(!nav.includes("label: 'Planning'"), 'sidebar does not use English Planning')
assert(!nav.includes("label: 'Dashboard'"), 'sidebar does not treat Dashboard as a module')

const ijtemaIdx = stack.indexOf('<IjtemaSnapshot')
const meqatiIdx = stack.indexOf('<MeqatiYearSummary')
const shobahIdx = stack.indexOf('<ShobahStatusSection')
const attentionIdx = stack.indexOf('<AttentionCompact')
const quickIdx = stack.indexOf('<AdminQuickActionsPanel')
const importantIdx = stack.indexOf('<ImportantActivities')
const campaignIdx = stack.indexOf('<ActiveCampaignCompact')
assert(ijtemaIdx > 0, 'Ijtema snapshot rendered')
assert(meqatiIdx > ijtemaIdx, 'Meqati year after Ijtema')
assert(shobahIdx > meqatiIdx, 'Shobah after Meqati year')
assert(attentionIdx > shobahIdx, 'Attention after Shobah')
assert(quickIdx > attentionIdx, 'Quick Actions after Attention')
assert(importantIdx > quickIdx, 'Important activities after Quick Actions')
assert(campaignIdx > importantIdx, 'Campaign after important activities')

console.log('Dashboard IA structure verification passed (organisational situation).')
