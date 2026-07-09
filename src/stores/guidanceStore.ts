import type { Commitment, JourneyTimelineEvent } from '@/types/guidance'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

type GuidancePersistedState = {
  commitments: Commitment[]
  timelineEvents: JourneyTimelineEvent[]
}

const defaultState: GuidancePersistedState = {
  commitments: [],
  timelineEvents: [],
}

const persisted = unwrapRepository(getRepositories().execution.loadGuidanceState(), defaultState)

const commitments: Commitment[] = [...persisted.commitments]
const timelineEvents: JourneyTimelineEvent[] = [...persisted.timelineEvents]

type Listener = () => void
const listeners = new Set<Listener>()

function persist(): void {
  getRepositories().execution.saveGuidanceState({ commitments, timelineEvents })
}

function notify(): void {
  persist()
  listeners.forEach((listener) => listener())
}

export function subscribeToGuidanceStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAllCommitments(): Commitment[] {
  return [...commitments]
}

export function getCommitmentsForKarkun(karkunId: string): Commitment[] {
  return commitments.filter((record) => record.karkunId === karkunId)
}

export function getPendingCommitmentsForRukn(ruknId: string): Commitment[] {
  return commitments.filter(
    (record) => record.ruknId === ruknId && record.status === 'pending',
  )
}

export function getCommitmentById(id: string): Commitment | undefined {
  return commitments.find((record) => record.id === id)
}

export function upsertCommitment(record: Commitment): Commitment {
  const index = commitments.findIndex((item) => item.id === record.id)
  if (index >= 0) {
    commitments[index] = record
  } else {
    commitments.unshift(record)
  }
  notify()
  return record
}

export function getTimelineEventsForKarkun(karkunId: string): JourneyTimelineEvent[] {
  return timelineEvents
    .filter((event) => event.karkunId === karkunId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

export function appendTimelineEvent(event: JourneyTimelineEvent): JourneyTimelineEvent {
  const exists = timelineEvents.some((item) => item.id === event.id)
  if (!exists) {
    timelineEvents.unshift(event)
    notify()
  }
  return event
}

export function clearGuidanceStore(): void {
  commitments.length = 0
  timelineEvents.length = 0
  getRepositories().execution.clearGuidanceState()
  notify()
}
