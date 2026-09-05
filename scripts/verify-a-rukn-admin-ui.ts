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
import { canOfferARuknPromotion } from '@/lib/aRuknPromotionUi'
import { isNormalRuknOfficer, listARuknOfficers } from '@/lib/aRuknRegistry'
import { setAdministratorDecisionSessionOverrideForTests } from '@/lib/auth/assertAdministratorDecisionSession'
import { isKarkun } from '@/lib/peopleClassification'
import { getAllKarkuns } from '@/lib/peopleStore'
import { UI_LABELS } from '@/lib/uiTerminology'
import { isPathAllowedForRole } from '@/lib/auth/authorization'
import { promoteKarkunToARukn } from '@/services/aRuknPromotionService'
import { resetRepositoryProviderForTests } from '@/repositories/provider'
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
  assert(karkunPage.includes('PromoteToARuknAction'), 'Karkun registry has promote action')
  assert(karkunPage.includes('UI_LABELS.promoteToARukn') || karkunPage.includes('PromoteToARuknAction'), 'promote UI')
  const action = read('src/components/admin/PromoteToARuknAction.tsx')
  assert(action.includes('promoteKarkunToARukn'), 'invokes Increment 2 service')
  assert(action.includes('ConfirmDialog'), 'confirmation before promotion')
  assert(action.includes('pending'), 'pending state')
  assert(action.includes('if (pending) return'), 'guards duplicate submission')
  assert(action.includes('no longer be a normal Karkun'), 'confirmation copy')
  assert(action.includes('Historical records remain preserved'), 'history preserved')
  assert(!action.includes('OTP is created'), 'does not claim OTP is created')
  const table = read('src/components/forms/people/KarkunPeopleTable.tsx')
  assert(table.includes('promoteAction'), 'table can render promote action')
  const muttafiq = read('src/pages/admin/MuttafiqeenPage.tsx')
  assert(!muttafiq.includes('PromoteToARuknAction'), 'Muttafiq registry has no promote action')
  const ruknPage = read('src/pages/admin/RuknModulePage.tsx')
  assert(!ruknPage.includes('PromoteToARuknAction'), 'Rukn registry has no promote action')
  const hook = read('src/hooks/useRuknManagement.ts')
  assert(hook.includes('isNormalRuknOfficer'), 'Rukn registry excludes A Rukn officers')
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

setAdministratorDecisionSessionOverrideForTests(null)
console.log('verify-a-rukn-admin-ui: OK')
