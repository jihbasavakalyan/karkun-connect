/**
 * Increment 08 — Admin Inbox (ان باکس) presentation / Pending semantics.
 * Run: npx vite-node scripts/verify-increment-08-inbox.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ADMIN_NAV_ITEMS, flattenAdminNavItems } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import { isPathAllowedForRole } from '@/lib/auth/authorization'
import {
  buildUnifiedInbox,
  resolveInboxFolder,
} from '@/lib/peopleLifecycle'
import { markRuknAdminMessageRead, submitRuknAdminMessage } from '@/services/ruknAdminMessageService'

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

assert.equal(ROUTES.ADMIN_INBOX, '/admin/inbox')
/** Increment 14 — ان باکس is under مواصلات; not a separate primary sidebar item. */
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'inbox'),
  undefined,
)
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'communication')?.label,
  'مواصلات',
)
assert.ok(
  flattenAdminNavItems(ADMIN_NAV_ITEMS)
    .find((item) => item.id === 'communication')
    ?.matchPrefixes?.includes(ROUTES.ADMIN_INBOX),
)

assert.equal(isPathAllowedForRole('/admin/inbox', 'administrator'), true)
assert.equal(isPathAllowedForRole('/admin/inbox', 'rukn'), false)

assert.equal(resolveInboxFolder(null), 'pending')
assert.equal(resolveInboxFolder(undefined), 'pending')
assert.equal(resolveInboxFolder('unknown'), 'pending')
assert.equal(resolveInboxFolder('pending'), 'pending')
assert.equal(resolveInboxFolder('approved'), 'approved')
assert.equal(resolveInboxFolder('rejected'), 'rejected')
assert.equal(resolveInboxFolder('archived'), 'archived')
assert.equal(resolveInboxFolder('all'), 'all')

const router = read('src/routes/AppRouter.tsx')
assert.match(router, /path="inbox" element=\{<AdminInboxPage \/>\}/)
assert.doesNotMatch(router, /rukn\/inbox/)
assert.doesNotMatch(router, /RUKN_INBOX/)
assert.doesNotMatch(router, /path="chat"/)
assert.match(router, /path="communication" element=\{<CommunicationModulePage \/>\}/)

const ruknLayout = read('src/layouts/RuknLayout.tsx')
assert.doesNotMatch(ruknLayout, /inbox/i)
assert.match(ruknLayout, /ROUTES\.RUKN_COMMUNICATION/)

const page = read('src/pages/admin/AdminInboxPage.tsx')
assert.match(page, /ان باکس/)
assert.match(page, /ds-tab/)
assert.match(page, /Inbox folders/)
assert.match(page, /Pending/)
assert.match(page, /Approved/)
assert.match(page, /Rejected/)
assert.match(page, /Archived/)
assert.match(page, /All/)
assert.match(page, /setSearchParams/)
assert.match(page, /folder/)
assert.match(page, /query/)
assert.match(page, /writeInboxSearchParams/)
assert.match(page, /useRepositoryHydrationStatus/)
assert.match(page, /ListSkeleton/)
assert.match(page, /No items in this folder/)
assert.match(page, /Unable to load Inbox/)
assert.match(page, /TrainingGatheringAdminPanel/)
assert.match(page, /تربیتی اجتماع/)
assert.match(page, /inbox-tarbiyati-heading/)
assert.match(page, /approvePeopleIntakeRequest/)
assert.match(page, /rejectNewKarkunRequest/)
assert.match(page, /markRuknAdminMessageRead/)
assert.match(page, /WhatsApp Rukn/)
assert.match(page, /View person/)
assert.match(page, /View Rukn/)
assert.match(page, /PublicTrainingApproveFields/)
assert.doesNotMatch(page, /RuknMessageAdminPanel/)
assert.doesNotMatch(page, /threadId/)
assert.doesNotMatch(page, /TarbiyatiIjtemaRuknHero/)
assert.doesNotMatch(page, /RuknHomePage/)

