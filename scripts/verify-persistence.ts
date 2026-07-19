/**
 * Sprint 14.5 — persistence and cross-module data integrity verification.
 * Run: npm run verify:persistence
 */
import { MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { ruknMaster } from '@/data/ruknMaster'
import { loadJsonFromStorage, loadMapFromStorage } from '@/lib/browserStorage'
import { clearPeopleRegistryPersistence } from '@/lib/peopleRegistryPersistence'
import { assignRukn } from '@/services/assignmentService'
import { runProductionDataMigration } from '@/services/productionDataMigrationService'
import { updateBaitulMaal } from '@/services/baitulMaalService'
import { saveTemplate } from '@/services/templateService'
import {
  clearAssignmentStore,
  getActiveAssignmentsForRukn,
  reloadAssignmentStoreFromPersistence,
} from '@/stores/assignmentStore'
import {
  appendSubmittedForm,
  clearAnnexure1Store,
  getAllSubmittedForms,
  reloadAnnexure1StoreFromPersistence,
} from '@/stores/annexure1Store'
import { clearBaitulMaalStore } from '@/stores/baitulMaalStore'
import { clearCommunicationStore } from '@/stores/communicationStore'
import { clearActivityLogStore } from '@/stores/activityLogStore'
import type { BaitulMaalRecord } from '@/types/baitulMaal'
import type { KarkunRegistryRecord, PersonGender } from '@/types/karkun-registry.types'
import type { SubmittedMeetingForm } from '@/types/annexure1.types'

const today = new Date().toISOString().slice(0, 10)

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function createKarkun(id: string, gender: PersonGender): KarkunRegistryRecord {
  const now = new Date().toISOString()
  return {
    id,
    name: `Persistence ${gender} Karkun`,
    gender,
    mobile: '0300123456',
    place: 'Basavakalyan',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    updatedBy: 'Verification',
    address: '',
    area: 'Central',
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

function resetAllPersistence(): void {
  clearAssignmentStore()
  clearAnnexure1Store()
  clearBaitulMaalStore()
  clearCommunicationStore()
  clearActivityLogStore()
  clearPeopleRegistryPersistence()
  MOCK_KARKUN_REGISTRY.length = 0
}

async function verifyConnectionPersistence(gender: PersonGender): Promise<void> {
  const rukn = ruknMaster.find((record) => record.status === 'active' && record.gender === gender)
  assert(Boolean(rukn), `Need active ${gender} Rukn`)

  const karkuns = Array.from({ length: 3 }, (_, index) => {
    const karkun = createKarkun(`verify-persist-${gender.toLowerCase()}-${index}`, gender)
    MOCK_KARKUN_REGISTRY.push(karkun)
    return karkun
  })

  for (const karkun of karkuns) {
    const result = await assignRukn({
      ruknId: rukn!.id,
      karkunId: karkun.id,
      effectiveFrom: today,
      assignedBy: 'Administrator',
    })
    assert(result.success, `Connection failed: ${result.success ? '' : result.error}`)
  }

  assert(getActiveAssignmentsForRukn(rukn!.id).length === 3, 'Three active connections required')

  reloadAssignmentStoreFromPersistence()
  assert(
    getActiveAssignmentsForRukn(rukn!.id).length === 3,
    'Connections must survive simulated browser reload',
  )
}

function verifyAnnexurePersistence(): void {
  const form: SubmittedMeetingForm = {
    id: 'verify-annexure-1',
    assignmentId: 'asgn-verify-1',
    karkunId: 'kr-verify',
    ruknId: 'R001',
    status: 'submitted',
    submissionDate: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    assignmentNumber: 'ASN-000099',
    assignedRukn: 'Test Rukn',
    workerName: 'Test Karkun',
    area: 'Central',
    campaignName: 'Campaign',
    visitDate: today,
    visitConducted: 'yes',
    notConductedReason: '',
    discussionSummary: 'Persistence check',
    commitmentMade: true,
    commitmentDetails: 'Weekly',
    jihAppRegistrationStatus: 'Not Discussed',
    followUpRequired: 'no',
    followUpDate: '',
    followUpPurpose: '',
  }

  appendSubmittedForm(form)
  reloadAnnexure1StoreFromPersistence()
  assert(
    getAllSubmittedForms().some((record) => record.id === 'verify-annexure-1'),
    'Annexure-1 must survive simulated browser reload',
  )
}

function verifyCompliancePersistence(): void {
  const karkunId = 'kr-compliance-persist'
  MOCK_KARKUN_REGISTRY.push(createKarkun(karkunId, 'Female'))

  const result = updateBaitulMaal({
    karkunId,
    status: 'Paid',
    paymentDate: today,
  })
  assert(result.success, `Bait-ul-Maal update failed: ${result.error}`)

  const reloaded = loadMapFromStorage<string, BaitulMaalRecord>('karkun-connect.baitul-maal')
  assert(
    [...reloaded.values()].some((record) => record.karkunId === karkunId && record.status === 'Paid'),
    'Compliance records must persist to localStorage',
  )
}

function verifyTemplatePersistence(): void {
  const template = saveTemplate({
    name: 'Persistence Template',
    category: 'custom',
    body: 'Hello {{name}}',
    variables: ['name'],
    isActive: true,
    updatedBy: 'Administrator',
  })

  const reloaded = loadJsonFromStorage<{ templates: { id: string; name: string }[] }>(
    'karkun-connect.communication',
    { templates: [] },
  )
  assert(
    reloaded.templates.some((item) => item.id === template.id && item.name === 'Persistence Template'),
    'Communication templates must persist to localStorage',
  )
}

async function main(): Promise<void> {
  resetAllPersistence()
  await runProductionDataMigration()
  await verifyConnectionPersistence('Female')
  resetAllPersistence()
  await runProductionDataMigration()
  verifyAnnexurePersistence()
  resetAllPersistence()
  await runProductionDataMigration()
  verifyCompliancePersistence()
  resetAllPersistence()
  await runProductionDataMigration()
  verifyTemplatePersistence()

  console.log('Persistence and data integrity verification passed.')
}

void main()
