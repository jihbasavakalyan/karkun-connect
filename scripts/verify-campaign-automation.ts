/**
 * Sprint 13.5 — Campaign automation engine verification.
 * Run: npx vite-node scripts/verify-campaign-automation.ts
 */
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import {
  changeKarkunRuknAssignment,
  getAssignedKarkunanForRukn,
} from '@/lib/assignmentEngine'
import {
  CampaignAutomationEngine,
  getAdminCommandCenterSnapshot,
  getRuknCommandCenterSnapshot,
} from '@/services/campaignAutomationEngine'
import { runProductionDataMigration } from '@/services/productionDataMigrationService'
import { clearAssignmentStore } from '@/stores/assignmentStore'
import type { KarkunRegistryRecord, PersonGender } from '@/types/karkun-registry.types'

const now = new Date().toISOString()

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function createKarkun(id: string, gender: PersonGender): KarkunRegistryRecord {
  return {
    id,
    name: `Automation ${gender} Karkun`,
    gender,
    mobile: '0300123456',
    place: 'Basavakalyan',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Verification',
    address: '',
    area: 'Test Area',
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
  }
}

runProductionDataMigration()

const adminSnapshot = getAdminCommandCenterSnapshot()
assert(adminSnapshot.role === 'administrator', 'Admin snapshot role must be administrator')
assert(adminSnapshot.hero !== null, 'Admin hero must derive from campaign library')
assert(adminSnapshot.hero!.progress >= 0 && adminSnapshot.hero!.progress <= 100, 'Progress must be derived')
assert(adminSnapshot.kpis.length >= 8, 'Admin must expose operational KPI cards')
assert(adminSnapshot.kpis.every((kpi) => kpi.route.startsWith('/')), 'KPI routes must be absolute')
assert(Boolean(adminSnapshot.nextAction.title), 'Admin next action must be defined')
assert(Array.isArray(adminSnapshot.schedule), 'Daily scheduler must return schedule items')
assert(Array.isArray(adminSnapshot.reminders), 'Reminder engine must return reminders')
assert(Array.isArray(adminSnapshot.alerts), 'Alert engine must return alerts')

const maleRukn = ruknMaster.find((rukn) => rukn.gender === 'Male' && rukn.status === 'active')
assert(Boolean(maleRukn), 'Need an active male Rukn for automation verification')

clearAssignmentStore()
const karkun = createKarkun('auto-k1', 'Male')
if (!MOCK_KARKUN_REGISTRY.some((record) => record.id === karkun.id)) {
  MOCK_KARKUN_REGISTRY.push(karkun)
}

const assignResult = changeKarkunRuknAssignment(karkun.id, maleRukn!.id)
assert(
  assignResult.success,
  `Assignment must succeed for automation flow: ${assignResult.success ? '' : assignResult.error}`,
)

const ruknSnapshot = getRuknCommandCenterSnapshot(maleRukn!.id)
assert(ruknSnapshot.role === 'rukn', 'Rukn snapshot role must be rukn')
assert(ruknSnapshot.kpis.length >= 6, 'Rukn must expose scoped KPI cards')
assert(
  getAssignedKarkunanForRukn(maleRukn!.id).length >= 1,
  'Assigned Karkun must appear in assignment engine',
)

const pendingVisitAction = ruknSnapshot.nextAction
assert(
  pendingVisitAction.actionLabel.toLowerCase().includes('annexure') ||
    pendingVisitAction.actionLabel.toLowerCase().includes('call') ||
    pendingVisitAction.isCaughtUp,
  'Rukn next action must guide to visit or call queue',
)

assert(
  CampaignAutomationEngine.buildCallQueue(maleRukn!.id).length >= 1,
  'Call queue must include pending first-contact Karkun',
)

console.log('Campaign automation engine verification passed.')
