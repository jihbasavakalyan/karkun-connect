/**
 * KC-0061 — narrow promotion-state hydrate merge (Decision C).
 * Run: npm run verify:kc0061.hydrate
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mergeKarkunPromotionStateOnHydrate } from '@/repositories/firestore/karkunPromotionHydrateMerge'
import { DEFAULT_PLACE } from '@/types/people.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function baseKarkun(
  id: string,
  extras: Partial<KarkunRegistryRecord> = {},
): KarkunRegistryRecord {
  const now = '2026-09-06T00:00:00.000Z'
  return {
    id,
    name: id,
    gender: 'Male',
    mobile: '9000000000',
    place: DEFAULT_PLACE,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Verification',
    address: '',
    area: '',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
    category: 'Karkun',
    ...extras,
  }
}

console.log('verify-kc0061-promotion-hydrate-merge: start')

{
  const repo = read('src/repositories/firestore/firestoreRepositories.ts')
  assert(
    repo.includes('mergeKarkunPromotionStateOnHydrate(karkunCache.get().karkuns, karkuns)'),
    'applyCriticalHydratePayload merges promotion state before karkunCache.set',
  )
  assert(!repo.includes('sourcePersonId'), 'hydrate merge does not consult sourcePersonId')
}

{
  const previous = [baseKarkun('kr-a')]
  const incoming = [baseKarkun('kr-a')]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.promotedToARuknId === undefined, '1. previous empty + incoming empty stays missing')
  assert(
    merged.aRuknPromotionInProgress === undefined,
    '1. in-progress stays missing when both omit it',
  )
}

{
  const previous = [baseKarkun('kr-a')]
  const incoming = [baseKarkun('kr-a', { promotedToARuknId: 'AR01' })]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.promotedToARuknId === 'AR01', '2. incoming AR01 wins over previous empty')
}

{
  const previous = [baseKarkun('kr-a', { promotedToARuknId: 'AR01' })]
  const incoming = [baseKarkun('kr-a', { promotedToARuknId: 'AR01' })]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.promotedToARuknId === 'AR01', '3. matching AR01 uses incoming')
}

{
  const previous = [baseKarkun('kr-a', { promotedToARuknId: 'AR01' })]
  const incoming = [baseKarkun('kr-a')]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.promotedToARuknId === 'AR01', '4. missing incoming keeps previous AR01')
  assert(!('promotedToARuknId' in incoming[0]), '4. incoming fixture omitted the key')
}

{
  const previous = [baseKarkun('kr-a', { promotedToARuknId: 'AR01' })]
  const incoming = [baseKarkun('kr-a', { promotedToARuknId: '' })]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.promotedToARuknId === 'AR01', '5. empty-string incoming keeps previous AR01')
}

{
  const previous = [baseKarkun('kr-a', { promotedToARuknId: 'AR01' })]
  const incoming = [baseKarkun('kr-a', { promotedToARuknId: 'AR02' })]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.promotedToARuknId === 'AR02', '6. non-empty incoming AR02 wins')
}

{
  const previous = [baseKarkun('kr-a', { aRuknPromotionInProgress: true })]
  const incoming = [baseKarkun('kr-a')]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.aRuknPromotionInProgress === true, '7. missing incoming keeps in-progress true')
}

{
  const previous = [baseKarkun('kr-a', { aRuknPromotionInProgress: true })]
  const incoming = [baseKarkun('kr-a', { aRuknPromotionInProgress: false })]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(
    merged.aRuknPromotionInProgress === true,
    '8a. incoming false without a promotion id does not drop in-progress',
  )
}

{
  const previous = [baseKarkun('kr-a', { aRuknPromotionInProgress: true })]
  const incoming = [
    baseKarkun('kr-a', { promotedToARuknId: 'AR01', aRuknPromotionInProgress: false }),
  ]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.promotedToARuknId === 'AR01', '8b. completed incoming keeps AR01')
  assert(
    merged.aRuknPromotionInProgress === false,
    '8b. completed incoming (AR## + false) uses incoming false',
  )
}

{
  const previous = [
    baseKarkun('kr-a', {
      promotedToARuknId: 'AR01',
      assignmentStatus: 'Assigned',
      assignedRuknId: 'R001',
      assignedRukn: 'Old',
      assignmentDate: '2026-01-01',
      campaignStatus: 'active',
    }),
  ]
  const incoming = [
    baseKarkun('kr-a', {
      assignmentStatus: 'Available',
      assignedRuknId: '',
      assignedRukn: '',
      campaignStatus: 'not_assigned',
    }),
  ]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.promotedToARuknId === 'AR01', '9. promotion id preserved')
  assert(merged.assignmentStatus === 'Available', '9. assignmentStatus comes from incoming')
  assert(merged.assignedRuknId === '', '9. assignedRuknId comes from incoming')
  assert(merged.assignedRukn === '', '9. assignedRukn comes from incoming')
  assert(merged.assignmentDate === undefined, '9. assignmentDate comes from incoming')
  assert(merged.campaignStatus === 'not_assigned', '9. campaignStatus comes from incoming')
}

{
  const previous = [baseKarkun('kr-legacy')]
  const incoming = [baseKarkun('kr-legacy')]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(!('promotedToARuknId' in merged), '10. legacy remains without promotedToARuknId key')
  assert(!('aRuknPromotionInProgress' in merged), '10. legacy remains without in-progress key')
}

{
  const previous = [baseKarkun('kr-a', { promotedToARuknId: 'AR01' })]
  const incoming = [baseKarkun('kr-b')]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.id === 'kr-b', '11. result is the incoming id')
  assert(merged.promotedToARuknId === undefined, '11. other ids do not inherit AR01')
}

{
  const previous = [
    baseKarkun('kr-test', {
      promotedToARuknId: 'AR01',
      assignmentStatus: 'Assigned',
      assignedRuknId: 'R009',
    }),
  ]
  const incoming = [
    baseKarkun('kr-test', {
      assignmentStatus: 'Available',
      assignedRuknId: '',
    }),
  ]
  assert(!('promotedToARuknId' in incoming[0]), 'KC-0061 incoming omitted promotedToARuknId')
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.promotedToARuknId === 'AR01', 'KC-0061 hydrate must not regress AR01')
  assert(merged.assignmentStatus === 'Available', 'KC-0061 assignmentStatus from incoming')
  assert(merged.assignedRuknId === '', 'KC-0061 assignedRuknId from incoming')
}

{
  const previous: KarkunRegistryRecord[] = []
  const incoming = [baseKarkun('kr-new', { promotedToARuknId: 'AR01' })]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.promotedToARuknId === 'AR01', 'no previous row uses incoming as-is')
}

{
  const previous = [baseKarkun('kr-a', { aRuknPromotionInProgress: true })]
  const incoming = [baseKarkun('kr-a', { aRuknPromotionInProgress: true })]
  const [merged] = mergeKarkunPromotionStateOnHydrate(previous, incoming)
  assert(merged.aRuknPromotionInProgress === true, 'incoming true is used')
}

console.log('verify-kc0061-promotion-hydrate-merge: ok')
