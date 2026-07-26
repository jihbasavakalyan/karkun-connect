/**
 * KC-0121 — Mark Reviewed presentation state only.
 * Does not modify campaign / Firestore data.
 */

const STORAGE_KEY = 'kc.missionWorkspace.reviewed.v1'

type Listener = () => void

let reviewedIds = new Set<string>(load())
const listeners = new Set<Listener>()

function load(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...reviewedIds]))
  } catch {
    // ignore quota / private mode
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribeToMissionWorkspaceReviews(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isWorkItemReviewed(id: string): boolean {
  return reviewedIds.has(id)
}

export function getReviewedWorkItemIds(): string[] {
  return [...reviewedIds]
}

export function markWorkItemReviewed(id: string): void {
  if (reviewedIds.has(id)) return
  reviewedIds = new Set(reviewedIds)
  reviewedIds.add(id)
  persist()
  notify()
}

export function clearWorkItemReviewed(id: string): void {
  if (!reviewedIds.has(id)) return
  reviewedIds = new Set(reviewedIds)
  reviewedIds.delete(id)
  persist()
  notify()
}
