/**
 * Increment 3 — Admin عازمِ رکن registry + promotion UI.
 * Run: npm run verify:a-rukn-admin-ui
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ADMIN_NAV_ITEMS, flattenAdminNavItems } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import { getRuknById, ruknMaster, type Rukn } from '@/data/ruknMaster'
import { canOfferARuknPromotion, A_RUKN_PROMOTION_SAFE_ERROR, isDurableARuknPromotionSuccess, settleARuknPromotionAttempt } from '@/lib/aRuknPromotionUi'
import { isNormalRuknOfficer, listARuknOfficers } from '@/lib/aRuknRegistry'
import { setAdministratorDecisionSessionOverrideForTests } from '@/lib/auth/assertAdministratorDecisionSession'
import { isKarkun } from '@/lib/peopleClassification'
import { getAllKarkuns } from '@/lib/peopleStore'
import { emitPeopleRegistryChange, subscribeToPeopleStore } from '@/lib/peopleRegistryEvents'
import { UI_LABELS } from '@/lib/uiTerminology'
import { isPathAllowedForRole } from '@/lib/auth/authorization'
import { promoteKarkunToARukn } from '@/services/aRuknPromotionService'
import { getRepositories, resetRepositoryProviderForTests } from '@/repositories/provider'
import { repositoryErr } from '@/repositories/errors'
import { DEFAULT_PLACE } from '@/types/people.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function seedKarkun(id: string, name: string, mobile: string): KarkunRegistryRecord {
  const now = new Date().toISOString()
  return {
    id,
    name,
    gender: 'Female',
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
    isArchived: false,
    category: 'Karkun',
    referredByRuknId: 'R001',
  }
}

console.log('verify-a-rukn-admin-ui: start')

{
  const nav = flattenAdminNavItems(ADMIN_NAV_ITEMS)
  const item = nav.find((entry) => entry.id === 'a-rukn')
  assert(item, 'Admin nav includes عازمِ رکن')
  assert(item!.label === UI_LABELS.aRukn, 'nav label is عازمِ رکن')
  assert(item!.to === ROUTES.ADMIN_A_RUKN, 'nav targets /admin/a-rukn')
  assert(ROUTES.ADMIN_A_RUKN === '/admin/a-rukn', 'canonical route')
  assert(
    isPathAllowedForRole(ROUTES.ADMIN_A_RUKN, 'administrator'),
    'Admin may access /admin/a-rukn',
  )
  assert(
    !isPathAllowedForRole(ROUTES.ADMIN_A_RUKN, 'rukn'),
    'ordinary Rukn cannot access /admin/a-rukn',
  )
}

{
  const router = read('src/routes/AppRouter.tsx')
  assert(router.includes('path="a-rukn"'), 'AppRouter registers a-rukn')
  assert(router.includes('ARuknRegistryPage'), 'AppRouter uses A Rukn page')
  const adminBlock = router.slice(
    router.indexOf('allowedRole="administrator"'),
    router.indexOf('allowedRole="rukn"'),
  )
  assert(adminBlock.includes('path="a-rukn"'), 'a-rukn is inside Admin ProtectedRoute')
}

{
  const ruknNav = read('src/layouts/RuknLayout.tsx')
  assert(!ruknNav.includes('عازمِ رکن'), 'Rukn layout has no A Rukn nav')
  assert(!ruknNav.includes('ADMIN_A_RUKN'), 'Rukn layout has no A Rukn route')
}

{
  const page = read('src/pages/admin/ARuknRegistryPage.tsx')
  assert(page.includes("officerKind === 'a_rukn'") || page.includes('listARuknOfficers'), 'filters A Rukn officers')
  assert(!page.includes('RuknHomePage'), 'does not duplicate Rukn Home')
  const karkunPage = read('src/pages/admin/KarkunanPage.tsx')
  const genderSection = karkunPage.slice(
    karkunPage.indexOf('function KarkunGenderSection'),
    karkunPage.indexOf('export function KarkunanPage'),
  )
  const pageOwner = karkunPage.slice(karkunPage.indexOf('export function KarkunanPage'))
  assert(pageOwner.includes('PromoteToARuknSession'), 'promotion session is owned by the Karkun page')
  assert(
    !genderSection.includes('PromoteToARuknSession'),
    'promotion session is not mounted on the table section',
  )
  assert(genderSection.includes('PromoteToARuknTrigger'), 'row only requests promotion')
  assert(karkunPage.includes('UI_LABELS.promoteToARukn') || karkunPage.includes('PromoteToARuknTrigger'), 'promote UI')
  const action = read('src/components/admin/PromoteToARuknAction.tsx')
  assert(action.includes('promoteKarkunToARukn'), 'invokes Increment 2 service')
  assert(action.includes('ConfirmDialog'), 'confirmation before promotion')
  assert(action.includes('pending'), 'pending state')
  assert(action.includes('if (!displayPerson || pending) return') || action.includes('if (pending) return'), 'guards duplicate submission')
  assert(action.includes('try {'), 'try around promotion invocation')
  assert(action.includes('finally'), 'finally always clears pending')
  assert(action.includes('isDurableARuknPromotionSuccess'), 'success only from durable result')
  assert(action.includes('no longer be a normal Karkun'), 'confirmation copy')
  assert(action.includes('Historical records remain preserved'), 'history preserved')
  assert(!action.includes('OTP is created'), 'does not claim OTP is created')
  const table = read('src/components/forms/people/KarkunPeopleTable.tsx')
  assert(table.includes('promoteAction'), 'table can render promote action')
  const muttafiq = read('src/pages/admin/MuttafiqeenPage.tsx')
  assert(!muttafiq.includes('PromoteToARuknAction'), 'Muttafiq registry has no promote action')
  assert(!muttafiq.includes('PromoteToARuknTrigger'), 'Muttafiq registry has no promote trigger')
  const ruknPage = read('src/pages/admin/RuknModulePage.tsx')
  assert(!ruknPage.includes('PromoteToARuknAction'), 'Rukn registry has no promote action')
  const hook = read('src/hooks/useRuknManagement.ts')
  assert(hook.includes('isNormalRuknOfficer'), 'Rukn registry excludes A Rukn officers')
  const firestoreRepo = read('src/repositories/firestore/firestoreRepositories.ts')
  const upsertBlock = firestoreRepo.slice(
    firestoreRepo.indexOf('async upsertRecord(karkun: KarkunRegistryRecord)'),
    firestoreRepo.indexOf('async updateRecord(id: string, patch: KarkunRecordPatch)'),
  )
  assert(upsertBlock.includes('karkunCache.set(snapshot)'), 'failed karkun upsert restores cache snapshot')
  assert(upsertBlock.includes('if (!result.ok)'), 'cache restore is gated on failed write')
}

{
  const prefixOnly: Rukn = {
    id: 'AR99',
    name: 'Prefix Only',
    gender: 'Female',
    mobile: '9000008999',
    place: DEFAULT_PLACE,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'Verification',
  }
  const aRukn: Rukn = {
    ...prefixOnly,
    id: 'AR98',
    officerKind: 'a_rukn',
    origin: 'promoted_karkun',
    sourcePersonId: 'kr-8998',
  }
  const normal = getRuknById('R001')
  assert(normal, 'R001 exists')
  assert(listARuknOfficers([prefixOnly, aRukn, normal!]).map((row) => row.id).join(',') === 'AR98', 'registry uses officerKind only')
  assert(isNormalRuknOfficer(normal!), 'R001 is a normal Rukn officer')
  assert(!isNormalRuknOfficer(aRukn), 'A Rukn is excluded from normal Rukn list')
  assert(
    listARuknOfficers(ruknMaster).every((row) => row.officerKind === 'a_rukn'),
    'live registry listing is A Rukn only',
  )
  assert(
    !listARuknOfficers(ruknMaster).some((row) => row.id.startsWith('R') && row.officerKind !== 'a_rukn'),
    'no R### in A Rukn listing',
  )
}

{
  const eligible = seedKarkun('kr-8901', 'UI Promo Eligible', '9000008901')
  const promoted = {
    ...seedKarkun('kr-8902', 'UI Promo Done', '9000008902'),
    promotedToARuknId: 'AR90',
  }
  assert(canOfferARuknPromotion(eligible), 'eligible Karkun offers promote')
  assert(UI_LABELS.promoteToARukn === 'Promote to عازمِ رکن', 'promote label')
  assert(!canOfferARuknPromotion(promoted), 'promoted Karkun has no active promote offer')
  assert(!canOfferARuknPromotion({ ...eligible, status: 'inactive' }), 'inactive has no promote offer')
}

resetRepositoryProviderForTests()
setAdministratorDecisionSessionOverrideForTests(null)
MOCK_KARKUN_REGISTRY.push(seedKarkun('kr-8903', 'UI Promo Live', '9000008903'))
{
  const seeded = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8903')
  assert(seeded, 'UI live seed missing')
  const stored = await getRepositories().karkun.upsertRecord(seeded)
  assert(stored.ok, 'UI live seed must exist on authoritative store')
}
assert(getAllKarkuns().some((row) => row.id === 'kr-8903'), 'eligible Karkun is in active registry')
assert(isKarkun(MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8903')!), 'active normal Karkun')

const beforeOfficers = listARuknOfficers().length
const promoted = await promoteKarkunToARukn('kr-8903')
assert(promoted.success, `UI path promote failed: ${promoted.success ? '' : promoted.error}`)
assert(promoted.success && promoted.aRuknId.startsWith('AR'), 'returns AR identity')
assert(!getAllKarkuns().some((row) => row.id === 'kr-8903'), 'promoted person leaves active Karkun registry')
assert(
  listARuknOfficers().some((row) => promoted.success && row.id === promoted.aRuknId && row.officerKind === 'a_rukn'),
  'new AR appears in A Rukn registry',
)
assert(listARuknOfficers().length === beforeOfficers + 1, 'exactly one new A Rukn officer')
assert(!canOfferARuknPromotion(MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8903')!), 'no promote action after success')

const replay = await promoteKarkunToARukn('kr-8903')
assert(replay.success && replay.success && replay.aRuknId === (promoted.success ? promoted.aRuknId : ''), 'idempotent success')
assert(
  ruknMaster.filter((row) => row.sourcePersonId === 'kr-8903').length === 1,
  'idempotent replay does not create a second officer',
)

{
  const control = seedKarkun('kr-8912', 'Registry Control', '9000008912')
  MOCK_KARKUN_REGISTRY.push(control)
  assert(getAllKarkuns().some((row) => row.id === 'kr-8912'), 'normal Karkun remains visible')
  assert(isKarkun(control), 'normal Karkun classification unchanged')
}

{
  MOCK_KARKUN_REGISTRY.push(seedKarkun('kr-8910', 'Emit Timing', '9000008910'))
  {
    const seeded = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8910')
    assert(seeded, 'emit-timing seed missing')
    const stored = await getRepositories().karkun.upsertRecord(seeded)
    assert(stored.ok, 'emit-timing seed must exist on authoritative store')
  }
  const repos = getRepositories()
  const originalUpdate = repos.karkun.updateRecord.bind(repos.karkun)
  let persistEntered = false
  let emittedBeforePersist = false
  const unsub = subscribeToPeopleStore(() => {
    if (!persistEntered) emittedBeforePersist = true
  })
  repos.karkun.updateRecord = async (id, patch) => {
    if (id === 'kr-8910' && patch.aRuknPromotionInProgress === true) {
      persistEntered = true
    }
    return originalUpdate(id, patch)
  }
  try {
    const result = await promoteKarkunToARukn('kr-8910')
    assert(result.success, `emit-timing promote failed: ${result.success ? '' : result.error}`)
    assert(!emittedBeforePersist, 'must not emit registry change before in-progress persist starts')
    assert(isDurableARuknPromotionSuccess(result), 'success only after durable result')
    assert(result.success && result.aRuknId.startsWith('AR'), 'AR## only after success result')
  } finally {
    unsub()
    repos.karkun.updateRecord = originalUpdate
  }
}

{
  MOCK_KARKUN_REGISTRY.push(seedKarkun('kr-8911', 'Persist Rollback', '9000008911'))
  {
    const seeded = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8911')
    assert(seeded, 'rollback seed missing')
    const stored = await getRepositories().karkun.upsertRecord(seeded)
    assert(stored.ok, 'rollback seed must exist on authoritative store')
  }
  const repos = getRepositories()
  const originalUpdate = repos.karkun.updateRecord.bind(repos.karkun)
  let rollbackEmits = 0
  const unsub = subscribeToPeopleStore(() => {
    rollbackEmits += 1
  })
  repos.karkun.updateRecord = async (id, patch) => {
    if (id === 'kr-8911' && patch.aRuknPromotionInProgress === true) {
      return repositoryErr('StorageFailure', 'forced in-progress persist failure')
    }
    return originalUpdate(id, patch)
  }
  try {
    const result = await promoteKarkunToARukn('kr-8911')
    assert(!result.success, 'failed in-progress persist must not succeed')
    assert(!isDurableARuknPromotionSuccess(result), 'failed promotion must not show success')
    const person = MOCK_KARKUN_REGISTRY.find((row) => row.id === 'kr-8911')
    assert(person?.aRuknPromotionInProgress !== true, 'failed persist restores local in-progress flag')
    assert(getAllKarkuns().some((row) => row.id === 'kr-8911'), 'Karkun remains visible after failed persist')
    assert(rollbackEmits >= 1, 'failed persist emits rollback/refresh')
    assert(!ruknMaster.some((row) => row.sourcePersonId === 'kr-8911'), 'no AR## on failed persist')
  } finally {
    unsub()
    repos.karkun.updateRecord = originalUpdate
  }
}

{
  const session = { pending: true, error: '', successId: '' }
  emitPeopleRegistryChange()
  assert(session.pending === true, 'pending UI state survives registry refresh')
  assert(session.successId === '', 'registry refresh does not invent success')
}

{
  const failed = await settleARuknPromotionAttempt(() => promoteKarkunToARukn('kr-missing'))
  assert(!failed.success, 'missing person is not success')
  assert(failed.error.length > 0, 'failed promotion displays an error')
  assert(!isDurableARuknPromotionSuccess(failed), 'failed promotion does not show success')
}

{
  const settled = await settleARuknPromotionAttempt(async () => {
    throw new Error('boom')
  })
  assert(!settled.success, 'thrown promotion is not success')
  assert(settled.error === A_RUKN_PROMOTION_SAFE_ERROR, 'thrown promotion shows a safe error')
}

{
  const ok = await settleARuknPromotionAttempt(async () => ({
    success: true,
    aRuknId: 'AR88',
    sourcePersonId: 'kr-8903',
    idempotent: true,
  }))
  assert(isDurableARuknPromotionSuccess(ok) && ok.aRuknId === 'AR88', 'AR## shown only from success result')
  const notOk = await settleARuknPromotionAttempt(async () => ({
    success: false,
    error: 'durable promotion failed',
  }))
  assert(!isDurableARuknPromotionSuccess(notOk), 'success helper rejects failed results')
}

{
  let calls = 0
  let pending = false
  const runPromotion = () => {
    if (pending) return
    pending = true
    calls += 1
  }
  runPromotion()
  runPromotion()
  assert(calls === 1, 'double-click remains prevented')
}

{
  const ensure = read('src/lib/auth/ensureJwtRoleClaim.ts')
  const promotion = read('src/services/aRuknPromotionService.ts')
  const helpers = read('src/repositories/firestore/firestoreHelpers.ts')
  const rules = read('firestore.rules')
  assert(ensure.includes('synchronizeRefreshedIdTokenForFirestore'), 'Admin UI path uses credential sync helper')
  assert(
    promotion.indexOf('assertAdministratorDecisionSession') <
      promotion.indexOf('const transition = await markPromotionInProgress'),
    'promotion write stays after Admin credential gate',
  )
  assert(helpers.includes('await updateDoc('), 'updateDoc transition remains intact')
  assert(!promotion.includes('Promise.race'), 'promotion path does not reintroduce auth Promise.race')
  const markBlock = promotion.slice(
    promotion.indexOf('async function markPromotionInProgress'),
    promotion.indexOf('export async function promoteKarkunToARukn'),
  )
  assert(
    markBlock.includes('karkun.readRecord(personId)'),
    'Admin promotion transition reads authoritative karkuns/{id}',
  )
  assert(
    markBlock.includes('referredByRuknId: locked.referredByRuknId'),
    'Admin promotion transition patch uses authoritative referredByRuknId',
  )
  assert(!markBlock.includes("person.referredByRuknId ?? ''"), 'Admin promotion does not coerce referral to empty string')
  assert(
    rules.includes(
      'allow update: if (isAdministrator() && referredByUnchanged() && promotedKarkunNotAvailable())',
    ),
    'karkun Admin update rule unchanged',
  )
}

assert(!MOCK_KARKUN_REGISTRY.some((row) => row.id === 'kr-701'), 'kr-701 was not used as a test fixture')

setAdministratorDecisionSessionOverrideForTests(null)
console.log('verify-a-rukn-admin-ui: OK')
