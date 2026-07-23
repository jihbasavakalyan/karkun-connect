/**
 * KC-0103 — Exclusive People classification verification.
 * Run: npx vite-node scripts/verify-kc0103-exclusive-classification.ts
 */

import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import { resetRepositoryProviderForTests } from '../src/repositories/provider'
import {
  canAssignKarkun,
  getAvailableKarkunan,
} from '../src/lib/assignmentEngine'
import {
  explainCanonicalExclusions,
} from '../src/lib/connections/explainCanonicalExclusions'
import { getCanonicalConnectedAssignments } from '../src/lib/connections/getConnectedKarkunsForRukn'
import {
  getPersonCategory,
  isCampaignEligible,
  parseMuttafiqRegistryNum,
} from '../src/lib/peopleClassification'
import {
  createKarkun,
  createMuttafiq,
  getAllKarkuns,
  getAllMuttafiqeen,
  getPeopleStatistics,
} from '../src/lib/peopleStore'
import { migrateArchivedPeopleToMuttafiqeen } from '../src/services/muttafiqeenMigrationService'
import {
  moveToKarkunRegistry,
  moveToMuttafiqeen,
} from '../src/services/peopleClassificationService'
import { DEFAULT_PLACE } from '../src/types/people.types'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function seedArchivedStandard(id: string, name: string, mobile: string): void {
  const now = new Date().toISOString()
  const row: KarkunRegistryRecord = {
    id,
    name,
    gender: 'Male',
    mobile,
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
    isArchived: true,
    archiveKind: 'standard',
    archivedAt: now,
    archivedBy: 'Verification',
  }
  MOCK_KARKUN_REGISTRY.push(row)
}

function resetRegistry(): void {
  resetRepositoryProviderForTests()
  MOCK_KARKUN_REGISTRY.length = 0
}

