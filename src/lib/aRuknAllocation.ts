/**
 * A Rukn (`AR##`) numbering — KC-0056-style floor against occupied ids.
 * Pure planner is side-effect free (safe on reads). Exclusive allocate is for writers.
 */

import {
  formatARuknId,
  parseARuknOfficerNum,
} from '@/lib/officerIdentity'

export type ARuknAllocationPlan = {
  id: string
  num: number
  nextARuknNum: number
}

export type ARuknAllocationResult = {
  aRuknId: string
  nextARuknNum: number
}

const MAX_AR_ID_ALLOCATION_ATTEMPTS = 10_000

let allocationChain: Promise<unknown> = Promise.resolve()

export function getMaxARuknNumFromIds(ids: Iterable<string>): number {
  let max = 0
  for (const id of ids) {
    const num = parseARuknOfficerNum(id)
    if (num != null && num > max) max = num
  }
  return max
}

/**
 * Next free AR id. Never returns an occupied id. Never decreases the counter.
 * Does not mutate storage — callers persist `nextARuknNum` only when allocating.
 */
export function planNextARuknAllocation(input: {
  occupiedIds: Iterable<string>
  nextARuknNum?: number
}): ARuknAllocationPlan | { ok: false; error: string } {
  const occupied = new Set<number>()
  for (const id of input.occupiedIds) {
    const num = parseARuknOfficerNum(id)
    if (num != null) occupied.add(num)
  }

  const hint = Number(input.nextARuknNum)
  const counterFloor = Number.isFinite(hint) && hint >= 1 ? Math.floor(hint) : 1
  const maxExisting = getMaxARuknNumFromIds(input.occupiedIds)
  let candidate = Math.max(1, counterFloor, maxExisting + 1)

  for (let attempt = 0; attempt < MAX_AR_ID_ALLOCATION_ATTEMPTS; attempt += 1) {
    if (!occupied.has(candidate)) {
      return {
        id: formatARuknId(candidate),
        num: candidate,
        nextARuknNum: candidate + 1,
      }
    }
    candidate += 1
  }

  return {
    ok: false,
    error: 'Could not allocate a free A Rukn ID. Contact an administrator.',
  }
}

function withAllocationLock<T>(work: () => T | Promise<T>): Promise<T> {
  const run = allocationChain.then(work, work)
  allocationChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/**
 * Serializes concurrent callers in-process (local repo / tests).
 * Occupied ids and counter MUST be read inside the lock.
 * Firestore uses `runTransaction` instead; both skip occupied AR docs and bump the counter.
 */
export function allocateNextARuknIdExclusive(input: {
  readOccupiedIds: () => Iterable<string>
  readNextARuknNum: () => number
  persistNextARuknNum: (nextARuknNum: number) => void | Promise<void>
}): Promise<ARuknAllocationPlan> {
  return withAllocationLock(async () => {
    const planned = planNextARuknAllocation({
      occupiedIds: input.readOccupiedIds(),
      nextARuknNum: input.readNextARuknNum(),
    })
    if ('ok' in planned && planned.ok === false) {
      throw new Error(planned.error)
    }
    const plan = planned as ARuknAllocationPlan
    await input.persistNextARuknNum(plan.nextARuknNum)
    return plan
  })
}

/** Test helper — does not reset Firestore. */
export function resetARuknAllocationLockForTests(): void {
  allocationChain = Promise.resolve()
}
