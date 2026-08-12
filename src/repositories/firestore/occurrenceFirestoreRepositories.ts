/**
 * Phase 3 — Firestore persistence for Occurrence.
 * Per-document upsert via existing writeDoc helpers. Admin-owned collection.
 * Soft-read on hydrate (Rukn permission-denied → empty). No LWW blob.
 * Local Programme parent validated before durable write.
 */

import { collection, getDocs, type DocumentData } from 'firebase/firestore'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import {
  repositoryErr,
  repositoryOk,
  type RepositoryResult,
} from '@/repositories/errors'
import type { LocalProgrammeRepository } from '@/repositories/interfaces/LocalProgrammeRepository'
import type { OccurrenceRepository } from '@/repositories/interfaces/OccurrenceRepository'
import type { Occurrence, OccurrenceStatus } from '@/types/occurrence.types'
import { FIRESTORE_COLLECTIONS } from '@/repositories/firestore/collections'
import {
  sanitizeForFirestore,
  stripMeta,
  writeDoc,
} from '@/repositories/firestore/firestoreHelpers'
import { SyncCache } from '@/repositories/firestore/cache'

const occurrenceCache = new SyncCache<Occurrence[]>([])

const OCCURRENCE_STATUSES: ReadonlySet<OccurrenceStatus> = new Set([
  'scheduled',
  'open',
  'closed',
  'archived',
])

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code) : ''
  return code === 'permission-denied' || code.includes('permission-denied')
}

async function softReadCollection<T>(
  collectionName: string,
  label: string,
): Promise<T[]> {
  try {
    const snap = await getDocs(collection(getFirestoreDb(), collectionName))
    return snap.docs.map((item) => stripMeta<T>(item.data() as DocumentData))
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn(`[firestore:hydrate] soft-skip ${label} (permission-denied)`)
      return []
    }
    throw error
  }
}

function upsertById<T extends { id: string }>(rows: T[], next: T): T[] {
  return [next, ...rows.filter((row) => row.id !== next.id)]
}

function validateOccurrence(
  occurrence: Occurrence,
  programmes: LocalProgrammeRepository,
): RepositoryResult<Occurrence> | null {
  if (!occurrence.id?.trim()) {
    return repositoryErr('Validation', 'Occurrence requires id.')
  }
  if (!occurrence.programmeId?.trim()) {
    return repositoryErr(
      'Validation',
      'Occurrence requires programmeId (belongs to one Local Programme).',
    )
  }
  if (!DATE_KEY.test(occurrence.occurrenceDate?.trim() ?? '')) {
    return repositoryErr(
      'Validation',
      'Occurrence requires occurrenceDate (YYYY-MM-DD).',
    )
  }
  if (!occurrence.generationKey?.trim()) {
    return repositoryErr('Validation', 'Occurrence requires generationKey.')
  }
  if (!OCCURRENCE_STATUSES.has(occurrence.status)) {
    return repositoryErr('Validation', 'Occurrence requires a valid status.')
  }
  const parent = programmes.getById(occurrence.programmeId)
  if (!parent.ok || !parent.data) {
    return repositoryErr(
      'Validation',
      'Occurrence requires an existing Local Programme (programmeId).',
    )
  }
  return null
}

export function applyOccurrenceHydrate(rows: Occurrence[]): void {
  occurrenceCache.set([...rows])
}

/** Soft-read Occurrence collection for background hydrate (Admin-only rules). */
export async function readOccurrenceCollectionsForClient(): Promise<Occurrence[]> {
  return softReadCollection<Occurrence>(
    FIRESTORE_COLLECTIONS.occurrences,
    'occurrences',
  )
}

export function resetOccurrenceCachesForTests(): void {
  occurrenceCache.reset([])
}

export class OccurrenceFirestoreRepository implements OccurrenceRepository {
  private readonly programmes: LocalProgrammeRepository

  constructor(programmes: LocalProgrammeRepository) {
    this.programmes = programmes
  }

  loadAll(): RepositoryResult<readonly Occurrence[]> {
    return repositoryOk([...occurrenceCache.get()])
  }

  getById(id: string): RepositoryResult<Occurrence | undefined> {
    return repositoryOk(occurrenceCache.get().find((row) => row.id === id))
  }

  listByProgrammeId(
    programmeId: string,
  ): RepositoryResult<readonly Occurrence[]> {
    return repositoryOk(
      occurrenceCache.get().filter((row) => row.programmeId === programmeId),
    )
  }

  getByGenerationKey(
    generationKey: string,
  ): RepositoryResult<Occurrence | undefined> {
    return repositoryOk(
      occurrenceCache.get().find((row) => row.generationKey === generationKey),
    )
  }

  async saveDurable(
    occurrence: Occurrence,
  ): Promise<RepositoryResult<Occurrence>> {
    const invalid = validateOccurrence(occurrence, this.programmes)
    if (invalid) return invalid

    const write = await writeDoc(
      getFirestoreDb(),
      FIRESTORE_COLLECTIONS.occurrences,
      occurrence.id,
      sanitizeForFirestore(occurrence),
    )
    if (!write.ok) {
      console.error('[phase3] occurrences saveDurable failed', {
        module: 'occurrences',
        operation: 'saveDurable',
        result: 'error',
        id: occurrence.id,
        programmeId: occurrence.programmeId,
        error: write.error,
      })
      return write
    }
    occurrenceCache.set(upsertById(occurrenceCache.get(), occurrence))
    console.info('[phase3] occurrences saveDurable success', {
      module: 'occurrences',
      operation: 'saveDurable',
      result: 'ok',
      id: occurrence.id,
      programmeId: occurrence.programmeId,
      generationKey: occurrence.generationKey,
    })
    return repositoryOk(occurrence)
  }
}
