import type {
  JihAppRegistrationStatus,
  KarkunRegistryRecord,
  PersonGender,
} from '@/types/karkun-registry.types'
import { DEFAULT_PLACE } from '@/types/people.types'
import { getActiveRuknNames, getRuknById } from '@/data/ruknMaster'

const KARKUN_SEED_DATE = '2026-01-20T08:00:00.000Z'

type KarkunSeedInput = Omit<
  KarkunRegistryRecord,
  'gender' | 'place' | 'status' | 'createdAt' | 'updatedAt' | 'updatedBy'
> & { gender?: PersonGender }

function seedKarkun(input: KarkunSeedInput): KarkunRegistryRecord {
  const isInactive = input.campaignStatus === 'inactive'
  return {
    ...input,
    gender: input.gender ?? 'Male',
    place: DEFAULT_PLACE,
    status: isInactive ? 'inactive' : 'active',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    assignmentDate: undefined,
    campaignStatus: isInactive ? 'inactive' : 'not_assigned',
    createdAt: KARKUN_SEED_DATE,
    updatedAt: KARKUN_SEED_DATE,
    updatedBy: 'System',
  }
}

const KARKUN_SEED_DATA: KarkunSeedInput[] = [
  {
    id: 'kr-001',
    name: 'Mohammad Kareem',
    mobile: '+92 300 1234567',
    address: 'House 12, Street 4, ABC Colony',
    area: 'ABC Area',
    assignedRukn: 'Ruqia Tahaniyat',
    assignedRuknId: 'R001',
    assignmentStatus: 'Assigned',
    assignmentDate: '2026-03-05',
    campaignStatus: 'active',
    jihRegistration: 'pending',
    visitStatus: 'scheduled',
    lastVisit: '2026-03-10',
    commitment: 'Attend weekly study circle',
    currentCommitment: 'Attend weekly study circle',
    jihAppRegistrationStatus: 'Recommended',
    notes: 'Priority contact for JIH registration follow-up.',
    isArchived: false,
  },
  {
    id: 'kr-002',
    name: 'Ali Raza',
    mobile: '+92 301 2345678',
    address: 'Flat 3B, DEF Apartments',
    area: 'DEF Area',
    assignedRukn: 'Amir Khan',
    assignedRuknId: 'R002',
    assignmentStatus: 'Assigned',
    assignmentDate: '2026-03-04',
    campaignStatus: 'active',
    jihRegistration: 'approved',
    visitStatus: 'completed',
    lastVisit: '2026-03-11',
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Registered',
    notes: 'Regular participant in community programs.',
    isArchived: false,
  },
  {
    id: 'kr-003',
    name: 'Hamza Siddiqui',
    mobile: '+92 302 3456789',
    address: 'Plot 45, GHI Block',
    area: 'GHI Area',
    assignedRukn: 'Ruqia Tahaniyat',
    assignedRuknId: 'R001',
    assignmentStatus: 'Assigned',
    assignmentDate: '2026-03-05',
    campaignStatus: 'active',
    jihRegistration: 'not_started',
    visitStatus: 'pending',
    lastVisit: null,
    commitment: 'Complete reading assignment',
    currentCommitment: 'Complete reading assignment',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: 'New contact — first visit pending.',
    isArchived: false,
  },
  {
    id: 'kr-004',
    name: 'Bilal Hussain',
    mobile: '+92 303 4567890',
    address: 'House 8, JKL Street',
    area: 'JKL Area',
    assignedRukn: 'Mohd Minhajuddin',
    assignedRuknId: 'R003',
    assignmentStatus: 'Assigned',
    assignmentDate: '2026-02-20',
    campaignStatus: 'inactive',
    jihRegistration: 'rejected',
    visitStatus: 'overdue',
    lastVisit: '2026-02-28',
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: 'Follow-up required for overdue visit.',
    isArchived: false,
  },
  {
    id: 'kr-006',
    name: 'Tariq Mahmood',
    mobile: '+92 305 6789012',
    address: 'PQR Housing Society, Block C',
    area: 'PQR Area',
    assignedRukn: 'Amir Khan',
    assignedRuknId: 'R002',
    assignmentStatus: 'Assigned',
    assignmentDate: '2026-03-04',
    campaignStatus: 'active',
    jihRegistration: 'approved',
    visitStatus: 'completed',
    lastVisit: '2026-03-12',
    commitment: 'Monthly contribution pledge',
    currentCommitment: 'Monthly contribution pledge',
    jihAppRegistrationStatus: 'Registered',
    notes: 'Reliable and responsive.',
    isArchived: false,
  },
  {
    id: 'kr-007',
    name: 'Saeed Anwar',
    mobile: '+92 306 7890123',
    address: 'STU Road, House 22',
    area: 'STU Area',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    jihRegistration: 'not_started',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: 'Awaiting Rukn assignment.',
    isArchived: false,
  },
  {
    id: 'kr-008',
    name: 'Nadeem Akhtar',
    mobile: '+92 307 8901234',
    address: 'VWX Colony, Street 9',
    area: 'VWX Area',
    assignedRukn: 'Ruqia Tahaniyat',
    assignedRuknId: 'R001',
    assignmentStatus: 'Assigned',
    assignmentDate: '2026-03-05',
    campaignStatus: 'active',
    jihRegistration: 'pending',
    visitStatus: 'pending',
    lastVisit: '2026-03-05',
    commitment: 'Follow up on JIH form',
    currentCommitment: 'Follow up on JIH form',
    jihAppRegistrationStatus: 'Recommended',
    notes: 'Documents incomplete.',
    isArchived: false,
  },
  {
    id: 'kr-010',
    name: 'Imran Shah',
    mobile: '+92 309 0123456',
    address: 'Central Plaza, Unit 5',
    area: 'Central Area',
    assignedRukn: 'Amir Khan',
    assignedRuknId: 'R002',
    assignmentStatus: 'Assigned',
    assignmentDate: '2026-03-04',
    campaignStatus: 'active',
    jihRegistration: 'approved',
    visitStatus: 'completed',
    lastVisit: '2026-03-12',
    commitment: 'Volunteer for next outreach',
    currentCommitment: 'Volunteer for next outreach',
    jihAppRegistrationStatus: 'Registered',
    notes: 'Strong engagement history.',
    isArchived: false,
  },
  {
    id: 'kr-011',
    name: 'Khalid Mehmood',
    mobile: '+92 310 1234560',
    address: 'North Zone, Street 11',
    area: 'North Zone',
    assignedRukn: 'Ruqia Tahaniyat',
    assignedRuknId: 'R001',
    assignmentStatus: 'Assigned',
    assignmentDate: '2026-03-05',
    campaignStatus: 'active',
    jihRegistration: 'not_started',
    visitStatus: 'scheduled',
    lastVisit: '2026-03-08',
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: '',
    isArchived: false,
  },
  {
    id: 'kr-012',
    name: 'Rashid Ali',
    mobile: '+92 311 2345670',
    address: 'East Zone, Block 7',
    area: 'East Zone',
    assignedRukn: '',
    assignedRuknId: '',
    assignmentStatus: 'Available',
    campaignStatus: 'not_assigned',
    jihRegistration: 'not_started',
    visitStatus: 'none',
    lastVisit: null,
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Not Discussed',
    notes: 'Recently added to registry.',
    isArchived: false,
  },
]

