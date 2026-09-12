/**
 * Increment 14 — Communication + Inbox IA integration.
 * Run: npm run verify:increment-14-communication-inbox
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ADMIN_NAV_ITEMS,
  findActiveAdminNavItem,
  flattenAdminNavItems,
} from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import {
  COMMUNICATION_INBOX_NAV,
  COMMUNICATION_PRIMARY_SECTIONS,
} from '@/lib/communicationNavigation'
import {
  buildUnifiedInbox,
  countUnreadInboxItems,
} from '@/lib/peopleLifecycle'
import { buildOrganisationalSituation } from '@/lib/dashboard/organisationalSituation'
import { resolveMeqatiYear } from '@/lib/dashboard/meqatiYear'
import { markRuknAdminMessageRead, submitRuknAdminMessage } from '@/services/ruknAdminMessageService'

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

// --- NAVIGATION ---
assert.equal(ROUTES.ADMIN_COMMUNICATION, '/admin/communication')
assert.equal(ROUTES.ADMIN_INBOX, '/admin/inbox')
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'communication')?.label,
  'مواصلات',
)
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'inbox'),
  undefined,
  'separate primary Inbox sidebar item must be absent',
)
assert.equal(findActiveAdminNavItem('/admin/inbox', '')?.id, 'communication')
assert.equal(findActiveAdminNavItem('/admin/communication', '')?.id, 'communication')

const router = read('src/routes/AppRouter.tsx')
assert.match(router, /path="inbox" element=\{<AdminInboxPage \/>\}/)
assert.match(router, /path="communication" element=\{<CommunicationModulePage \/>\}/)

// --- COMMUNICATION → INBOX ---
assert.equal(COMMUNICATION_INBOX_NAV.label, 'ان باکس')
assert.equal(COMMUNICATION_INBOX_NAV.to, ROUTES.ADMIN_INBOX)
assert.ok(!COMMUNICATION_PRIMARY_SECTIONS.some((s) => s.id === 'inbox'))

const sectionNav = read('src/components/communication/CommunicationSectionNav.tsx')
assert.match(sectionNav, /COMMUNICATION_INBOX_NAV/)
assert.match(sectionNav, /ADMIN_INBOX|COMMUNICATION_INBOX_NAV\.to/)

const overview = read('src/components/communication/CommunicationDashboard.tsx')
assert.match(overview, /countUnreadInboxItems/)
assert.match(overview, /ADMIN_INBOX/)
assert.match(overview, /ان باکس|COMMUNICATION_INBOX_NAV/)
assert.doesNotMatch(overview, /buildUnifiedInbox/)

const inboxPage = read('src/pages/admin/AdminInboxPage.tsx')
assert.match(inboxPage, /CommunicationSectionNav/)
assert.match(inboxPage, /inboxActive/)
assert.match(inboxPage, /ان باکس/)
assert.match(inboxPage, /buildUnifiedInbox/)
assert.match(inboxPage, /countUnreadInboxItems/)

// --- DASHBOARD ATTENTION ---
const situationSrc = read('src/lib/dashboard/organisationalSituation.ts')
assert.match(situationSrc, /countUnreadInboxItems/)
assert.match(situationSrc, /id: 'inbox'/)
assert.match(situationSrc, /ADMIN_INBOX/)
assert.doesNotMatch(situationSrc, /getPendingKarkunRequests/)

const dash = read('src/components/dashboard/OrganisationalDashboardStack.tsx')
assert.match(dash, /orgdash-attention-link/)
assert.match(dash, /row\.route/)
assert.match(dash, /ان باکس|inbox/)

const metricsCache = read('src/conversation/mvp/turnMetricsCache.ts')
assert.match(metricsCache, /countUnreadInboxItems/)
assert.doesNotMatch(metricsCache, /getPendingKarkunRequests/)

const year = resolveMeqatiYear()
const situation = buildOrganisationalSituation(year)
const inboxCat = situation.attention.categories.find((c) => c.id === 'inbox')
assert.ok(inboxCat)
assert.equal(inboxCat!.route, ROUTES.ADMIN_INBOX)
assert.equal(inboxCat!.count, countUnreadInboxItems())
assert.equal(inboxCat!.label, 'ان باکس')

// --- INBOX SEMANTICS (Increment 08 preserved) ---
{
  const before = countUnreadInboxItems()
  const submitted = await submitRuknAdminMessage({
    ruknId: 'R-verify-inc14',
    ruknName: 'Verify Inc14',
    subject: 'Inc14 attention',
    body: 'Unread must count toward Dashboard + Inbox attention.',
  })
  assert.equal(submitted.ok, true)
  if (!submitted.ok) throw new Error('submit failed')
  const afterSubmit = countUnreadInboxItems()
  assert.equal(afterSubmit, before + 1)
  assert.ok(
    buildUnifiedInbox({ folder: 'pending' }).some(
      (item) => item.rawInternalMessage?.id === submitted.message.id,
    ),
  )
  const situationAfter = buildOrganisationalSituation(year)
  assert.equal(
    situationAfter.attention.categories.find((c) => c.id === 'inbox')?.count,
    afterSubmit,
  )
  const marked = await markRuknAdminMessageRead({
    messageId: submitted.message.id,
    readBy: 'Administrator',
  })
  assert.equal(marked.ok, true)
  const afterRead = countUnreadInboxItems()
  assert.equal(afterRead, before)
  assert.ok(
    !buildUnifiedInbox({ folder: 'pending' }).some(
      (item) => item.rawInternalMessage?.id === submitted.message.id,
    ),
  )
}

// --- ARCHITECTURE ---
const collections = read('src/repositories/firestore/collections.ts')
assert.doesNotMatch(collections, /inboxItems:/)
assert.doesNotMatch(collections, /threads:/)
assert.doesNotMatch(collections, /messageCenter:/)
const rules = read('firestore.rules')
assert.match(rules, /match \/campaigns\/\{campaignId\}/)
assert.doesNotMatch(read('src/stores/communicationStore.ts'), /karkunRequestStore|ruknAdminMessageStore/)

console.log('OK: Increment 14 Communication + Inbox verification passed.')
