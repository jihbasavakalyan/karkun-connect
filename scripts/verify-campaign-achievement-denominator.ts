/**
 * Campaign Achievement Progress — Karkun-only denominator (excludes Muttafiqeen).
 * Run: npx vite-node scripts/verify-campaign-achievement-denominator.ts
 */

import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { buildAdminCampaignAchievementProgress } from '../src/lib/missionControl/adminMissionControlPresentation'
import {
  getPersonCategory,
  isCampaignEligible,
  isMuttafiq,
} from '../src/lib/peopleClassification'
import {
  createKarkun,
  createMuttafiq,
  getAllKarkuns,
  getAllMuttafiqeen,
  getPeopleStatistics,
} from '../src/lib/peopleStore'
import { resetRepositoryProviderForTests } from '../src/repositories/provider'
import { DEFAULT_PLACE } from '../src/types/people.types'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`)
  console.log(`OK: ${message}`)
}

function resetRegistry(): void {
  resetRepositoryProviderForTests()
  MOCK_KARKUN_REGISTRY.length = 0
}

function main(): void {
  console.info('[campaign-achievement] denominator verification starting')
  resetRegistry()

  createKarkun({
    name: 'Achievement Karkun A',
    gender: 'Male',
    mobile: '9000000001',
    place: DEFAULT_PLACE,
  })
  createKarkun({
    name: 'Achievement Karkun B',
    gender: 'Female',
    mobile: '9000000002',
    place: DEFAULT_PLACE,
  })
  createKarkun({
    name: 'Achievement Karkun C',
    gender: 'Male',
    mobile: '9000000003',
    place: DEFAULT_PLACE,
  })
  createMuttafiq({
    name: 'Achievement Muttafiq 1',
    gender: 'Male',
    mobile: '9000000004',
    place: DEFAULT_PLACE,
  })
  createMuttafiq({
    name: 'Achievement Muttafiq 2',
    gender: 'Female',
    mobile: '9000000005',
    place: DEFAULT_PLACE,
  })

  const karkuns = getAllKarkuns()
  const muttafiqeen = getAllMuttafiqeen()
  const stats = getPeopleStatistics()
  const peopleTotal = stats.totalPeople ?? karkuns.length + muttafiqeen.length
  const achievement = buildAdminCampaignAchievementProgress()

  console.log(
    JSON.stringify(
      {
        karkunRegistry: karkuns.length,
        muttafiqeen: muttafiqeen.length,
        peopleRegistry: peopleTotal,
        overallPct: achievement.overallPct,
        metrics: achievement.metrics,
      },
      null,
      2,
    ),
  )

  assert(karkuns.length === 3, 'Karkun Registry has 3 members')
  assert(muttafiqeen.length === 2, 'Muttafiqeen Registry has 2 members')
  assert(peopleTotal === 5, 'People Registry is Karkuns + Muttafiqeen')
  assert(peopleTotal !== karkuns.length, 'People Registry differs from Karkun Registry')

  assert(karkuns.every((p) => getPersonCategory(p) === 'Karkun'), 'Karkun pool is category Karkun')
  assert(karkuns.every((p) => isCampaignEligible(p)), 'Karkun pool is campaign-eligible')
  assert(karkuns.every((p) => !isMuttafiq(p)), 'Karkun pool excludes Muttafiqeen')
  assert(muttafiqeen.every((p) => isMuttafiq(p)), 'Muttafiqeen pool is Muttafiq only')
  assert(
    muttafiqeen.every((p) => !isCampaignEligible(p)),
    'Muttafiqeen are not campaign-eligible',
  )

  for (const metric of achievement.metrics) {
    assert(
      metric.total === karkuns.length,
      `${metric.id} denominator equals Karkun Registry (${metric.total} === ${karkuns.length})`,
    )
    assert(
      metric.total !== peopleTotal,
      `${metric.id} denominator is not People Registry (${metric.total} !== ${peopleTotal})`,
    )
    assert(
      metric.pct ===
        (metric.total <= 0 ? 0 : Math.round((metric.current / metric.total) * 1000) / 10),
      `${metric.id} percentage uses Karkun denominator`,
    )
  }

  assert(
    achievement.metrics.every((m) => m.total === achievement.metrics[0]!.total),
    'all metrics share the same Karkun denominator',
  )

  const expectedOverall =
    Math.round(
      (achievement.metrics.reduce((sum, m) => sum + m.pct, 0) / achievement.metrics.length) * 10,
    ) / 10
  assert(
    achievement.overallPct === expectedOverall,
    'overall progress averages corrected percentages',
  )

  console.info('[campaign-achievement] denominator verification passed')
}

main()
