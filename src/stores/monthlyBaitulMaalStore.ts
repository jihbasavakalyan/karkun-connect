/**
 * KC-0108 — Monthly Baitul Maal cycle + submission store.
 */

import type {
  MonthlyBaitulMaalCycle,
  MonthlyBaitulMaalSubmission,
} from '@/types/monthlyBaitulMaal'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

const cycles = new Map<string, MonthlyBaitulMaalCycle>()
const submissions = new Map<string, MonthlyBaitulMaalSubmission>()

type Listener = () => void
const listeners = new Set<Listener>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

function hydrateFromPersistence(): void {
  cycles.clear()
  submissions.clear()
  const repo = getRepositories().compliance
  for (const cycle of unwrapRepository(repo.loadMonthlyBaitulMaalCycles(), [])) {
    cycles.set(cycle.id, cycle)
  }
  for (const submission of unwrapRepository(repo.loadMonthlyBaitulMaalSubmissions(), [])) {
    submissions.set(submission.id, submission)
  }
}

hydrateFromPersistence()

export function subscribeToMonthlyBaitulMaalStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getMonthlyBaitulMaalCycle(cycleId: string): MonthlyBaitulMaalCycle | undefined {
  return cycles.get(cycleId)
}

export function getAllMonthlyBaitulMaalCycles(): MonthlyBaitulMaalCycle[] {
  return [...cycles.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

export function upsertMonthlyBaitulMaalCycle(
  cycle: MonthlyBaitulMaalCycle,
): MonthlyBaitulMaalCycle {
  cycles.set(cycle.id, cycle)
  getRepositories().compliance.saveMonthlyBaitulMaalCycles([cycle])
  notify()
  return cycle
}

export function getMonthlyBaitulMaalSubmission(
  cycleId: string,
  ruknId: string,
): MonthlyBaitulMaalSubmission | undefined {
  return submissions.get(`${cycleId}:${ruknId}`)
}

export function getMonthlyBaitulMaalSubmissionsForCycle(
  cycleId: string,
): MonthlyBaitulMaalSubmission[] {
  return [...submissions.values()].filter((item) => item.eventId === cycleId)
}

export function upsertMonthlyBaitulMaalSubmission(
  submission: MonthlyBaitulMaalSubmission,
): MonthlyBaitulMaalSubmission {
  submissions.set(submission.id, submission)
  getRepositories().compliance.saveMonthlyBaitulMaalSubmissions([submission])
  notify()
  return submission
}

export function reloadMonthlyBaitulMaalStoreFromPersistence(): void {
  hydrateFromPersistence()
  notify()
}

export function clearMonthlyBaitulMaalStore(): void {
  cycles.clear()
  submissions.clear()
  getRepositories().compliance.clearMonthlyBaitulMaalCycles()
  getRepositories().compliance.clearMonthlyBaitulMaalSubmissions()
  notify()
}
