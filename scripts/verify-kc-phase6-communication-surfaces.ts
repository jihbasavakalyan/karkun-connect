/**
 * BATCH-06A / TASK-052–056 — Communication surfaces local smoke (no live Firestore / GCP).
 * Run: npm run verify:kc-phase6-communication-surfaces
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resetRepositoryProviderForTests } from '@/repositories/provider'
import { buildUnifiedInbox } from '@/lib/peopleLifecycle/InboxEngine'
import { mergeRuknAdminMessagesById } from '@/lib/ruknAdminMessageMerge'
import { submitRuknAdminMessage, markRuknAdminMessageRead } from '@/services/ruknAdminMessageService'
import type { RuknAdminMessage } from '@/types/ruknAdminMessage.types'

const root = resolve(process.cwd())

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `expected ${label}: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `did not expect ${label}: ${needle}`)
}

await resetRepositoryProviderForTests()

console.log('▶ frozen routes: Admin Inbox only')
{
  const routes = read('src/constants/routes.ts')
  const appRouter = read('src/routes/AppRouter.tsx')
  const ruknNav = read('src/layouts/RuknLayout.tsx')
  assertIncludes(routes, "ADMIN_INBOX: '/admin/inbox'", 'admin inbox route')
  assertNotIncludes(routes, 'RUKN_INBOX', 'no Rukn Inbox route constant')
  assertNotIncludes(routes, 'KARKUN_INBOX', 'no Karkun Inbox route constant')
  assertIncludes(appRouter, 'path="inbox" element={<AdminInboxPage />}', 'admin inbox mounted')
  assert.ok(
    !/path=["']rukn\/inbox["']/.test(appRouter) && !appRouter.includes('RuknInbox'),
    'no Rukn Inbox route',
  )
  assert.ok(
    !/path=["']karkun\/inbox["']/.test(appRouter) && !appRouter.includes('KarkunInbox'),
    'no Karkun Inbox route',
  )
  assertNotIncludes(ruknNav, '/rukn/inbox', 'Rukn nav has no inbox')
}

console.log('▶ InboxEngine does not map WhatsApp history')
{
  const inbox = read('src/lib/peopleLifecycle/InboxEngine.ts')
  assertNotIncludes(inbox, 'isRuknVisibleCommunication', 'inbox not using WhatsApp history filter')
  assertNotIncludes(inbox, 'getCommunicationHistory', 'inbox not reading WhatsApp blob')
  assertIncludes(inbox, 'getAllRuknAdminMessages', 'inbox reads internal messages')
  assertIncludes(inbox, "kind: 'rukn_message'", 'rukn_message kind preserved')
  assertNotIncludes(inbox, 'threadId', 'no thread id on inbox items')
}

console.log('▶ no chat/thread entity')
{
  const messageType = read('src/types/ruknAdminMessage.types.ts')
  assertNotIncludes(messageType, 'threadId', 'no threadId')
  assertNotIncludes(messageType, 'parentId', 'no parentId')
  assertNotIncludes(messageType, 'replies', 'no replies')
  assertIncludes(messageType, "status: RuknAdminMessageStatus", 'one-way status')
  const conversations = read('src/components/communication/cos/RuknCosPanels.tsx')
  assertIncludes(conversations, 'CosPlaceholderPanel', 'conversations remain placeholder')
}

console.log('▶ settings persist, not a new collection or communications blob')
{
  const collections = read('src/repositories/firestore/collections.ts')
  assertIncludes(collections, "ruknAdminMessages: 'ruknAdminMessages'", 'settings doc id')
  assert.ok(!/ruknAdminMessages:\s*'ruknAdminMessages'/.test(
    collections.split('FIRESTORE_COLLECTIONS')[1]?.split('FIRESTORE_DOCS')[0] ?? '',
  ), 'not a new top-level collection')
  const rules = read('firestore.rules')
  assertIncludes(rules, "docId == 'ruknAdminMessages'", 'Rukn may access settings doc')
  const commsBlock = rules.slice(rules.indexOf('match /communications/{docId}'))
  const commsEnd = commsBlock.indexOf('match /meqatiMansoobas')
  const comms = commsEnd >= 0 ? commsBlock.slice(0, commsEnd) : commsBlock
  assertIncludes(comms, 'allow read, write: if isAdministrator();', 'communications remains Admin-only')
}

console.log('▶ WhatsApp action surfaces')
{
  const adminRukn = read('src/pages/admin/RuknDetailPage.tsx')
  const adminKarkun = read('src/pages/admin/KarkunProfilePage.tsx')
  const ruknCard = read('src/components/forms/rukn/RuknAssignmentCard.tsx')
  const connected = read('src/components/communication/cos/MyConnectedKarkunsPanel.tsx')
  const companion = read('src/components/communication/cos/CompanionWorkspaceView.tsx')
  const actions = read('src/components/communication/CommunicationActions.tsx')
  assertIncludes(adminRukn, 'CommunicationActions', 'Admin → Rukn WhatsApp on detail')
  assertIncludes(adminKarkun, 'CommunicationActions', 'Admin → Karkun WhatsApp on profile')
  assertIncludes(ruknCard, 'WhatsApp', 'Admin Rukn card WhatsApp action')
  assertIncludes(connected, 'WhatsApp', 'Rukn → Karkun WhatsApp on connected list')
  assertIncludes(companion, 'buildWhatsAppLink', 'Rukn → Karkun WhatsApp on companion')
  assertIncludes(actions, 'Compose WhatsApp message', 'shared WhatsApp composer')
}

console.log('▶ Rukn → Admin compose surface is not an inbox')
{
  const panel = read('src/components/communication/RuknMessageAdminPanel.tsx')
  const home = read('src/pages/rukn/RuknHomePage.tsx')
  assertIncludes(panel, 'Send to Administrator', 'compose submit')
  assertIncludes(panel, 'not a chat', 'explicit non-chat copy')
  assertIncludes(home, 'RuknMessageAdminPanel', 'compose on Rukn home')
  assertNotIncludes(panel, '/rukn/inbox', 'Rukn compose is not an inbox route')
}

console.log('▶ merge: read beats unread; submit appears in Admin Inbox')
{
  const now = new Date().toISOString()
  const unread: RuknAdminMessage = {
    id: 'ram-1',
    ruknId: 'R-1',
    ruknName: 'Test Rukn',
    subject: 'Help',
    body: 'Need guidance',
    status: 'unread',
    createdAt: now,
    updatedAt: now,
  }
  const readMsg: RuknAdminMessage = {
    ...unread,
    status: 'read',
    updatedAt: new Date(Date.parse(now) + 1000).toISOString(),
    readAt: new Date(Date.parse(now) + 1000).toISOString(),
    readBy: 'Administrator',
  }
  const merged = mergeRuknAdminMessagesById([unread], [readMsg])
  assert.equal(merged.length, 1)
  assert.equal(merged[0]?.status, 'read')

  const submitted = await submitRuknAdminMessage({
    ruknId: 'R-verify-06a',
    ruknName: 'Verify Rukn',
    subject: 'Batch 06A',
    body: 'Internal note for Admin Inbox.',
  })
  assert.equal(submitted.ok, true)
  if (!submitted.ok) throw new Error('submit failed')
  const inbox = buildUnifiedInbox({ kind: 'rukn_message' })
  assert.ok(
    inbox.some((item) => item.rawInternalMessage?.id === submitted.message.id),
    'submitted message appears in Admin Inbox',
  )
  assert.ok(
    inbox.every((item) => item.kind === 'rukn_message'),
    'filter is rukn_message only',
  )
  const marked = await markRuknAdminMessageRead({
    messageId: submitted.message.id,
    readBy: 'Administrator',
  })
  assert.equal(marked.ok, true)
  const after = buildUnifiedInbox({ kind: 'rukn_message', folder: 'archived' })
  assert.ok(
    after.some((item) => item.rawInternalMessage?.id === submitted.message.id),
    'read message moves to archived',
  )
}

console.log('▶ notifications / calendar / occurrence untouched by this batch gate')
{
  const gate = read('docs/architecture/kc-phase6-communication-surfaces-arch009-gate.md')
  assertIncludes(gate, 'Notifications, Calendar, Occurrence, and tracking rules are **out of scope**', 'out of scope recorded')
}

console.log('PASS verify:kc-phase6-communication-surfaces')
