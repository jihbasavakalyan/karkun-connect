/**
 * New Karkun / Muttafiq intake validation + Admin Inbox Pending status query.
 * Run: npm run verify:new-person-intake
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import { buildUnifiedInbox } from '@/lib/peopleLifecycle/InboxEngine'
import { createKarkun, createMuttafiq, clearKarkunRegistry } from '@/lib/peopleStore'
import { validateNewPersonIntake } from '@/lib/newPersonIntakeValidation'
import { resetRepositoryProviderForTests } from '@/repositories/provider'
import { submitNewKarkunRequest, submitNewMuttafiqRequest } from '@/services/karkunRequestService'
import {
  appendKarkunRequest,
  clearKarkunRequestStore,
  getAllKarkunRequests,
  getPendingKarkunRequests,
  reloadKarkunRequestStoreFromPersistence,
  resolveKarkunRequest,
} from '@/stores/karkunRequestStore'
import { DEFAULT_PLACE } from '@/types/people.types'
import type { NewKarkunRequest } from '@/types/karkunRequest.types'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

resetRepositoryProviderForTests()
clearKarkunRequestStore()
clearKarkunRegistry()
reloadKarkunRequestStoreFromPersistence()

const referring =
  ruknMaster.find((row) => row.status === 'active' && !row.isArchived && row.gender === 'Male') ??
  ruknMaster[0]!
const femaleRukn =
  ruknMaster.find((row) => row.status === 'active' && !row.isArchived && row.gender === 'Female') ??
  referring

console.log('verify-new-person-intake: start')

{
  const service = readFileSync(resolve(process.cwd(), 'src/services/karkunRequestService.ts'), 'utf8')
  assert(!service.includes('requireNewPersonIntake: false'), 'public-training approve no longer skips intake')
  assert(service.includes('validateNewPersonIntake'), 'approve reuses intake helper')
  assert(service.includes('requireReferral: true'), 'Rukn submit requires referral')
  assert(service.includes('{ requireReferral: true }'), 'new-karkun approve requires referral')
  assert(!service.includes('requireReferral: !isPublicTraining'), 'public-training approve no longer skips referral')
  const inbox = readFileSync(resolve(process.cwd(), 'src/pages/admin/AdminInboxPage.tsx'), 'utf8')
  assert(inbox.includes('SubmittedReferringRuknDisplay'), 'inbox displays submitted referring Rukn')
  assert(inbox.includes('PublicTrainingApproveFields'), 'inbox keeps referral correction for public training')
  assert(inbox.includes('approveBlockedForReferral'), 'Inbox Approve is blocked without referring Rukn')
  const fields = readFileSync(
    resolve(process.cwd(), 'src/components/forms/people/PublicTrainingApproveFields.tsx'),
    'utf8',
  )
  assert(fields.includes('Referred By Rukn *'), 'public-training referral is required in UI')
  assert(fields.includes('Verify / correct referring Rukn'), 'admin may still verify/correct submitted referral')
  assert(!fields.includes('Referred By Rukn (optional)'), 'public-training referral is not marked optional')
  assert(fields.includes('ReferringRuknSearchField'), 'inbox referral is searchable')
  assert(fields.includes('SubmittedReferringRuknDisplay'), 'inbox shows name, ID, and category')
  assert(fields.includes('publicTrainingReferralValue'), 'existing request referral is preserved in the picker')
  const queue = readFileSync(
    resolve(process.cwd(), 'src/components/forms/people/PendingKarkunRequestQueue.tsx'),
    'utf8',
  )
  assert(queue.includes('approveBlockedForReferral'), 'pending queue Approve is blocked without referring Rukn')
  assert(queue.includes('disabled={busy || approveBlockedForReferral}'), 'Reject remains enabled without referral')
}

{
  const noReferral = createKarkun(
    {
      name: 'Karkun No Referral',
      gender: 'Male',
      mobile: '9111990001',
      place: DEFAULT_PLACE,
      status: 'active',
      fatherHusbandName: 'Father',
      address: 'Address 1',
    },
    'Administrator',
    { requireReferral: true },
  )
  assert(!noReferral.success, '3. Admin Karkun without referral rejected')

  const ruknBoundary = createKarkun(
    {
      name: 'Rukn Boundary No Referral',
      gender: 'Male',
      mobile: '9111990091',
      place: DEFAULT_PLACE,
      status: 'active',
      fatherHusbandName: 'Father',
      address: 'Address 1',
    },
    'Rukn',
    { requireReferral: true },
  )
  assert(!ruknBoundary.success, '1. Rukn Karkun without referral rejected')

  const ruknIntake = validateNewPersonIntake(
    {
      referredByRuknId: '',
      fatherHusbandName: 'Father',
      address: 'Address 1',
      gender: 'Male',
    },
    { requireReferral: true },
  )
  assert(!ruknIntake.ok, '1. Rukn intake helper requires referral')

  const ruknWithSelf = createKarkun(
    {
      name: 'Rukn Boundary With Referral',
      gender: 'Male',
      mobile: '9111990092',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Father',
      address: 'Address 1',
    },
    'Rukn',
    { requireReferral: true },
  )
  assert(ruknWithSelf.success, `2. Rukn Karkun with own reference accepted: ${ruknWithSelf.error ?? ''}`)

  const withReferral = createKarkun(
    {
      name: 'Karkun With Referral',
      gender: 'Male',
      mobile: '9111990002',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Father',
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(withReferral.success, `2. referring Rukn accepted: ${withReferral.error ?? ''}`)
  assert(getKarkunById(withReferral.karkunId!)?.referredByRuknId === referring.id, '2. stored referredByRuknId')

  const neither = createKarkun(
    {
      name: 'Karkun No Family',
      gender: 'Male',
      mobile: '9111990003',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: '   ',
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(!neither.success, '3. no father and no husband rejected')

  const fatherOnly = createKarkun(
    {
      name: 'Karkun Father Only',
      gender: 'Male',
      mobile: '9111990004',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Only Father',
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(fatherOnly.success, '4. father only accepted')

  const husbandOnly = createKarkun(
    {
      name: 'Karkun Husband Only',
      gender: 'Female',
      mobile: '9111990005',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: femaleRukn.id,
      fatherHusbandName: 'Only Husband',
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(husbandOnly.success, `5. husband only accepted: ${husbandOnly.error ?? ''}`)

  const bothLabel = createKarkun(
    {
      name: 'Karkun Both Names',
      gender: 'Male',
      mobile: '9111990006',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Father and recorded family name',
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(bothLabel.success, '6. family name present accepted (canonical fatherHusbandName)')

  const noAddress = createKarkun(
    {
      name: 'Karkun No Address',
      gender: 'Male',
      mobile: '9111990007',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Father',
      address: '   ',
    },
    'Administrator',
  )
  assert(!noAddress.success, '7. missing address rejected')

  const complete = createKarkun(
    {
      name: 'Karkun Complete',
      gender: 'Male',
      mobile: '9111990008',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Father',
      address: 'Complete Address',
    },
    'Administrator',
  )
  assert(complete.success, '8. referral + family + address accepted')
  console.log('  OK  new Karkun create validation')
}

{
  const noReferral = createMuttafiq(
    {
      name: 'Muttafiq No Referral',
      gender: 'Male',
      mobile: '9111990101',
      place: DEFAULT_PLACE,
      status: 'active',
      fatherHusbandName: 'Father',
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(noReferral.success, `7. Admin Muttafiq without referral accepted: ${noReferral.error ?? ''}`)

  const ruknMuttafiqNoRef = createMuttafiq(
    {
      name: 'Rukn Muttafiq No Referral',
      gender: 'Male',
      mobile: '9111990191',
      place: DEFAULT_PLACE,
      status: 'active',
      fatherHusbandName: 'Father',
      address: 'Address 1',
    },
    'Rukn',
    { requireReferral: true },
  )
  assert(!ruknMuttafiqNoRef.success, '5. Rukn Muttafiq without referral rejected')

  const ruknMuttafiqWithRef = createMuttafiq(
    {
      name: 'Rukn Muttafiq With Referral',
      gender: 'Male',
      mobile: '9111990192',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Father',
      address: 'Address 1',
    },
    'Rukn',
    { requireReferral: true },
  )
  assert(
    ruknMuttafiqWithRef.success,
    `6. Rukn Muttafiq with reference accepted: ${ruknMuttafiqWithRef.error ?? ''}`,
  )

  const withReferral = createMuttafiq(
    {
      name: 'Muttafiq With Referral',
      gender: 'Male',
      mobile: '9111990102',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Father',
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(withReferral.success, `10. Muttafiq referral accepted: ${withReferral.error ?? ''}`)
  assert(
    getKarkunById(withReferral.karkunId!)?.referredByRuknId === referring.id,
    '10. Muttafiq stored referredByRuknId',
  )

  const neither = createMuttafiq(
    {
      name: 'Muttafiq No Family',
      gender: 'Male',
      mobile: '9111990103',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(!neither.success, '11. Muttafiq no father/husband rejected')

  const fatherOnly = createMuttafiq(
    {
      name: 'Muttafiq Father Only',
      gender: 'Male',
      mobile: '9111990104',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Only Father',
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(fatherOnly.success, '12. Muttafiq father only accepted')

  const husbandOnly = createMuttafiq(
    {
      name: 'Muttafiq Husband Only',
      gender: 'Female',
      mobile: '9111990105',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: femaleRukn.id,
      fatherHusbandName: 'Only Husband',
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(husbandOnly.success, `13. Muttafiq husband only accepted: ${husbandOnly.error ?? ''}`)

  const bothLabel = createMuttafiq(
    {
      name: 'Muttafiq Both Names',
      gender: 'Male',
      mobile: '9111990106',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Father and recorded family name',
      address: 'Address 1',
    },
    'Administrator',
  )
  assert(bothLabel.success, '14. Muttafiq family name present accepted')

  const noAddress = createMuttafiq(
    {
      name: 'Muttafiq No Address',
      gender: 'Male',
      mobile: '9111990107',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Father',
    },
    'Administrator',
  )
  assert(!noAddress.success, '15. Muttafiq missing address rejected')

  const complete = createMuttafiq(
    {
      name: 'Muttafiq Complete',
      gender: 'Male',
      mobile: '9111990108',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Father',
      address: 'Complete Address',
    },
    'Administrator',
  )
  assert(complete.success, '16. Muttafiq referral + family + address accepted')
  console.log('  OK  new Muttafiq create validation')
}

{
  const submittedK = await submitNewKarkunRequest({
    requestingRuknId: referring.id,
    fullName: 'Rukn Path Intake Karkun Unique',
    gender: 'Male',
    mobile: '9111990201',
    fatherHusbandName: 'Rukn Father',
    address: 'Rukn Address',
    acknowledgeNameWarning: true,
  })
  assert(submittedK.ok, `rukn karkun submit: ${!submittedK.ok ? submittedK.error : ''}`)
  if (!submittedK.ok) throw new Error(submittedK.error)

  const missingFamily = await submitNewKarkunRequest({
    requestingRuknId: referring.id,
    fullName: 'Rukn Path Missing Family',
    gender: 'Male',
    mobile: '9111990202',
    address: 'Rukn Address',
  })
  assert(!missingFamily.ok, 'rukn karkun submit without family rejected')

  const submittedM = await submitNewMuttafiqRequest({
    requestingRuknId: referring.id,
    fullName: 'Rukn Path Intake Muttafiq Unique',
    gender: 'Male',
    mobile: '9111990203',
    fatherHusbandName: 'Rukn Father',
    address: 'Rukn Address',
    acknowledgeNameWarning: true,
  })
  assert(submittedM.ok, `rukn muttafiq submit: ${!submittedM.ok ? submittedM.error : ''}`)
  console.log('  OK  Rukn request submit validation')
}

{
  const now = new Date().toISOString()
  const pending: NewKarkunRequest = {
    id: 'kreq-inbox-pending',
    fullName: 'Inbox Pending Person',
    mobile: '9111990301',
    gender: 'Male',
    area: '',
    remarks: '',
    requestingRuknId: referring.id,
    requestingRuknName: referring.name,
    status: 'Pending Approval',
    createdAt: now,
    updatedAt: now,
    createdBy: referring.name,
    kind: 'new_karkun',
  }
  appendKarkunRequest(pending)
  assert(
    getPendingKarkunRequests().some((row) => row.id === pending.id),
    '20. pending request appears in pending query',
  )
  assert(
    buildUnifiedInbox({ folder: 'pending' }).some((item) => item.rawRequest?.id === pending.id),
    '20. pending request appears in Inbox Pending',
  )

  const approved = resolveKarkunRequest(pending.id, 'Approved', 'Administrator', {
    createdKarkunId: 'kr-inbox-keep',
  })
  assert(approved?.status === 'Approved', 'approve sets status')
  assert(
    !getPendingKarkunRequests().some((row) => row.id === pending.id),
    '21. approved request leaves pending query',
  )
  assert(
    !buildUnifiedInbox({ folder: 'pending' }).some((item) => item.rawRequest?.id === pending.id),
    '21. approved request leaves Inbox Pending',
  )
  assert(
    getAllKarkunRequests().some((row) => row.id === pending.id && row.status === 'Approved'),
    '23. approved history preserved',
  )
  assert(
    buildUnifiedInbox({ folder: 'approved' }).some((item) => item.rawRequest?.id === pending.id),
    '23. approved request remains in Approved folder',
  )

  const rejectRow: NewKarkunRequest = {
    ...pending,
    id: 'kreq-inbox-reject',
    fullName: 'Inbox Reject Person',
    mobile: '9111990302',
    status: 'Pending Approval',
    createdKarkunId: undefined,
  }
  appendKarkunRequest(rejectRow)
  const rejected = resolveKarkunRequest(rejectRow.id, 'Rejected', 'Administrator')
  assert(rejected?.status === 'Rejected', 'reject sets status')
  assert(
    !getPendingKarkunRequests().some((row) => row.id === rejectRow.id),
    '22. rejected request leaves pending query',
  )
  assert(
    getAllKarkunRequests().some((row) => row.id === rejectRow.id && row.status === 'Rejected'),
    '23. rejected history preserved',
  )
  console.log('  OK  Admin Inbox pending/approved/rejected')
}

{
  const noReferral = createKarkun(
    {
      name: 'Public Training No Referral',
      gender: 'Male',
      mobile: '9111990501',
      place: DEFAULT_PLACE,
      status: 'active',
      fatherHusbandName: 'Training Father',
      address: 'Training Address',
    },
    'Administrator',
    { requireReferral: true },
  )
  assert(!noReferral.success, '9. public training without referral rejected')

  const noFamily = createKarkun(
    {
      name: 'Public Training No Family',
      gender: 'Male',
      mobile: '9111990502',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      address: 'Training Address',
    },
    'Administrator',
  )
  assert(!noFamily.success, 'public training missing fatherHusbandName rejected')

  const noAddress = createKarkun(
    {
      name: 'Public Training No Address',
      gender: 'Male',
      mobile: '9111990503',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Training Father',
    },
    'Administrator',
  )
  assert(!noAddress.success, 'public training missing address rejected')

  const complete = createKarkun(
    {
      name: 'Public Training Complete',
      gender: 'Male',
      mobile: '9111990504',
      place: DEFAULT_PLACE,
      status: 'active',
      referredByRuknId: referring.id,
      fatherHusbandName: 'Training Father',
      address: 'Training Address',
    },
    'Administrator',
  )
  assert(complete.success, `public training all three accepted: ${complete.error ?? ''}`)
  assert(getKarkunById(complete.karkunId!)?.referredByRuknId === referring.id, 'public training stores referral')
  assert(getKarkunById(complete.karkunId!)?.fatherHusbandName === 'Training Father', 'public training stores family name')
  assert(getKarkunById(complete.karkunId!)?.address === 'Training Address', 'public training stores address')
  const publicTrainingNoReferral = validateNewPersonIntake(
    {
      referredByRuknId: '',
      fatherHusbandName: 'Training Father',
      address: 'Training Address',
      gender: 'Male',
    },
    { requireReferral: true },
  )
  assert(!publicTrainingNoReferral.ok, 'public-training approve without referral is blocked')
  assert(
    !publicTrainingNoReferral.ok && publicTrainingNoReferral.error === 'Referred By Rukn is required.',
    'public-training uses existing referral required copy',
  )

  const publicTrainingWithReferral = validateNewPersonIntake(
    {
      referredByRuknId: referring.id,
      fatherHusbandName: 'Training Father',
      address: 'Training Address',
      gender: 'Male',
    },
    { requireReferral: true },
  )
  assert(publicTrainingWithReferral.ok, 'public-training approve with selected Rukn succeeds')
  assert(
    publicTrainingWithReferral.ok && publicTrainingWithReferral.referredByRuknId === referring.id,
    'public-training persist path keeps selected referredByRuknId',
  )
  console.log('  OK  public training new-karkun intake (referral required at submit/approve)')
}

{
  const historical = createKarkun(
    {
      name: 'Historical Incomplete',
      gender: 'Male',
      mobile: '9111990401',
      place: DEFAULT_PLACE,
      status: 'active',
    },
    'Administrator',
    { requireNewPersonIntake: false },
  )
  assert(historical.success, '17. historical-shape create does not backfill')
  assert(getKarkunById(historical.karkunId!)?.referredByRuknId === undefined, '17. no invented referral')
  console.log('  OK  existing/historical records not rewritten')
}

console.log('PASS verify-new-person-intake')
