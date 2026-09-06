/**
 * Increment D — Security hardening contracts (rules + app-layer gates).
 * Offline verification — no live Firestore emulator required.
 * Run: npx vite-node scripts/verify-security-hardening.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById, ruknMaster } from '@/data/ruknMaster'
import {
  applyReferredByRuknIfAbsent,
  clearKarkunRegistry,
  createKarkun,
  createMuttafiq,
  createRukn,
  updateKarkun,
  updateRukn,
} from '@/lib/peopleStore'
import { isCampaignEligible, getPersonCategory } from '@/lib/peopleClassification'
import { resetRepositoryProviderForTests } from '@/repositories/provider'
import { clearKarkunRequestStore, reloadKarkunRequestStoreFromPersistence } from '@/stores/karkunRequestStore'
import { DEFAULT_PLACE } from '@/types/people.types'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

console.log('verify-security-hardening: start')

{
  const rules = read('firestore.rules')

  assert(rules.includes('function referredByUnchanged()'), 'shared referredBy helper')
  assert(rules.includes('function categoryUnchanged()'), 'category lock helper')
  assert(rules.includes('function isMuttafiqPersonData(data)'), 'muttafiq guard')
  assert(rules.includes('function karkunNotMuttafiq(karkunId)'), 'connection muttafiq guard')
  assert(rules.includes('!isMuttafiqPersonData(resource.data)'), 'rukn cannot update muttafiq via karkuns')
  assert(rules.includes('categoryUnchanged()'), 'rukn cannot flip category')
  assert(rules.includes('referredByUnchanged()'), 'referral immutable helper used')

  assert(
    /match \/karkuns\/\{karkunId\}[\s\S]*?isAdministrator\(\) && referredByUnchanged\(\)/.test(rules),
    'admin karkun update preserves referral',
  )
  const karkunMatch = rules.slice(
    rules.indexOf('match /karkuns/{karkunId}'),
    rules.indexOf('match /connections/{assignmentId}'),
  )
  assert(
    karkunMatch.includes('isAdministrator() && referredByUnchanged() && promotedKarkunNotAvailable()'),
    'Admin karkun update is referral + promoted-not-Available only',
  )
  assert(
    !/allow update: if \(isAdministrator\(\) && referredByUnchanged\(\) && promotedKarkunNotAvailable\(\) && aRuknPromotionInProgressUnchanged/.test(
      karkunMatch,
    ),
    'Admin is not blocked from setting aRuknPromotionInProgress',
  )
  assert(
    rules.includes('&& aRuknPromotionInProgressUnchanged()'),
    'Rukn karkun update still locks aRuknPromotionInProgress',
  )
  assert(
    /match \/rukns\/\{docId\}[\s\S]*?allow create: if isAdministrator\(\)/.test(rules),
    'rukn create admin-only',
  )
  assert(rules.includes('validRuknOfficerCreate'), 'A Rukn create shape is Admin-gated')
  assert(rules.includes('isPromotedToARuknData'), 'promoted karkuns are not Available')
  assert(rules.includes('promotedToARuknIdUnchanged'), 'Rukn cannot write promotion link')
  assert(rules.includes('aRuknPromotionInProgressUnchanged'), 'Rukn cannot write promotion transition')
  assert(rules.includes('isARuknPromotionInProgressData'), 'transition excluded from Available')
  assert(
    rules.includes("('aRuknPromotionInProgress' in data)"),
    'legacy karkuns missing aRuknPromotionInProgress do not fail rules evaluation',
  )
  assert(rules.includes('karkunNotInARuknPromotionTransition'), 'connections blocked during transition')
  assert(rules.includes('officerIdentityUnchanged'), 'officer identity fields locked after create')
  assert(rules.includes('promotedKarkunNotAvailable'), 'promoted karkuns cannot be listed Available')
  assert(rules.includes("docId != 'aRuknCounter'"), 'aRuknCounter cannot be deleted')
  {
    const settingsBlock = rules.slice(rules.indexOf('match /settings/{docId}'))
    const readAllow =
      settingsBlock.match(/allow read: if isAdministrator\(\)[\s\S]*?request\.auth\.uid\s*\n\s*\)\);/)?.[0] ??
      ''
    assert(readAllow.length > 0, 'settings read rule located')
    assert(!readAllow.includes('aRuknCounter'), 'Rukn settings read allowlist excludes aRuknCounter')
  }
  assert(
    /match \/rukns\/\{docId\}[\s\S]*?allow update: if isAdministrator\(\) && referredByUnchanged\(\)/.test(
      rules,
    ),
    'rukn update admin-only + referral immutable',
  )
  assert(
    /match \/connections\/\{assignmentId\}[\s\S]*?karkunNotMuttafiq\(request\.resource\.data\.karkunId\)/.test(
      rules,
    ),
    'connection create blocks muttafiq',
  )
  assert(
    /match \/connections\/\{assignmentId\}[\s\S]*?request\.resource\.data\.ruknId == resource\.data\.ruknId/.test(
      rules,
    ),
    'connection update cannot forge ownership',
  )
  assert(
    /match \/muttafiqRelationships\/\{relationshipId\}[\s\S]*?allow create, update: if isAdministrator\(\)/.test(
      rules,
    ),
    'muttafiq relationships admin-only write',
  )
  assert(
    /match \/assignmentReviews\/\{reviewId\}[\s\S]*?allow update: if isAdministrator\(\)/.test(rules),
    'assignment review resolve admin-only',
  )
  assert(rules.includes('RESIDUAL RISK'), 'karkunRequests residual risk documented')

  const service = read('src/services/karkunRequestService.ts')
  assert(service.includes('assertRequesterMatchesSignedInRukn'), 'requester forge gate')
  assert(service.includes('assertAdministratorDecisionSession'), 'approve/reject admin gate')
  assert(
    service.includes('You cannot submit a request on behalf of another Rukn.'),
    'forge message',
  )
  assert(
    service.includes('Only an Administrator can approve or reject intake requests.'),
    'client approve deny message',
  )

  console.log('  OK  static rules + service gates')
}

resetRepositoryProviderForTests()
clearKarkunRequestStore()
clearKarkunRegistry()
reloadKarkunRequestStoreFromPersistence()

const referring =
  ruknMaster.find((row) => row.status === 'active' && !row.isArchived && row.gender === 'Male') ??
  ruknMaster[0]!
const other =
  ruknMaster.find(
    (row) =>
      row.id !== referring.id && row.status === 'active' && !row.isArchived && row.gender === 'Male',
  ) ?? ruknMaster[1]!

{
  // Unauthorized / invalid referral persistence rejected at store layer
  const badKarkun = createKarkun(
    {
      name: 'Sec Bad Karkun Referral',
      gender: 'Male',
      mobile: '9111000301',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: 'rk-forged',
    },
    'Administrator',
  )
  assert(!badKarkun.success, 'unknown karkun referral rejected')

  const badRukn = createRukn(
    {
      name: 'Sec Bad Rukn Referral',
      gender: 'Male',
      mobile: '9111000302',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: 'rk-forged',
    },
    'Administrator',
  )
  assert(!badRukn.success, 'unknown rukn referral rejected')

  console.log('  OK  unknown referral IDs rejected')
}

{
  // Referral survives unrelated edit + simulated transfer
  const created = createKarkun(
    {
      name: 'Sec Referral Survive',
      gender: 'Male',
      mobile: '9111000303',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Sec Father',
      address: 'Sec Address',
    },
    'Administrator',
  )
  assert(created.success && created.karkunId, 'create karkun')
  const id = created.karkunId!
  const person = getKarkunById(id)!
  person.assignedRuknId = other.id
  person.assignedRukn = other.name
  person.assignmentStatus = 'Assigned'
  updateKarkun(id, { name: 'Sec Referral Survive Edited', referredByRuknId: other.id }, 'Administrator')
  assert(getKarkunById(id)?.referredByRuknId === referring.id, 'karkun referral survives transfer/edit')
  assert(applyReferredByRuknIfAbsent(id, other.id).success, 'if-absent ok')
  assert(getKarkunById(id)?.referredByRuknId === referring.id, 'if-absent never overwrites')

  const before = new Set(ruknMaster.map((r) => r.id))
  const ruknCreate = createRukn(
    {
      name: 'Sec New Rukn Referral',
      gender: 'Male',
      mobile: '9111000304',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
    },
    'Administrator',
  )
  assert(ruknCreate.success, 'create rukn')
  const newRukn = ruknMaster.find((r) => !before.has(r.id) && r.name === 'Sec New Rukn Referral')!
  updateRukn(newRukn.id, { name: 'Sec New Rukn Referral Edited', referredByRuknId: other.id }, 'Administrator')
  assert(getRuknById(newRukn.id)?.referredByRuknId === referring.id, 'rukn referral survives edit')

  console.log('  OK  referral immutability')
}

{
  // Muttafiq remains Muttafiq and not campaign eligible
  const m = createMuttafiq(
    {
      name: 'Sec Muttafiq',
      gender: 'Male',
      mobile: '9111000305',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Administrator',
    { requireNewPersonIntake: false },
  )
  assert(m.success && m.karkunId, 'create muttafiq')
  const person = getKarkunById(m.karkunId!)!
  assert(getPersonCategory(person) === 'Muttafiq', 'category muttafiq')
  assert(!isCampaignEligible(person), 'muttafiq not campaign eligible')

  console.log('  OK  muttafiq campaign exclusion')
}

{
  // Existing records without referral remain readable
  const legacy = ruknMaster.find((r) => !r.referredByRuknId)
  assert(legacy && legacy.name, 'legacy rukn without referral readable')

  console.log('  OK  legacy without referral')
}

console.log('verify-security-hardening: PASS')
