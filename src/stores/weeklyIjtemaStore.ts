/**
 * KC-0107 — in-memory Weekly Ijtema event + submission store (presentation/domain).
 * Does not store attendance on Person/Karkun documents.
 */

import type { WeeklyIjtemaEvent, WeeklyIjtemaSubmission } from '@/types/weeklyIjtema'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

const events = new Map<string, WeeklyIjtemaEvent>()
const submissions = new Map<string, WeeklyIjtemaSubmission>()

type Listener = () => void
const listeners = new Set<Listener>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

function hydrateFromPersistence(): void {
  events.clear()
  submissions.clear()
  const repo = getRepositories().compliance
  for (const event of unwrapRepository(repo.loadWeeklyIjtemaEvents(), [])) {
    events.set(event.id, event)
  }
  for (const submission of unwrapRepository(repo.loadWeeklyIjtemaSubmissions(), [])) {
    submissions.set(submission.id, submission)
  }
}

hydrateFromPersistence()

export function subscribeToWeeklyIjtemaStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getWeeklyIjtemaEvent(eventId: string): WeeklyIjtemaEvent | undefined {
  return events.get(eventId)
}

export function getAllWeeklyIjtemaEvents(): WeeklyIjtemaEvent[] {
  return [...events.values()].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
}

export function upsertWeeklyIjtemaEvent(event: WeeklyIjtemaEvent): WeeklyIjtemaEvent {
  events.set(event.id, event)
  getRepositories().compliance.saveWeeklyIjtemaEvents([event])
  notify()
  return event
}

export function getWeeklyIjtemaSubmission(
  eventId: string,
  ruknId: string,
): WeeklyIjtemaSubmission | undefined {
  return submissions.get(`${eventId}:${ruknId}`)
}

export function getWeeklyIjtemaSubmissionsForEvent(eventId: string): WeeklyIjtemaSubmission[] {
  return [...submissions.values()].filter((item) => item.eventId === eventId)
}

export function getAllWeeklyIjtemaSubmissions(): WeeklyIjtemaSubmission[] {
  return [...submissions.values()]
}

export function upsertWeeklyIjtemaSubmission(
  submission: WeeklyIjtemaSubmission,
): WeeklyIjtemaSubmission {
  submissions.set(submission.id, submission)
  getRepositories().compliance.saveWeeklyIjtemaSubmissions([submission])
  notify()
  return submission
}

export function reloadWeeklyIjtemaStoreFromPersistence(): void {
  hydrateFromPersistence()
  notify()
}

export function clearWeeklyIjtemaStore(): void {
  events.clear()
  submissions.clear()
  getRepositories().compliance.clearWeeklyIjtemaEvents()
  getRepositories().compliance.clearWeeklyIjtemaSubmissions()
  notify()
}