export const MOCK_KARKUN_REGISTRY: KarkunRegistryRecord[] = KARKUN_SEED_DATA.map(seedKarkun)

export function getKarkunById(id: string): KarkunRegistryRecord | undefined {
  return MOCK_KARKUN_REGISTRY.find((karkun) => karkun.id === id)
}

export function updateKarkunMeetingOutcomes(
  karkunId: string,
  outcomes: {
    currentCommitment?: string
    jihAppRegistrationStatus: JihAppRegistrationStatus
    syncJihPortal?: boolean
  },
): void {
  const karkun = getKarkunById(karkunId)
  if (!karkun) {
    return
  }

  if (outcomes.currentCommitment !== undefined) {
    karkun.currentCommitment = outcomes.currentCommitment
    karkun.commitment = outcomes.currentCommitment || null
  }

  karkun.jihAppRegistrationStatus = outcomes.jihAppRegistrationStatus

  if (outcomes.syncJihPortal && outcomes.jihAppRegistrationStatus === 'Recommended') {
    karkun.jihRegistration = 'pending'
  }

  if (outcomes.syncJihPortal && outcomes.jihAppRegistrationStatus === 'Registered') {
    karkun.jihRegistration = 'approved'
  }

  karkun.updatedAt = new Date().toISOString()
  karkun.updatedBy = 'Rukn'
}

export function updateKarkunVisitExecution(
  karkunId: string,
  execution: { visitDate: string; visitConducted: boolean },
): void {
  const karkun = getKarkunById(karkunId)
  if (!karkun) {
    return
  }

  karkun.lastVisit = execution.visitDate
  karkun.visitStatus = execution.visitConducted ? 'completed' : 'pending'
  karkun.updatedAt = new Date().toISOString()
  karkun.updatedBy = 'Rukn'
}

export function getRegistryFilterOptions() {
  const areas = [...new Set(MOCK_KARKUN_REGISTRY.map((k) => k.area))].sort()
  const rukns = getActiveRuknNames()

  return { areas, rukns }
}

export function resolveAssignedRuknName(ruknId: string): string {
  return getRuknById(ruknId)?.name ?? 'Unassigned'
}

export { adminKarkunProfilePath } from '@/constants/routes'
