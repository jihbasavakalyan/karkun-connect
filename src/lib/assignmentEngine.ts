import { getKarkunById, MOCK_KARKUN_REGISTRY } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import type {
  AssignKarkunResult,
  AssignedBy,
  Assignment,
  AssignmentMetrics,
  ReleaseReason,
} from '@/types/assignment.types'
import { ACTIVE_CAMPAIGN_ID } from '@/types/assignment.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

const assignmentHistory: Assignment[] = []
let initialized = false

type AssignmentListener = () => void
const listeners = new Set<AssignmentListener>()

export function subscribeToAssignments(listener: AssignmentListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyAssignmentChange(): void {
  listeners.forEach((listener) => listener())
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function ensureInitialized(): void {
  if (initialized) {
    return
  }

  for (const karkun of MOCK_KARKUN_REGISTRY) {
    if (karkun.isArchived) {
      continue
    }

    if (karkun.assignedRuknId && karkun.assignmentStatus === 'Assigned') {
      assignmentHistory.push({
        id: `asgn-seed-${karkun.id}`,
        campaignId: ACTIVE_CAMPAIGN_ID,
        ruknId: karkun.assignedRuknId,
        karkunId: karkun.id,
        assignedBy: 'Administrator',
        assignmentDate: karkun.assignmentDate ?? '2026-03-01',
        assignmentStatus: 'Assigned',
      })
    }
  }

  initialized = true
}

function getKarkunRecord(karkunId: string): KarkunRegistryRecord | undefined {
  return MOCK_KARKUN_REGISTRY.find((k) => k.id === karkunId && !k.isArchived)
}

function getActiveAssignment(karkunId: string): Assignment | undefined {
  ensureInitialized()
  return assignmentHistory.find(
    (record) => record.karkunId === karkunId && record.assignmentStatus === 'Assigned',
  )
}

export function getAvailableKarkunan(): KarkunRegistryRecord[] {
  ensureInitialized()
  return MOCK_KARKUN_REGISTRY.filter(
    (karkun) => !karkun.isArchived && karkun.assignmentStatus === 'Available',
  )
}

export function getAssignedKarkunanForRukn(ruknId: string): KarkunRegistryRecord[] {
  ensureInitialized()
  return MOCK_KARKUN_REGISTRY.filter(
    (karkun) =>
      !karkun.isArchived &&
      karkun.assignmentStatus === 'Assigned' &&
      karkun.assignedRuknId === ruknId,
  )
}

export function getAssignmentMetrics(): AssignmentMetrics {
  ensureInitialized()
  const availableKarkun = getAvailableKarkunan().length
  const assignedKarkun = MOCK_KARKUN_REGISTRY.filter(
    (k) => !k.isArchived && k.assignmentStatus === 'Assigned',
  ).length
  const completedAssignments = assignmentHistory.filter(
    (record) => record.assignmentStatus === 'Completed',
  ).length

  return { availableKarkun, assignedKarkun, completedAssignments }
}

export function getRuknAssignmentEngineStats(ruknId: string): {
  assignedCount: number
  completedCount: number
  availableCapacity: number
} {
  ensureInitialized()
  const assignedCount = getAssignedKarkunanForRukn(ruknId).length
  const completedCount = assignmentHistory.filter(
    (record) => record.ruknId === ruknId && record.assignmentStatus === 'Completed',
  ).length

  return {
    assignedCount,
    completedCount,
    availableCapacity: getAvailableKarkunan().length,
  }
}

export function getAllRuknAssignmentEngineStats(): Record<
  string,
  ReturnType<typeof getRuknAssignmentEngineStats>
> {
  ensureInitialized()
  const stats: Record<string, ReturnType<typeof getRuknAssignmentEngineStats>> = {}

  for (const karkun of MOCK_KARKUN_REGISTRY) {
    if (karkun.assignedRuknId && karkun.assignmentStatus === 'Assigned') {
      if (!stats[karkun.assignedRuknId]) {
        stats[karkun.assignedRuknId] = getRuknAssignmentEngineStats(karkun.assignedRuknId)
      }
    }
  }

  return stats
}

export function getAssignmentHistory(): Assignment[] {
  ensureInitialized()
  return [...assignmentHistory]
}

export function assignKarkun(
  karkunId: string,
  ruknId: string,
  assignedBy: AssignedBy,
): AssignKarkunResult {
  ensureInitialized()

  const karkun = getKarkunRecord(karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  if (karkun.assignmentStatus !== 'Available') {
    return { success: false, error: 'This Karkun is not available for assignment.' }
  }

  if (getActiveAssignment(karkunId)) {
    return { success: false, error: 'This Karkun already has an active assignment.' }
  }

  const rukn = getRuknById(ruknId)
  if (!rukn) {
    return { success: false, error: 'Rukn not found.' }
  }

  const assignment: Assignment = {
    id: `asgn-${Date.now()}`,
    campaignId: ACTIVE_CAMPAIGN_ID,
    ruknId,
    karkunId,
    assignedBy,
    assignmentDate: todayDate(),
    assignmentStatus: 'Assigned',
  }

  assignmentHistory.unshift(assignment)

  karkun.assignmentStatus = 'Assigned'
  karkun.assignedRuknId = ruknId
  karkun.assignedRukn = rukn.name
  karkun.assignmentDate = assignment.assignmentDate
  karkun.campaignStatus = 'active'

  notifyAssignmentChange()
  return { success: true, assignment }
}

export function releaseKarkun(
  karkunId: string,
  ruknId: string,
  releaseReason: ReleaseReason,
): AssignKarkunResult {
  ensureInitialized()

  const karkun = getKarkunRecord(karkunId)
  if (!karkun) {
    return { success: false, error: 'Karkun not found.' }
  }

  if (karkun.assignmentStatus !== 'Assigned' || karkun.assignedRuknId !== ruknId) {
    return { success: false, error: 'This Karkun is not assigned to you.' }
  }

  const active = getActiveAssignment(karkunId)
  if (active) {
    active.assignmentStatus = 'Completed'
    active.releaseReason = releaseReason
    active.releasedAt = new Date().toISOString()
  }

  karkun.assignmentStatus = 'Available'
  karkun.assignedRuknId = ''
  karkun.assignedRukn = ''
  karkun.assignmentDate = undefined

  notifyAssignmentChange()
  return { success: true, assignment: active! }
}

export function replaceKarkun(
  currentKarkunId: string,
  newKarkunId: string,
  ruknId: string,
  releaseReason: ReleaseReason,
  assignedBy: AssignedBy,
): AssignKarkunResult {
  const releaseResult = releaseKarkun(currentKarkunId, ruknId, releaseReason)
  if (!releaseResult.success) {
    return releaseResult
  }

  return assignKarkun(newKarkunId, ruknId, assignedBy)
}

export function canAssignKarkun(karkunId: string): boolean {
  const karkun = getKarkunById(karkunId)
  return Boolean(karkun && !karkun.isArchived && karkun.assignmentStatus === 'Available')
}