function main(): void {
  console.info('[KC-0103] exclusive classification verification starting')
  resetRegistry()

  const beforeK = getAllKarkuns().length
  const beforeM = getAllMuttafiqeen().length

  const createdM = createMuttafiq({
    name: 'Verify Muttafiq',
    gender: 'Male',
    mobile: '9999900101',
    place: DEFAULT_PLACE,
    status: 'active',
  })
  assert(createdM.success === true, 'createMuttafiq succeeds')
  const mid = createdM.karkunId!
  const muttafiq = MOCK_KARKUN_REGISTRY.find((k) => k.id === mid)
  assert(Boolean(muttafiq), 'created Muttafiq exists in registry store')
  assert(getPersonCategory(muttafiq!) === 'Muttafiq', 'category is Muttafiq')
  assert(parseMuttafiqRegistryNum(muttafiq!.registryNumber) != null, 'MT number assigned')
  assert(getAllMuttafiqeen().some((k) => k.id === mid), 'appears only in Muttafiqeen list')
  assert(!getAllKarkuns().some((k) => k.id === mid), 'absent from Karkun list')
  assert(getAllKarkuns().length === beforeK, 'Karkun total unchanged after Add Muttafiq')
  assert(getAllMuttafiqeen().length === beforeM + 1, 'Muttafiqeen total +1')

  const createdK = createKarkun({
    name: 'Verify Karkun',
    gender: 'Female',
    mobile: '9999900102',
    place: DEFAULT_PLACE,
    status: 'active',
  })
  assert(createdK.success === true, 'createKarkun succeeds')
  const kid = createdK.karkunId!
  assert(getAllKarkuns().some((k) => k.id === kid), 'Karkun in Karkun registry')
  assert(!getAllMuttafiqeen().some((k) => k.id === kid), 'Karkun not in Muttafiqeen')

  const kIds = new Set(getAllKarkuns().map((k) => k.id))
  const mIds = new Set(getAllMuttafiqeen().map((k) => k.id))
  assert([...kIds].every((id) => !mIds.has(id)), 'no overlap between registries')

  const stats = getPeopleStatistics()
  const karkuns = getAllKarkuns()
  const muttafiqeen = getAllMuttafiqeen()
  assert(
    stats.totalMaleKarkuns === karkuns.filter((k) => k.gender === 'Male').length,
    'male Karkun count',
  )
  assert(
    stats.totalFemaleKarkuns === karkuns.filter((k) => k.gender === 'Female').length,
    'female Karkun count',
  )
  assert(
    (stats.maleMuttafiqeen ?? 0) === muttafiqeen.filter((k) => k.gender === 'Male').length,
    'male Muttafiqeen count',
  )
  assert(
    (stats.femaleMuttafiqeen ?? 0) === muttafiqeen.filter((k) => k.gender === 'Female').length,
    'female Muttafiqeen count',
  )
  assert(
    stats.totalMaleKarkuns + stats.totalFemaleKarkuns === karkuns.length,
    'Karkun gender sum equals total',
  )
  assert(
    (stats.maleMuttafiqeen ?? 0) + (stats.femaleMuttafiqeen ?? 0) === muttafiqeen.length,
    'Muttafiqeen gender sum equals total',
  )
  assert((stats.totalMuttafiqeen ?? 0) === muttafiqeen.length, 'totalMuttafiqeen matches pool')

  assert(!isCampaignEligible(muttafiq!), 'Muttafiq not campaign eligible')
  assert(!canAssignKarkun(mid), 'Muttafiq cannot assign')
  assert(!getAvailableKarkunan().some((k) => k.id === mid), 'Muttafiq not in available pool')

  // Stale Active assignment for a Muttafiq must not enter canonical Connected KPI.
  const staleAssignment = {
    assignmentId: 'asgn-verify-muttafiq',
    assignmentNumber: 'ASN-VERIFY-MT',
    ruknId: 'rk-verify',
    karkunId: mid,
    status: 'Active' as const,
    assignedAt: new Date().toISOString(),
    assignedBy: 'Verification',
  }
  const explained = explainCanonicalExclusions([staleAssignment])
  assert(explained.included.length === 0, 'Muttafiq Active row not included in connected KPI')
  assert(
    explained.exclusions.some((e) => e.reason === 'karkun_not_campaign_eligible'),
    'Muttafiq excluded as not campaign eligible',
  )
  assert(
    !getCanonicalConnectedAssignments().some((a) => a.karkunId === mid),
    'canonical connected excludes Muttafiq',
  )

  const mtNums = getAllMuttafiqeen()
    .map((k) => k.registryNumber)
    .filter((v): v is string => Boolean(v))
  assert(new Set(mtNums).size === mtNums.length, 'MT numbers unique')

  const kCountBeforeMove = getAllKarkuns().length
  const mCountBeforeMove = getAllMuttafiqeen().length
  const moved = moveToMuttafiqeen(kid)
  assert(moved.success === true, 'move Karkun → Muttafiqeen')
  assert(getAllKarkuns().length === kCountBeforeMove - 1, 'Karkun count -1 after move')
  assert(getAllMuttafiqeen().length === mCountBeforeMove + 1, 'Muttafiqeen count +1 after move')
  const movedPerson = MOCK_KARKUN_REGISTRY.find((k) => k.id === kid)!
  assert(movedPerson.id === kid, 'Person ID preserved')
  assert(parseMuttafiqRegistryNum(movedPerson.registryNumber) != null, 'MT on move')
  const mtAfterMove = movedPerson.registryNumber

  const back = moveToKarkunRegistry(kid)
  assert(back.success === true, 'move Muttafiq → Karkun')
  assert(getAllKarkuns().some((k) => k.id === kid), 'back in Karkun registry')
  assert(!getAllMuttafiqeen().some((k) => k.id === kid), 'left Muttafiqeen')
  assert(
    MOCK_KARKUN_REGISTRY.find((k) => k.id === kid)?.registryNumber === mtAfterMove,
    'MT number persists on person after move back to Karkun',
  )

  // Migration: legacy archive → Muttafiq + MT; second run idempotent
  seedArchivedStandard('kr-888', 'Archived Legacy', '9999900199')
  const first = migrateArchivedPeopleToMuttafiqeen({ persist: false })
  assert(first.restoredToMuttafiqeen >= 1, 'migration restores archived')
  const restored = MOCK_KARKUN_REGISTRY.find((k) => k.id === 'kr-888')!
  assert(getPersonCategory(restored) === 'Muttafiq', 'restored as Muttafiq')
  assert(restored.isArchived === false, 'archive flag cleared')
  assert(parseMuttafiqRegistryNum(restored.registryNumber) != null, 'MT assigned by migration')
  const second = migrateArchivedPeopleToMuttafiqeen({ persist: false })
  assert(second.restoredToMuttafiqeen === 0, 'idempotent: no re-restore')
  assert(second.assignedRegistryNumbers === 0, 'idempotent: no re-assign MT when stable')

  console.info('[KC-0103] ALL CHECKS PASSED')
}

main()