const tarbiyatiIndex = page.indexOf('تربیتی اجتماع')
const trainingMountIndex = page.indexOf('<TrainingGatheringAdminPanel')
const itemsIndex = page.indexOf('groupedItems.map')
assert.ok(tarbiyatiIndex > itemsIndex, 'Tarbiyati section is below Inbox items')
assert.ok(trainingMountIndex > tarbiyatiIndex, 'Training panel remains under تربیتی اجتماع')

const engine = read('src/lib/peopleLifecycle/InboxEngine.ts')
assert.match(engine, /item\.folder === folder/)
assert.doesNotMatch(engine, /if \(!request\) return false/)
assert.doesNotMatch(engine, /getCommunicationHistory/)
assert.match(engine, /getAllRuknAdminMessages/)

const collections = read('src/repositories/firestore/collections.ts')
assert.match(collections, /karkunRequests: 'karkunRequests'/)
assert.match(collections, /ruknAdminMessages: 'ruknAdminMessages'/)
assert.doesNotMatch(collections, /inboxItems:/)
assert.doesNotMatch(collections, /threads:/)
assert.doesNotMatch(collections, /conversations:/)

const messageType = read('src/types/ruknAdminMessage.types.ts')
assert.doesNotMatch(messageType, /threadId/)
assert.match(messageType, /status: RuknAdminMessageStatus/)

const ruknHome = read('src/pages/rukn/RuknHomePage.tsx')
assert.match(ruknHome, /TarbiyatiIjtemaRuknHero/)
assert.match(ruknHome, /RuknHomeMeqatiMansooba/)
assert.match(ruknHome, /RuknHomeKarkunActions/)
assert.match(ruknHome, /WeeklyIjtemaAttendanceOpenCard/)
assert.match(ruknHome, /RuknHomeBaitulMaalCard/)

const hero = read('src/components/home/TarbiyatiIjtemaRuknHero.tsx')
assert.match(hero, /Tarbiyati Ijtema registration/)

const communication = read('src/pages/admin/CommunicationModulePage.tsx')
assert.match(communication, /مواصلات/)
assert.doesNotMatch(communication, /MissionCenterPanel/)

const personKarkun = read('src/pages/admin/KarkunProfilePage.tsx')
assert.match(personKarkun, /CommunicationActions/)

{
  const submitted = await submitRuknAdminMessage({
    ruknId: 'R-verify-inc08',
    ruknName: 'Increment 08 Rukn',
    subject: 'Pending attention',
    body: 'Unread Rukn note for Admin Inbox Pending.',
  })
  assert.equal(submitted.ok, true)
  if (!submitted.ok) throw new Error('submit failed')

  const pending = buildUnifiedInbox({ folder: 'pending' })
  assert.ok(
    pending.some((item) => item.rawInternalMessage?.id === submitted.message.id),
    'unread Rukn message appears in Pending',
  )
  const all = buildUnifiedInbox({ folder: 'all', kind: 'rukn_message' })
  assert.ok(
    all.some((item) => item.rawInternalMessage?.id === submitted.message.id),
    'unread Rukn message remains in All',
  )

  const marked = await markRuknAdminMessageRead({
    messageId: submitted.message.id,
    readBy: 'Administrator',
  })
  assert.equal(marked.ok, true)

  const pendingAfter = buildUnifiedInbox({ folder: 'pending' })
  assert.ok(
    !pendingAfter.some((item) => item.rawInternalMessage?.id === submitted.message.id),
    'read Rukn message leaves Pending',
  )
  const archived = buildUnifiedInbox({ folder: 'archived', kind: 'rukn_message' })
  assert.ok(
    archived.some((item) => item.rawInternalMessage?.id === submitted.message.id),
    'read Rukn message is Archived',
  )
}

console.log('OK: increment 08 Inbox verification passed.')
