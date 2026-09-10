/**
 * Increment A — Muttafiq ↔ Rukn relationship (separate from campaign connections).
 * Run: npx vite-node scripts/verify-muttafiq-rukn-link.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  muttafiqRuknRelationshipId,
  type MuttafiqRuknRelationship,
} from '@/types/muttafiqRelationship.types'
import {
  getRepositories,
  resetRepositoryProviderForTests,
} from '@/repositories/provider'
import { clearLocalMuttafiqRelationshipsForTests } from '@/repositories/local/muttafiqRelationshipLocalRepository'
import {
  clearMuttafiqRelationshipStore,
  getActiveMuttafiqRelationshipsByPersonId,
  getActiveMuttafiqRelationshipsForPerson,
  getActiveMuttafiqRelationshipsForRukn,
  getConnectedMuttafiqDisplayRowsForRukn,
  getRuknHomeMuttafiqRows,
  reloadMuttafiqRelationshipStoreFromPersistence,
} from '@/stores/muttafiqRelationshipStore'
import { buildRuknOrganisationalInformation } from '@/lib/rukn/ruknOrganisationalInformation'
import {
  clearKarkunRequestStore,
  getAllKarkunRequests,
  reloadKarkunRequestStoreFromPersistence,
} from '@/stores/karkunRequestStore'
import { createMuttafiq, createKarkun, clearKarkunRegistry } from '@/lib/peopleStore'
import { getPersonCategory } from '@/lib/peopleClassification'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getAllAssignments } from '@/stores/assignmentStore'
import {
  submitMuttafiqRuknLinkRequest,
  assignMuttafiqRuknLinkAsAdmin,
  approvePeopleIntakeRequest,
  rejectNewKarkunRequest,
} from '@/services/karkunRequestService'
import { buildUnifiedInbox } from '@/lib/peopleLifecycle'
import { ruknMaster } from '@/data/ruknMaster'
import { DEFAULT_PLACE } from '@/types/people.types'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

console.log('verify-muttafiq-rukn-link: start')

{
  const types = read('src/types/karkunRequest.types.ts')
  assert(types.includes("'muttafiq_rukn_link'"), 'request kind present')
  assert(types.includes("'karkun_to_muttafiq'"), 'historical conversion kind retained')

  const collections = read('src/repositories/firestore/collections.ts')
  assert(collections.includes("muttafiqRelationships: 'muttafiqRelationships'"), 'collection')

  const rules = read('firestore.rules')
  assert(rules.includes('match /muttafiqRelationships/{relationshipId}'), 'rules match')
  assert(rules.includes("request.resource.data.status == 'Ended'"), 'admin may end a previous Active link')
  assert(rules.includes("request.resource.data.status == 'Active'"), 'admin may create Active links')

  const service = read('src/services/karkunRequestService.ts')
  assert(service.includes('submitMuttafiqRuknLinkRequest'), 'submit helper')
  assert(service.includes('assignMuttafiqRuknLinkAsAdmin'), 'admin direct assign helper')
  assert(service.includes("kind === 'muttafiq_rukn_link'"), 'approve branch')
  assert(service.includes('upsertActiveDurable'), 'relationship upsert')
  assert(
    /if \(blocked\) \{\s*return \{ ok: false, error: blocked\.error, code: 'VALIDATION' \}/.test(
      service,
    ),
    'approve maps second-active rejection onto ApproveNewKarkunRequestResult VALIDATION',
  )
  assert(
    service.includes('assertAdministratorDecisionSession') &&
      /export async function assignMuttafiqRuknLinkAsAdmin[\s\S]*?assertAdministratorDecisionSession/.test(
        service,
      ),
    'admin assign requires administrator session',
  )

  const card = read('src/components/relationship/ConnectedKarkunCard.tsx')
  assert(card.includes('const canRequestConversion = false'), 'conversion UI gated off')

  const table = read('src/components/forms/people/KarkunPeopleTable.tsx')
  assert(table.includes('showMuttafiqRelationshipColumns'), 'muttafiq registry relationship columns')
  assert(table.includes('getActiveMuttafiqRelationshipsByPersonId'), 'batched relationship lookup')
  assert(table.includes('onConnectRukn'), 'Connect Rukn action prop')
  assert(table.includes('UI_LABELS.connectRukn'), 'Connect Rukn label')
  assert(table.includes("kind === 'muttafiq_rukn_link'"), 'pending link detection')
  assert(
    !table.includes('showMuttafiqRelationshipColumns') ||
      table.includes('assignedRuknId'),
    'karkun assignment path retained',
  )

  const connectAdminModal = read('src/components/relationship/ConnectRuknForMuttafiqModal.tsx')
  assert(connectAdminModal.includes('assignMuttafiqRuknLinkAsAdmin'), 'admin modal direct assign')
  assert(
    connectAdminModal.includes("from '@/services/karkunRequestService'") &&
      !connectAdminModal.includes('submitMuttafiqRuknLinkRequest('),
    'admin modal calls assign, not submit',
  )
  assert(connectAdminModal.includes('personId: person.id'), 'canonical Muttafiq id')
  assert(connectAdminModal.includes('ruknId,'), 'canonical Rukn id')
  assert(connectAdminModal.includes('Confirm Connection'), 'admin confirm wording')
  assert(!connectAdminModal.includes('assignKarkun'), 'admin modal does not assign campaign')
  assert(
    !connectAdminModal.includes("assignedRuknId") &&
      !connectAdminModal.includes('getAllAssignments'),
    'admin modal does not touch campaign assignment fields',
  )

  const ruknModal = read('src/components/relationship/ConnectMuttafiqRequestModal.tsx')
  assert(ruknModal.includes('submitMuttafiqRuknLinkRequest'), 'rukn modal still pending path')

  const muttafiqPage = read('src/pages/admin/MuttafiqeenPage.tsx')
  assert(muttafiqPage.includes('showMuttafiqRelationshipColumns'), 'muttafiqeen enables columns')
  assert(muttafiqPage.includes('showAssignmentControls={false}'), 'no campaign assignment UI')
  assert(muttafiqPage.includes('ConnectRuknForMuttafiqModal'), 'admin connect modal wired')
  assert(muttafiqPage.includes('onConnectRukn'), 'Connect Rukn wired on registry')
  assert(muttafiqPage.includes('onAssigned'), 'admin assigned callback')
  assert(
    muttafiqPage.includes('Relationship is Active'),
    'admin success is assignment not pending request',
  )

  const ruknDetail = read('src/pages/admin/RuknDetailPage.tsx')
  assert(ruknDetail.includes('getConnectedMuttafiqDisplayRowsForRukn'), 'rukn detail lists Muttafiq from relationships')
  assert(ruknDetail.includes('MuttafiqRuknConnectionRow'), 'rukn detail renders Muttafiq names')

  const ruknHome = read('src/pages/rukn/RuknHomePage.tsx')
  assert(ruknHome.includes('RuknHomeMuttafiqConnections'), 'Rukn Home lists connected Muttafiq')
  const homeList = read('src/components/rukn/RuknHomeMuttafiqConnections.tsx')
  assert(homeList.includes('getRuknHomeMuttafiqRows'), 'Home list reads dedicated relationships')
  assert(homeList.includes('useMuttafiqRelationshipStore'), 'Home list re-renders on relationship hydrate')
  assert(!homeList.includes('getConnectedKarkunsForRukn'), 'Home Muttafiq list is not campaign connections')
  const orgInfo = read('src/lib/rukn/ruknOrganisationalInformation.ts')
  assert(orgInfo.includes('getActiveMuttafiqRelationshipsForRukn'), 'org metric counts muttafiqRelationships')
  assert(
    orgInfo.includes('muttafiqeen: getActiveMuttafiqRelationshipsForRukn(ruknId).length'),
    'org Muttafiq count is relationship length, not a hardcoded empty value',
  )
  const orgCard = read('src/components/rukn/RuknHomeOrganisationalInformation.tsx')
  assert(orgCard.includes('useMuttafiqRelationshipStore'), 'org card re-renders on relationship hydrate')

  const eligibility = read('src/lib/peopleClassification.ts')
  assert(
    eligibility.includes("getPersonCategory(person) === 'Karkun'") &&
      eligibility.includes('!isSoftRemoved(person)') &&
      eligibility.includes('isCampaignEligible'),
    'campaign eligibility unchanged (Karkun only)',
  )

  assert(
    muttafiqRuknRelationshipId('R001', 'kr-9') === 'mr_R001_kr-9',
    'deterministic relationship id',
  )
  console.log('  OK  static contracts')
}

resetRepositoryProviderForTests()
clearLocalMuttafiqRelationshipsForTests()
clearMuttafiqRelationshipStore()
clearKarkunRequestStore()
clearKarkunRegistry()
reloadMuttafiqRelationshipStoreFromPersistence()

const rukn = ruknMaster.find((row) => row.status === 'active') ?? ruknMaster[0]
assert(rukn, 'rukn fixture')

const muttafiqCreate = createMuttafiq(
  {
    name: 'Verify Muttafiq Link',
    gender: 'Male',
    mobile: '9111000099',
    place: DEFAULT_PLACE,
    status: 'active',
  },
  'verify',
  { requireNewPersonIntake: false },
)
assert(muttafiqCreate.success && muttafiqCreate.karkunId, 'create muttafiq')
const personId = muttafiqCreate.karkunId!

{
  const submitted = await submitMuttafiqRuknLinkRequest({
    personId,
    requestingRuknId: rukn!.id,
    createdBy: 'Verify Rukn',
  })
  assert(submitted.ok, `submit ok: ${!submitted.ok ? submitted.error : ''}`)
  if (!submitted.ok) throw new Error(submitted.error)
  assert(submitted.request.kind === 'muttafiq_rukn_link', 'kind')
  assert(submitted.request.status === 'Pending Approval', 'pending')
  assert(submitted.request.sourcePersonId === personId, 'request stores Muttafiq id')
  assert(submitted.request.requestingRuknId === rukn!.id, 'request stores Rukn id')

  const duplicatePending = await submitMuttafiqRuknLinkRequest({
    personId,
    requestingRuknId: rukn!.id,
  })
  assert(!duplicatePending.ok, 'duplicate pending blocked')
  assert(
    !duplicatePending.ok && duplicatePending.code === 'PENDING_EXISTS',
    'duplicate pending code',
  )

  const inbox = buildUnifiedInbox({ folder: 'pending', kind: 'muttafiq_rukn_link' })
  assert(
    inbox.some((item) => item.rawRequest?.id === submitted.request.id),
    'appears in Admin Inbox pending',
  )

  const assignmentsBefore = getAllAssignments().length
  const approved = await approvePeopleIntakeRequest({
    requestId: submitted.request.id,
    decidedBy: 'Administrator',
  })
  assert(approved.ok, `approve ok: ${!approved.ok ? approved.error : ''}`)
  const person = getKarkunById(personId)
  assert(person && getPersonCategory(person) === 'Muttafiq', 'person remains Muttafiq')
  assert(getAllAssignments().length === assignmentsBefore, 'no campaign connection created')

  reloadMuttafiqRelationshipStoreFromPersistence()
  const links = getActiveMuttafiqRelationshipsForPerson(personId)
  assert(links.length === 1, 'one active relationship')
  assert(links[0]!.ruknId === rukn!.id, 'linked rukn')

  const duplicateActive = await submitMuttafiqRuknLinkRequest({
    personId,
    requestingRuknId: rukn!.id,
  })
  assert(!duplicateActive.ok, 'duplicate active relationship blocked')

  const again = await approvePeopleIntakeRequest({
    requestId: submitted.request.id,
    decidedBy: 'Administrator',
  })
  assert(again.ok, 're-approve idempotent success')
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(
    getActiveMuttafiqRelationshipsForPerson(personId).length === 1,
    'duplicate approve does not duplicate relationship',
  )

  const approvedInbox = buildUnifiedInbox({ folder: 'approved', kind: 'muttafiq_rukn_link' })
  assert(
    approvedInbox.some((item) => item.rawRequest?.id === submitted.request.id),
    'appears in Approved',
  )

  // Registry display source: Active relationships only (batched index).
  const byPerson = getActiveMuttafiqRelationshipsByPersonId()
  assert(byPerson.get(personId)?.[0]?.ruknId === rukn!.id, 'registry index shows linked Rukn')
  assert(getPersonCategory(getKarkunById(personId)!) === 'Muttafiq', 'category still Muttafiq')
  assert(getAllAssignments().length === assignmentsBefore, 'still no campaign connections')

  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(
    getActiveMuttafiqRelationshipsByPersonId().get(personId)?.[0]?.ruknId === rukn!.id,
    'linked Rukn survives reload from persistence',
  )

  console.log('  OK  submit → inbox → approve → relationship (idempotent)')
}

{
  const adminPerson = createMuttafiq(
    {
      name: 'Admin Direct Link Person',
      gender: 'Male',
      mobile: '9111000077',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(adminPerson.success && adminPerson.karkunId, 'admin-path muttafiq')
  const adminPersonId = adminPerson.karkunId!
  const requestsBefore = getAllKarkunRequests().length
  const assignmentsBefore = getAllAssignments().length
  const pendingBefore = buildUnifiedInbox({
    folder: 'pending',
    kind: 'muttafiq_rukn_link',
  }).length

  const assigned = await assignMuttafiqRuknLinkAsAdmin({
    personId: adminPersonId,
    ruknId: rukn!.id,
    establishedBy: 'Administrator',
  })
  assert(assigned.ok, `admin assign ok: ${!assigned.ok ? assigned.error : ''}`)
  if (!assigned.ok) throw new Error(assigned.error)
  assert(assigned.relationship.status === 'Active', 'admin relationship Active')
  assert(assigned.relationship.ruknId === rukn!.id, 'admin relationship rukn')
  assert(assigned.relationship.personId === adminPersonId, 'admin relationship person')
  assert(!assigned.relationship.requestId, 'admin direct has no requestId')

  assert(getAllKarkunRequests().length === requestsBefore, 'admin assign creates no request')
  assert(
    buildUnifiedInbox({ folder: 'pending', kind: 'muttafiq_rukn_link' }).length === pendingBefore,
    'admin assign creates no Inbox pending item',
  )

  const person = getKarkunById(adminPersonId)
  assert(person && getPersonCategory(person) === 'Muttafiq', 'admin path category Muttafiq')
  assert(getAllAssignments().length === assignmentsBefore, 'admin path no campaign connection')

  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(
    getActiveMuttafiqRelationshipsForPerson(adminPersonId)[0]?.ruknId === rukn!.id,
    'admin link in relationship store',
  )
  assert(
    getActiveMuttafiqRelationshipsByPersonId().get(adminPersonId)?.[0]?.ruknId === rukn!.id,
    'admin link in registry index',
  )

  const duplicateAdmin = await assignMuttafiqRuknLinkAsAdmin({
    personId: adminPersonId,
    ruknId: rukn!.id,
    establishedBy: 'Administrator',
  })
  assert(!duplicateAdmin.ok, 'admin duplicate Active blocked')

  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(
    getActiveMuttafiqRelationshipsByPersonId().get(adminPersonId)?.[0]?.ruknId === rukn!.id,
    'admin Connected survives reload',
  )
  console.log('  OK  admin direct assign → Active (no pending / no inbox)')
}

{
  const other = createMuttafiq(
    {
      name: 'Reject Link Person',
      gender: 'Female',
      mobile: '9111000088',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(other.success && other.karkunId, 'second muttafiq')
  const submitted = await submitMuttafiqRuknLinkRequest({
    personId: other.karkunId!,
    requestingRuknId: rukn!.id,
  })
  assert(submitted.ok, 'submit reject fixture')
  if (!submitted.ok) throw new Error(submitted.error)
  const rejected = await rejectNewKarkunRequest({
    requestId: submitted.request.id,
    decidedBy: 'Administrator',
  })
  assert(rejected.ok, 'reject ok')
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(
    getActiveMuttafiqRelationshipsForPerson(other.karkunId!).length === 0,
    'reject creates no relationship',
  )
  assert(
    !getActiveMuttafiqRelationshipsByPersonId().has(other.karkunId!),
    'rejected person not Connected in registry index',
  )
  console.log('  OK  reject creates no relationship')
}

{
  // Offline verify cannot mint JWT claims; prove campaign connection contracts remain
  // Karkun-only and independent of muttafiqRelationships.
  const validation = read('src/validation/assignmentValidation.ts')
  assert(validation.includes('isCampaignEligible'), 'assign validation still campaign-eligible')
  assert(
    validation.includes('Only Karkuns can participate in campaign connections.'),
    'Muttafiq still blocked from campaign connections',
  )
  const connected = read('src/lib/connections/getConnectedKarkunsForRukn.ts')
  assert(connected.includes('isCampaignEligible'), 'Connected KPI still excludes Muttafiq')
  const approveNew = read('src/services/karkunRequestService.ts')
  assert(approveNew.includes('await assignKarkun('), 'new Karkun approve still uses assignKarkun')
  console.log('  OK  existing Karkun connection workflow contracts intact')
}

{
  const repos = getRepositories()
  const current = repos.settings.loadKarkunRequests()
  assert(current.ok, 'load requests')
  const withHistory = [
    ...current.data,
    {
      id: 'hist-creq-1',
      fullName: 'Historical Conversion',
      mobile: '9000000001',
      gender: 'Male' as const,
      area: '',
      remarks: '',
      requestingRuknId: rukn!.id,
      requestingRuknName: rukn!.name,
      status: 'Approved' as const,
      kind: 'karkun_to_muttafiq' as const,
      sourcePersonId: 'kr-hist',
      previousCategory: 'Karkun' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      createdBy: 'Rukn',
      decidedBy: 'Administrator',
    },
  ]
  repos.settings.saveKarkunRequests(withHistory)
  reloadKarkunRequestStoreFromPersistence()
  const conversions = buildUnifiedInbox({ folder: 'approved', kind: 'karkun_to_muttafiq' })
  assert(
    conversions.some((item) => item.rawRequest?.id === 'hist-creq-1'),
    'historical conversion remains readable',
  )
  void getAllKarkunRequests
  console.log('  OK  historical karkun_to_muttafiq remains readable')
}

{
  const badKarkun = createKarkun(
    {
      name: 'Not A Muttafiq',
      gender: 'Male',
      mobile: '9111000066',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(badKarkun.success && badKarkun.karkunId, 'karkun for negative test')
  const blocked = await submitMuttafiqRuknLinkRequest({
    personId: badKarkun.karkunId!,
    requestingRuknId: rukn!.id,
  })
  assert(!blocked.ok, 'cannot link a Karkun via muttafiq_rukn_link')
  console.log('  OK  unauthorized person category blocked')
}

{
  const otherRukn = ruknMaster.find((row) => row.id !== rukn!.id)
  assert(otherRukn, 'second rukn for Home scoping')
  const scopedPerson = createMuttafiq(
    {
      name: 'Home Scope Muttafiq B',
      gender: 'Male',
      mobile: '9111000055',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(scopedPerson.success && scopedPerson.karkunId, 'second rukn muttafiq')
  const scopedAssign = await assignMuttafiqRuknLinkAsAdmin({
    personId: scopedPerson.karkunId!,
    ruknId: otherRukn!.id,
    establishedBy: 'Administrator',
  })
  assert(scopedAssign.ok, 'second rukn relationship')
  reloadMuttafiqRelationshipStoreFromPersistence()

  const homeA = getRuknHomeMuttafiqRows(rukn!.id)
  const homeB = getRuknHomeMuttafiqRows(otherRukn!.id)
  assert(
    homeA.some((row) => row.counterpartId === personId),
    'Rukn Home A shows Muttafiq A',
  )
  assert(
    !homeA.some((row) => row.counterpartId === scopedPerson.karkunId),
    'Rukn Home A does not show Muttafiq B',
  )
  assert(
    homeB.some((row) => row.counterpartId === scopedPerson.karkunId),
    'Rukn Home B shows Muttafiq B',
  )
  assert(
    !homeB.some((row) => row.counterpartId === personId),
    'Rukn Home B does not show Muttafiq A',
  )
  assert(
    getActiveMuttafiqRelationshipsForRukn(rukn!.id).every((row) => row.status === 'Active'),
    'Home query is Active-only',
  )

  const orgA = buildRuknOrganisationalInformation(rukn!.id, {
    peopleReady: true,
    programmesReady: false,
  })
  const orgB = buildRuknOrganisationalInformation(otherRukn!.id, {
    peopleReady: true,
    programmesReady: false,
  })
  assert(orgA.people.muttafiqeen === homeA.length, 'org metric matches Home list for Rukn A')
  assert(orgB.people.muttafiqeen === homeB.length, 'org metric matches Home list for Rukn B')

  const pendingPerson = createMuttafiq(
    {
      name: 'Pending Home Muttafiq',
      gender: 'Female',
      mobile: '9111000044',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'verify',
    { requireNewPersonIntake: false },
  )
  assert(pendingPerson.success && pendingPerson.karkunId, 'pending home muttafiq')
  const pending = await submitMuttafiqRuknLinkRequest({
    personId: pendingPerson.karkunId!,
    requestingRuknId: rukn!.id,
  })
  assert(pending.ok, 'pending submit for Home negative')
  reloadMuttafiqRelationshipStoreFromPersistence()
  assert(
    !getRuknHomeMuttafiqRows(rukn!.id).some((row) => row.counterpartId === pendingPerson.karkunId),
    'pending Inbox link does not appear on Rukn Home',
  )

  const now = new Date().toISOString()
  const endedId = muttafiqRuknRelationshipId(rukn!.id, 'kr-home-ended')
  const missingId = muttafiqRuknRelationshipId(rukn!.id, 'kr-home-uncached')
  const extra: MuttafiqRuknRelationship[] = [
    {
      id: endedId,
      ruknId: rukn!.id,
      ruknName: rukn!.name,
      personId: 'kr-home-ended',
      personName: 'Ended Muttafiq',
      status: 'Ended',
      createdAt: now,
      updatedAt: now,
      establishedBy: 'Administrator',
    },
    {
      id: missingId,
      ruknId: rukn!.id,
      ruknName: rukn!.name,
      personId: 'kr-home-uncached',
      personName: 'Uncached Muttafiq Name',
      status: 'Active',
      createdAt: now,
      updatedAt: now,
      establishedBy: 'Administrator',
    },
  ]
  const repos = getRepositories()
  const existing = repos.muttafiqRelationship.loadAll()
  assert(existing.ok, 'load relationships for Home extras')
  repos.muttafiqRelationship.saveAll([...existing.data, ...extra])
  reloadMuttafiqRelationshipStoreFromPersistence()
  const homeWithExtras = getRuknHomeMuttafiqRows(rukn!.id)
  assert(
    !homeWithExtras.some((row) => row.counterpartId === 'kr-home-ended'),
    'Ended relationship stays off Rukn Home',
  )
  const uncached = homeWithExtras.find((row) => row.counterpartId === 'kr-home-uncached')
  assert(uncached, 'Home still shows Active Muttafiq when person doc is not in cache')
  assert(uncached.counterpartName === 'Uncached Muttafiq Name', 'Home uses stored Muttafiq name')
  assert(
    !getConnectedMuttafiqDisplayRowsForRukn(rukn!.id).some(
      (row) => row.counterpartId === 'kr-home-uncached',
    ),
    'Admin display still requires a person record; Home does not drop it',
  )
  console.log('  OK  Rukn Home reads Active muttafiqRelationships with Rukn scoping')
}

console.log('verify-muttafiq-rukn-link: OK')
