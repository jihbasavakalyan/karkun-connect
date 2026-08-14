/**
 * KC-038 — Campaign extension verification (timeline + seed only; no data reset).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOCK_CAMPAIGNS } from '../src/constants/mockMissions'
import {
  CAMPAIGN_EXTENDED_END_DATE,
  CAMPAIGN_EXTENSION_ANNOUNCEMENT_UR,
  CAMPAIGN_ORIGINAL_END_DATE,
  isCampaignEndExtended,
} from '../src/constants/campaignIdentity'
import { getCampaignTimeline, formatActiveCampaignDuration } from '../src/services/campaignService'

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

function testSeedEndDate(): void {
  const active = MOCK_CAMPAIGNS.find((c) => c.id === 'campaign-active')
  assert(Boolean(active), 'active campaign')
  assert(active!.startDate === '2026-07-18', 'start unchanged')
  assert(active!.endDate === CAMPAIGN_EXTENDED_END_DATE, 'end extended to 9 Aug')
  assert(active!.status === 'active', 'remains active')
  assert(isCampaignEndExtended(active!.endDate), 'extension detector')
  assert(active!.objectives.length === 7, 'extended objectives list')
}

function testTimelineRecalc(): void {
  // Mid-extension window: still active, remaining days from new end.
  const mid = getCampaignTimeline(new Date('2026-08-05T12:00:00'))
  assert(mid !== null, 'timeline')
  assert(mid!.status === 'active', 'still active on 5 Aug')
  assert(mid!.daysRemaining === 4, `days remaining expected 4 got ${mid!.daysRemaining}`)
  assert(mid!.totalDays === 23, `total days 18 Jul–9 Aug inclusive = 23 got ${mid!.totalDays}`)

  // Day after original end but before extension end.
  const afterOriginal = getCampaignTimeline(new Date('2026-08-03T12:00:00'))
  assert(afterOriginal!.status === 'active', 'not completed on 3 Aug')

  // After new end.
  const afterNew = getCampaignTimeline(new Date('2026-08-10T12:00:00'))
  assert(afterNew!.status === 'completed', 'completed after 9 Aug')
}

function testDurationLabel(): void {
  const label = formatActiveCampaignDuration()
  assert(label.includes('18 Jul 2026') || label.includes('18 July 2026'), `start in label: ${label}`)
  assert(label.includes('9 Aug 2026') || label.includes('9 August 2026'), `new end in label: ${label}`)
  assert(!label.includes('2 Aug 2026') && !label.includes('2 August 2026'), 'old end absent')
}

function testMessagingAndNoHardcodedOldEndInUiSeeds(): void {
  assert(CAMPAIGN_EXTENSION_ANNOUNCEMENT_UR.includes('9 اگست 2026'), 'announcement')
  assert(CAMPAIGN_ORIGINAL_END_DATE === '2026-08-02', 'original retained as constant')
  const mockSrc = readFileSync(resolve('src/constants/mockMissions.ts'), 'utf8')
  assert(mockSrc.includes("endDate: '2026-08-09'"), 'mock seed')
  assert(!mockSrc.includes("endDate: '2026-08-02'"), 'old end removed from mock')
  const notice = readFileSync(
    resolve('src/components/campaign/CampaignExtensionNotice.tsx'),
    'utf8',
  )
  assert(notice.includes('CAMPAIGN_EXTENSION_ANNOUNCEMENT_UR'), 'notice component')
  assert(notice.includes('CAMPAIGN_EXTENSION_ANNOUNCEMENT_TITLE_UR'), 'announcement title')
  assert(!notice.includes('CAMPAIGN_PHASE_LABELS'), 'no phase labels in notice')
  assert(!notice.includes('Extended Campaign'), 'no Extended Campaign')
  assert(!notice.includes('پہلا مرحلہ'), 'no phase 1 copy')
  assert(!notice.includes('دوسرا مرحلہ'), 'no phase 2 copy')

  const stack = readFileSync(
    resolve('src/components/dashboard/OrganisationalDashboardStack.tsx'),
    'utf8',
  )
  assert(!stack.includes('Phase II'), 'no Phase II in dashboard campaign card')
  assert(!stack.includes('Extended Campaign'), 'no Extended Campaign in dashboard campaign card')
  assert(stack.includes('<CampaignExtensionNotice'), 'notice mounted on compact campaign card')
  assert(
    (stack.match(/<CampaignExtensionNotice/g) ?? []).length === 1,
    'exactly one notice mount',
  )

  const home = readFileSync(resolve('src/components/home/AdminHomeHero.tsx'), 'utf8')
  assert(!home.includes('CampaignExtensionNotice'), 'no duplicate notice on AdminHomeHero')
  const rukn = readFileSync(resolve('src/components/home/RuknHomeHeader.tsx'), 'utf8')
  assert(!rukn.includes('CampaignExtensionNotice'), 'no duplicate notice on Rukn header')

  const identity = readFileSync(resolve('src/constants/campaignIdentity.ts'), 'utf8')
  assert(!identity.includes('CAMPAIGN_PHASE_LABELS'), 'phase labels removed')
  assert(identity.includes('اہم اعلان'), 'title constant')
}

const cases = [
  run('seed end date extended', testSeedEndDate),
  run('timeline recalculates from new end', testTimelineRecalc),
  run('duration label 18 Jul – 9 Aug', testDurationLabel),
  run('KC-038A polish: single announcement, no phase copy', testMessagingAndNoHardcodedOldEndInUiSeeds),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-038',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
process.exit(failed.length === 0 ? 0 : 1)
