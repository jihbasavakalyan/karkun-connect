/**
 * Increment 07 — Communication presentation / IA.
 * Run: npx vite-node scripts/verify-increment-07-communication.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ADMIN_NAV_ITEMS, flattenAdminNavItems } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import { isPathAllowedForRole } from '@/lib/auth/authorization'
import {
  COMMUNICATION_PRIMARY_SECTIONS,
  adminCommunicationPath,
  communicationPrimaryNavId,
  isCommunicationCosPlaceholderSection,
  resolveCommunicationSection,
} from '@/lib/communicationNavigation'
import {
  RUKN_COMMUNICATION_PRIMARY_SECTIONS,
  isRuknCommunicationPrimarySection,
  resolveRuknCommunicationSection,
  ruknCompanionPath,
} from '@/lib/ruknCommunicationNavigation'

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

assert.equal(ROUTES.ADMIN_COMMUNICATION, '/admin/communication')
assert.equal(ROUTES.RUKN_COMMUNICATION, '/rukn/communication')
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'communication')?.label,
  'مواصلات',
)
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'communication')?.to,
  ROUTES.ADMIN_COMMUNICATION,
)

const ruknLayout = read('src/layouts/RuknLayout.tsx')
assert.match(ruknLayout, /label: 'Communication'/)
assert.match(ruknLayout, /ROUTES\.RUKN_COMMUNICATION/)

assert.equal(resolveCommunicationSection(null), 'overview')
assert.equal(resolveCommunicationSection('overview'), 'overview')
assert.equal(resolveCommunicationSection('mission-center'), 'overview')
assert.equal(resolveCommunicationSection('dashboard'), 'overview')
assert.equal(resolveCommunicationSection('rukn'), 'rukn')
assert.equal(resolveCommunicationSection('karkun'), 'karkun')
assert.equal(resolveCommunicationSection('daily-reports'), 'daily-reports')
assert.equal(resolveCommunicationSection('template-library'), 'template-library')
assert.equal(resolveCommunicationSection('individual'), 'individual')
assert.equal(resolveCommunicationSection('broadcast'), 'broadcast')
assert.equal(resolveCommunicationSection('templates'), 'templates')
assert.equal(resolveCommunicationSection('history'), 'history')
assert.equal(resolveCommunicationSection('failed'), 'failed')
assert.equal(resolveCommunicationSection('whatsapp'), 'tool-settings')
assert.equal(resolveCommunicationSection('queue'), 'queue')
assert.ok(isCommunicationCosPlaceholderSection('queue'))
assert.ok(isCommunicationCosPlaceholderSection('audiences'))
assert.ok(isCommunicationCosPlaceholderSection('journeys'))
assert.ok(isCommunicationCosPlaceholderSection('delivery'))
assert.ok(!isCommunicationCosPlaceholderSection('overview'))
assert.equal(communicationPrimaryNavId('broadcast'), 'individual')
assert.equal(communicationPrimaryNavId('failed'), 'history')
assert.equal(communicationPrimaryNavId('scheduled'), 'history')
assert.equal(communicationPrimaryNavId('queue'), null)
assert.equal(adminCommunicationPath(), ROUTES.ADMIN_COMMUNICATION)
assert.equal(adminCommunicationPath('overview'), ROUTES.ADMIN_COMMUNICATION)
assert.equal(adminCommunicationPath('mission-center'), ROUTES.ADMIN_COMMUNICATION)

const primaryIds = COMMUNICATION_PRIMARY_SECTIONS.map((section) => section.id)
assert.deepEqual(primaryIds, [
  'overview',
  'rukn',
  'karkun',
  'daily-reports',
  'template-library',
  'individual',
  'templates',
  'history',
  'tool-settings',
])
assert.ok(COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label === 'Rukn Messages'))
assert.ok(COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label === 'Karkun Messages'))
assert.ok(COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label === 'Daily Reports'))
assert.ok(COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label === 'Official Communications'))
assert.ok(COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label === 'Individual / Broadcast'))
assert.ok(COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label === 'Custom Communications'))
assert.ok(COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label === 'History / Failed'))
assert.ok(COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label === 'WhatsApp Settings'))
assert.ok(!COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label === 'Mission Center'))
assert.ok(!COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label === 'Communication Queue'))
assert.ok(!COMMUNICATION_PRIMARY_SECTIONS.some((section) => section.label.includes('Messaging Tools')))

const adminPage = read('src/pages/admin/CommunicationModulePage.tsx')
assert.match(adminPage, /CommunicationDashboard/)
assert.match(adminPage, /title="مواصلات"/)
assert.doesNotMatch(adminPage, /MissionCenterPanel/)
assert.doesNotMatch(adminPage, /AdminQueuePanel/)
assert.match(adminPage, /RuknCommunicationPanel/)
assert.match(adminPage, /KarkunCommunicationPanel/)
assert.match(adminPage, /DailyReportsPanel/)
assert.match(adminPage, /OfficialCommunicationsPanel/)
assert.match(adminPage, /IndividualMessagesPanel/)
assert.match(adminPage, /BroadcastComposerPanel/)
assert.match(adminPage, /TemplateManagementPanel/)
assert.match(adminPage, /DeliveryHistoryPanel/)
assert.match(adminPage, /FailedMessagesPanel/)
assert.match(adminPage, /WhatsAppSettingsPanel/)
assert.match(adminPage, /CommunicationDeferredSection/)

const nav = read('src/components/communication/CommunicationSectionNav.tsx')
assert.match(nav, /COMMUNICATION_PRIMARY_SECTIONS/)
assert.doesNotMatch(nav, /COMMUNICATION_SECTION_GROUPS/)
assert.match(nav, /overflow-x-auto/)

assert.equal(resolveRuknCommunicationSection(null), 'my-karkuns')
assert.equal(resolveRuknCommunicationSection('follow-ups'), 'follow-ups')
assert.equal(resolveRuknCommunicationSection('conversations'), 'conversations')
assert.ok(isRuknCommunicationPrimarySection('my-karkuns'))
assert.ok(isRuknCommunicationPrimarySection('follow-ups'))
assert.ok(!isRuknCommunicationPrimarySection('conversations'))
assert.ok(!isRuknCommunicationPrimarySection('visit-planning'))
assert.equal(RUKN_COMMUNICATION_PRIMARY_SECTIONS.length, 2)
assert.equal(ruknCompanionPath('kr-1'), '/rukn/communication/companion/kr-1')

const ruknPage = read('src/pages/rukn/RuknCommunicationPage.tsx')
assert.match(ruknPage, /MyConnectedKarkunsPanel/)
assert.match(ruknPage, /RuknFollowUpsPanel/)
assert.match(read('src/components/communication/cos/RuknCosPanels.tsx'), /TodaysActionsPanel/)
assert.doesNotMatch(ruknPage, /RuknConversationsPanel/)
assert.doesNotMatch(ruknPage, /RuknVisitPlanningPanel/)
assert.doesNotMatch(ruknPage, /RuknNotesPanel/)
assert.doesNotMatch(ruknPage, /RuknRafeeqSectionPanel/)
assert.match(ruknPage, /Visit is a separate destination/)
assert.match(ruknPage, /Not a chat/)

const ruknNav = read('src/components/communication/cos/RuknCommunicationSectionNav.tsx')
assert.match(ruknNav, /RUKN_COMMUNICATION_PRIMARY_SECTIONS/)
assert.doesNotMatch(ruknNav, /Conversations/)
assert.doesNotMatch(ruknNav, /Visit Planning/)

const router = read('src/routes/AppRouter.tsx')
assert.match(router, /path="communication" element=\{<CommunicationModulePage \/>\}/)
assert.match(router, /path="communication" element=\{<RuknCommunicationPage \/>\}/)
assert.match(router, /path="communication\/companion\/:karkunId"/)
assert.doesNotMatch(router, /path="chat"/)
assert.match(router, /path="inbox" element=\{<AdminInboxPage \/>\}/)
assert.match(router, /path="visit\/:karkunId"/)
assert.match(router, /path="communication-history"/)

assert.equal(isPathAllowedForRole('/admin/communication', 'administrator'), true)
assert.equal(isPathAllowedForRole('/admin/communication', 'rukn'), false)
assert.equal(isPathAllowedForRole('/rukn/communication', 'rukn'), true)
assert.equal(isPathAllowedForRole('/rukn/communication', 'administrator'), false)

const collections = read('src/repositories/firestore/collections.ts')
assert.match(collections, /communications: 'communications'/)
assert.match(collections, /communicationState: 'state'/)
assert.doesNotMatch(collections, /conversations:/)
assert.doesNotMatch(collections, /threads:/)

const rules = read('firestore.rules')
const commsBlock = rules.slice(rules.indexOf('match /communications/{docId}'))
const commsEnd = commsBlock.indexOf('match /meqatiMansoobas')
const comms = commsEnd >= 0 ? commsBlock.slice(0, commsEnd) : commsBlock
assert.match(comms, /allow read, write: if isAdministrator\(\);/)

const messageType = read('src/types/ruknAdminMessage.types.ts')
assert.doesNotMatch(messageType, /threadId/)

const inbox = read('src/lib/peopleLifecycle/InboxEngine.ts')
assert.doesNotMatch(inbox, /getCommunicationHistory/)
assert.match(inbox, /getAllRuknAdminMessages/)

const scheduled = read('src/components/communication/ScheduledMessagesPanel.tsx')
assert.match(scheduled, /not sent automatically/)
assert.doesNotMatch(scheduled, /No messages can be scheduled yet/)
assert.doesNotMatch(scheduled, /Coming in next release/)

const composer = read('src/components/communication/MessageComposerModal.tsx')
assert.doesNotMatch(composer, /Sprint 16/)
assert.match(composer, /will not send automatically/)

assert.doesNotMatch(read('src/pages/admin/CommunicationModulePage.tsx'), /Sprint 16/)
assert.doesNotMatch(read('src/components/communication/FailedMessagesPanel.tsx'), /Sprint 16/)

const personKarkun = read('src/pages/admin/KarkunProfilePage.tsx')
assert.match(personKarkun, /CommunicationActions/)
const ruknDetail = read('src/pages/admin/RuknDetailPage.tsx')
assert.match(ruknDetail, /CommunicationActions/)
assert.match(read('src/components/assignment/AssignmentMappingView.tsx'), /buildWhatsAppLink/)
assert.match(read('src/components/rukn/RuknHomeKarkunActions.tsx'), /WhatsApp/)
assert.match(read('src/pages/rukn/RuknHomePage.tsx'), /buildWhatsAppLink|RuknHomeKarkunActions/)
assert.match(read('src/pages/rukn/ConnectionJourneyPage.tsx'), /MessageComposerModal/)
assert.match(read('src/pages/admin/RuknModulePage.tsx'), /OfficialBriefingModal/)
assert.doesNotMatch(ruknPage, /RuknMessageAdminPanel/)

assert.match(read('src/stores/communicationStore.ts'), /getRepositories\(\)\.communication/)
assert.match(read('src/hooks/useCommunication.ts'), /subscribeToCommunicationStore/)

console.log('OK: increment 07 Communication verification passed.')
