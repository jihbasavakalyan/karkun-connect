import {
  appendTimelineEvent,
  getCommitmentById,
  getCommitmentsForKarkun,
  getPendingCommitmentsForRukn,
  upsertCommitment,
} from '@/stores/guidanceStore'
import type { Commitment, JourneyTimelineEvent } from '@/types/guidance'

function nowIso(): string {
  return new Date().toISOString()
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function getPendingCommitmentsForKarkun(karkunId: string): Commitment[] {
  return getCommitmentsForKarkun(karkunId).filter((record) => record.status === 'pending')
}

export function getUpcomingCommitmentsForRukn(ruknId: string, limit = 5): Commitment[] {
  return getPendingCommitmentsForRukn(ruknId)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
    .slice(0, limit)
}

export type CreateCommitmentInput = {
  karkunId: string
  ruknId: string
  assignmentId?: string
  text: string
  targetDate: string
  reminderEnabled?: boolean
  createdBy?: string
  source?: Commitment['source']
}

export function createCommitment(input: CreateCommitmentInput): Commitment {
  const record: Commitment = {
    id: createId('cmt'),
    karkunId: input.karkunId,
    ruknId: input.ruknId,
    assignmentId: input.assignmentId,
    text: input.text.trim(),
    targetDate: input.targetDate,
    reminderEnabled: input.reminderEnabled ?? true,
    status: 'pending',
    createdAt: nowIso(),
    createdBy: input.createdBy ?? 'Rukn',
    source: input.source ?? 'manual',
  }
  upsertCommitment(record)
  appendTimelineEvent({
    id: createId('tl'),
    karkunId: input.karkunId,
    title: 'Commitment agreed',
    description: input.text,
    occurredAt: nowIso(),
    source: 'commitment',
  })
  return record
}

export function completeCommitment(commitmentId: string): Commitment | undefined {
  const record = getCommitmentById(commitmentId)
  if (!record || record.status !== 'pending') {
    return undefined
  }
  const updated: Commitment = {
    ...record,
    status: 'completed',
    completedAt: nowIso(),
  }
  upsertCommitment(updated)
  appendTimelineEvent({
    id: createId('tl'),
    karkunId: record.karkunId,
    title: 'Commitment completed',
    description: record.text,
    occurredAt: nowIso(),
    source: 'commitment',
  })
  return updated
}

export function cancelCommitment(commitmentId: string): Commitment | undefined {
  const record = getCommitmentById(commitmentId)
  if (!record || record.status !== 'pending') {
    return undefined
  }
  const updated: Commitment = { ...record, status: 'cancelled' }
  upsertCommitment(updated)
  return updated
}

export function recordTimelineEvent(
  event: Omit<JourneyTimelineEvent, 'id'> & { id?: string },
): JourneyTimelineEvent {
  return appendTimelineEvent({
    id: event.id ?? createId('tl'),
    ...event,
  })
}
