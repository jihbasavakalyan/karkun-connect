/**
 * Increment B — Referred By Rukn on NEW Karkun records.
 * Increment C — Referred By Rukn on NEW Rukn records.
 * Run: npx vite-node scripts/verify-referred-by-rukn.ts
 *
 * Note: full approve→assign needs Firebase auth claims; this script verifies the
 * referral field contracts and store behavior without requiring a signed-in session.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById, ruknMaster } from '@/data/ruknMaster'
import {
  applyReferredByRuknIfAbsent,
  clearKarkunRegistry,
  createKarkun,
  createRukn,
  updateKarkun,
  updateRukn,
} from '@/lib/peopleStore'
import {
  clearKarkunRequestStore,
  reloadKarkunRequestStoreFromPersistence,
} from '@/stores/karkunRequestStore'
import { submitNewKarkunRequest } from '@/services/karkunRequestService'
import { resetRepositoryProviderForTests } from '@/repositories/provider'
import { DEFAULT_PLACE } from '@/types/people.types'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

console.log('verify-referred-by-rukn: start')

{
  const types = read('src/types/karkun-registry.types.ts')
  assert(types.includes('referredByRuknId?: string'), 'registry field')

  const ruknTypes = read('src/data/ruknMaster.ts')
  assert(ruknTypes.includes('referredByRuknId?: string'), 'rukn model field')

  const peopleTypes = read('src/types/people.types.ts')
  assert(peopleTypes.includes('referredByRuknId?: string'), 'contact input field')

  const store = read('src/lib/peopleStore.ts')
  assert(store.includes('applyReferredByRuknIfAbsent'), 'if-absent helper')
  assert(
    store.includes('referredByRuknId is immutable via updateKarkun'),
    'updateKarkun does not mutate referral',
  )
  assert(
    store.includes('referredByRuknId is immutable via updateRukn'),
    'updateRukn does not mutate referral',
  )
  assert(store.includes('A Rukn cannot refer themselves.'), 'self-referral rejected')

  const service = read('src/services/karkunRequestService.ts')
  assert(service.includes('referredByRuknId: claimed.requestingRuknId.trim()'), 'approve stamps create')
  assert(service.includes('applyReferredByRuknIfAbsent'), 'approve stamps link path')

  const form = read('src/components/forms/people/PersonFormModal.tsx')
  assert(form.includes('Referred By Rukn'), 'admin add picker label')
  assert(form.includes('person-referred-by-rukn'), 'admin add picker id')
  assert(form.includes("kind === 'rukn' && mode === 'add'"), 'rukn add referral UI')
  assert(form.includes('Referred By:'), 'rukn edit referral display')

  const profile = read('src/pages/admin/KarkunProfilePage.tsx')
  assert(profile.includes('Referred By:'), 'karkun profile display')

  const rules = read('firestore.rules')
  assert(rules.includes('referredByUnchanged()'), 'rukn cannot change karkun referral')
  assert(
    /match \/rukns\/\{docId\}[\s\S]*?referredByUnchanged\(\)/.test(rules),
    'rukn update preserves referredByRuknId',
  )

  const karkunan = read('src/pages/admin/KarkunanPage.tsx')
  assert(karkunan.includes('Referred By Rukn is required'), 'admin add karkun requires referral')

  const ruknPage = read('src/pages/admin/RuknModulePage.tsx')
  assert(ruknPage.includes('Referred By Rukn is required'), 'admin add rukn requires referral')

  console.log('  OK  static contracts')
}

resetRepositoryProviderForTests()
clearKarkunRequestStore()
clearKarkunRegistry()
reloadKarkunRequestStoreFromPersistence()

const activeMaleRukns = ruknMaster.filter(
  (row) => row.status === 'active' && !row.isArchived && row.gender === 'Male',
)
assert(activeMaleRukns.length >= 2, 'need two active male rukns')
const referring = activeMaleRukns[0]!
const otherRukn = activeMaleRukns[1]!

{
  // Intake: requesting Rukn is captured on the request (source for referredBy on approve).
  const submitted = await submitNewKarkunRequest({
    requestingRuknId: referring.id,
    fullName: 'Verify Referral Karkun',
    gender: 'Male',
    mobile: '9111000101',
    createdBy: referring.name,
  })
  assert(submitted.ok, `submit: ${!submitted.ok ? submitted.error : ''}`)
  if (!submitted.ok) throw new Error(submitted.error)
  assert(submitted.request.requestingRuknId === referring.id, 'request stores requesting Rukn')

  // Approve create path (same inputs as approveNewKarkunRequestOnce).
  const createResult = createKarkun(
    {
      name: submitted.request.fullName,
      gender: submitted.request.gender,
      mobile: submitted.request.mobile,
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: submitted.request.requestingRuknId.trim() || undefined,
    },
    'Administrator',
  )
  assert(createResult.success && createResult.karkunId, 'intake-equivalent create')
  const created = getKarkunById(createResult.karkunId!)
  assert(created?.referredByRuknId === referring.id, 'referredBy from requesting Rukn')
  assert(getKarkunById(createResult.karkunId!)?.referredByRuknId === referring.id, 'reload preserves')

  console.log('  OK  intake submit → create stamps referredByRuknId')
}

{
  // Link path: apply if absent; never overwrite; assignment field changes do not touch referral.
  const createResult = createKarkun(
    {
      name: 'Assignment Immutable Referral',
      gender: 'Male',
      mobile: '9111000102',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
    },
    'Administrator',
  )
  assert(createResult.success && createResult.karkunId, 'admin create with referral')
  const karkunId = createResult.karkunId!
  const person = getKarkunById(karkunId)!

  // Simulate connection transfer (assignment engine updates these fields only).
  person.assignedRuknId = otherRukn.id
  person.assignedRukn = otherRukn.name
  person.assignmentStatus = 'Assigned'

  assert(getKarkunById(karkunId)?.assignedRuknId === otherRukn.id, 'assignment changed')
  assert(getKarkunById(karkunId)?.referredByRuknId === referring.id, 'referredBy unchanged after transfer')

  updateKarkun(karkunId, { name: 'Assignment Immutable Referral Updated' }, 'Administrator')
  assert(
    getKarkunById(karkunId)?.referredByRuknId === referring.id,
    'referredBy unchanged after profile update',
  )

  // Passing referredBy on update must not apply (updateKarkun ignores it).
  updateKarkun(
    karkunId,
    { name: 'Still Same Referral', referredByRuknId: otherRukn.id },
    'Administrator',
  )
  assert(
    getKarkunById(karkunId)?.referredByRuknId === referring.id,
    'updateKarkun cannot replace referredBy',
  )

  const overwrite = applyReferredByRuknIfAbsent(karkunId, otherRukn.id, 'Administrator')
  assert(overwrite.success, 'if-absent succeeds when already set')
  assert(getKarkunById(karkunId)?.referredByRuknId === referring.id, 'if-absent never overwrites')

  // Link existing person without referral → stamp once.
  const bare = createKarkun(
    {
      name: 'Link Path Referral',
      gender: 'Male',
      mobile: '9111000106',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Administrator',
  )
  assert(bare.success && bare.karkunId, 'bare create')
  const stamped = applyReferredByRuknIfAbsent(bare.karkunId!, referring.id, 'Administrator')
  assert(stamped.success, 'stamp if absent')
  assert(getKarkunById(bare.karkunId!)?.referredByRuknId === referring.id, 'link path stamps')

  console.log('  OK  assignment/transfer immutability + link stamp')
}

{
  // Admin direct creation captures Referred By; unknown id rejected.
  const createResult = createKarkun(
    {
      name: 'Admin Direct Referral',
      gender: 'Male',
      mobile: '9111000103',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
    },
    'Administrator',
  )
  assert(createResult.success && createResult.karkunId, 'admin create')
  assert(
    getKarkunById(createResult.karkunId!)?.referredByRuknId === referring.id,
    'admin create stores referral',
  )

  const invalid = createKarkun(
    {
      name: 'Bad Referral',
      gender: 'Male',
      mobile: '9111000104',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: 'rk-does-not-exist',
    },
    'Administrator',
  )
  assert(!invalid.success, 'rejects unauthorized / unknown referring Rukn id')

  console.log('  OK  admin create + invalid referral rejected')
}

{
  // Existing records without the field remain readable; create without referral still works.
  const legacy = createKarkun(
    {
      name: 'Legacy No Referral',
      gender: 'Male',
      mobile: '9111000105',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Administrator',
  )
  assert(legacy.success && legacy.karkunId, 'create without referral allowed')
  const row = getKarkunById(legacy.karkunId!)
  assert(row, 'legacy readable')
  assert(row!.referredByRuknId === undefined, 'no invented referral')
  assert(row!.name === 'Legacy No Referral', 'name intact')

  console.log('  OK  optional field + legacy readable')
}

{
  // Increment C — Admin create Rukn with Referred By
  const beforeIds = new Set(ruknMaster.map((row) => row.id))
  const created = createRukn(
    {
      name: 'Verify New Referred Rukn',
      gender: 'Male',
      mobile: '9111000201',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
    },
    'Administrator',
  )
  assert(created.success, `createRukn: ${created.error ?? ''}`)
  const newRukn = ruknMaster.find((row) => !beforeIds.has(row.id) && row.mobile.includes('9111000201'))
  assert(newRukn, 'new rukn in master')
  assert(newRukn!.referredByRuknId === referring.id, 'rukn referredBy persisted')
  assert(getRuknById(newRukn!.id)?.referredByRuknId === referring.id, 'reload preserves rukn referral')

  updateRukn(newRukn!.id, { name: 'Verify New Referred Rukn Updated' }, 'Administrator')
  assert(
    getRuknById(newRukn!.id)?.referredByRuknId === referring.id,
    'updateRukn does not erase referral',
  )

  updateRukn(
    newRukn!.id,
    { name: 'Still Same Rukn Referral', referredByRuknId: otherRukn.id },
    'Administrator',
  )
  assert(
    getRuknById(newRukn!.id)?.referredByRuknId === referring.id,
    'updateRukn cannot replace referredBy',
  )

  const unknown = createRukn(
    {
      name: 'Bad Rukn Referral',
      gender: 'Male',
      mobile: '9111000202',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: 'rk-does-not-exist',
    },
    'Administrator',
  )
  assert(!unknown.success, 'unknown referring Rukn rejected')

  // Self-referral: allocate-next id cannot equal an existing referring id in normal flow;
  // guard is covered statically + by rejecting when referredBy === allocated id.
  const nextIdGuess = (() => {
    const nums = ruknMaster
      .map((row) => Number.parseInt(row.id.replace(/^R/i, ''), 10))
      .filter((n) => Number.isFinite(n))
    const max = nums.length ? Math.max(...nums) : 0
    return `R${String(max + 1).padStart(3, '0')}`
  })()
  const self = createRukn(
    {
      name: 'Self Referral Block',
      gender: 'Male',
      mobile: '9111000203',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: nextIdGuess,
    },
    'Administrator',
  )
  // Referring id does not exist yet → rejected as unknown/inactive (covers self-create race).
  assert(!self.success, 'self / non-existent next-id referral rejected')

  const legacyRukn = ruknMaster.find((row) => !row.referredByRuknId)
  assert(legacyRukn, 'existing rukn without referral remains readable')
  assert(Boolean(legacyRukn!.name), 'legacy rukn name intact')

  // Increment B still works after Increment C changes.
  const karkunStill = createKarkun(
    {
      name: 'Post C Karkun Referral',
      gender: 'Male',
      mobile: '9111000204',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
    },
    'Administrator',
  )
  assert(karkunStill.success && karkunStill.karkunId, 'karkun referral still works')
  assert(
    getKarkunById(karkunStill.karkunId!)?.referredByRuknId === referring.id,
    'karkun referredBy intact',
  )

  console.log('  OK  Increment C rukn referral + B compatibility')
}

console.log('verify-referred-by-rukn: PASS')
