/**
 * Shared merge helpers for LWW blob documents (guidance, similar stores).
 * Prefer per-entity docs when designing new modules; use merge only for
 * legacy shared blobs that multiple clients must update.
 */

import type { Commitment, JourneyTimelineEvent } from '@/types/guidance'
import type { GuidanceState } from '@/repositories/interfaces/ExecutionRepository'

function timestampOf(iso: string | undefined): number {
  return Date.parse(iso || '') || 0
}

function mergeById<T extends { id: string }>(
  remote: readonly T[],
  local: readonly T[],
  rank: (item: T) => number,
): T[] {
  const byId = new Map<string, T>()
  for (const item of remote) {
    if (item?.id) byId.set(item.id, item)
  }
  for (const item of local) {
    if (!item?.id) continue
    const existing = byId.get(item.id)
    if (!existing || rank(item) >= rank(existing)) {
      byId.set(item.id, item)
    }
  }
  return [...byId.values()]
}

function commitmentRank(item: Commitment): number {
  return Math.max(timestampOf(item.completedAt), timestampOf(item.createdAt))
}

function timelineRank(item: JourneyTimelineEvent): number {
  return timestampOf(item.occurredAt)
}

/** Union remote + local guidance rows by id (newer timestamp wins). */
export function mergeGuidanceState(
  remote: GuidanceState,
  local: GuidanceState,
): GuidanceState {
  return {
    commitments: mergeById(remote.commitments ?? [], local.commitments ?? [], commitmentRank).sort(
      (a, b) => commitmentRank(b) - commitmentRank(a),
    ),
    timelineEvents: mergeById(
      remote.timelineEvents ?? [],
      local.timelineEvents ?? [],
      timelineRank,
    ).sort((a, b) => timelineRank(b) - timelineRank(a)),
  }
}
