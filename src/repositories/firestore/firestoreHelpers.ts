import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  type DocumentData,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore'
import {
  FRIENDLY_DATA_ACCESS_ERROR,
  repositoryErr,
  repositoryOk,
  type RepositoryErrorCode,
  type RepositoryResult,
} from '@/repositories/errors'
import type { FirestoreDocumentMeta } from '@/repositories/firestore/collections'

export function nowIso(): string {
  return new Date().toISOString()
}

export function withMeta<T extends object>(
  payload: T,
  revision = 1,
): T & FirestoreDocumentMeta {
  return {
    ...payload,
    _updatedAt: nowIso(),
    _revision: revision,
  }
}

export function stripMeta<T>(value: DocumentData): T {
  const copy = { ...value } as Record<string, unknown>
  delete copy._updatedAt
  delete copy._revision
  return copy as T
}

export function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.reduce<unknown[]>((acc, item) => {
      if (item === undefined) {
        return acc
      }
      acc.push(sanitizeForFirestore(item))
      return acc
    }, []) as T
  }

  if (value === null || value === undefined) {
    return value as T
  }

  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value as T
    }

    const sanitized: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child === undefined) {
        continue
      }
      sanitized[key] = sanitizeForFirestore(child)
    }
    return sanitized as T
  }

  return value
}

export function mapFirestoreError(error: unknown): RepositoryResult<never> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return repositoryErr('StorageFailure', 'You appear to be offline. Changes will sync when reconnected.', error)
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: string }).code)
    if (code === 'permission-denied') {
      // KC-0058.2 — log raw denial; never surface backend permission text to operators.
      console.error('[firestore:permission-denied]', error)
      return repositoryErr('Permission', FRIENDLY_DATA_ACCESS_ERROR, error)
    }
    if (code === 'resource-exhausted') {
      return repositoryErr('StorageFailure', 'Service quota exceeded. Please try again later.', error)
    }
    if (code === 'unavailable' || code === 'deadline-exceeded') {
      return repositoryErr('StorageFailure', 'Network failure. Changes are queued for retry.', error)
    }
    if (code === 'failed-precondition') {
      return repositoryErr('Duplicate', 'A conflicting update was detected. Please refresh and try again.', error)
    }
  }

  return repositoryErr('Unexpected', 'A storage error occurred.', error)
}

export async function readDoc<T>(db: Firestore, path: string, id: string): Promise<T | null> {
  const snapshot = await getDoc(doc(db, path, id))
  if (!snapshot.exists()) {
    return null
  }
  return stripMeta<T>(snapshot.data())
}

export async function readCollection<T>(db: Firestore, path: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db, path))
  return snapshot.docs.map((item) => stripMeta<T>(item.data()))
}

export async function writeDoc<T extends object>(
  db: Firestore,
  path: string,
  id: string,
  payload: T,
  revision?: number,
): Promise<RepositoryResult<void>> {
  try {
    const sanitizedPayload = sanitizeForFirestore(payload)
    await setDoc(doc(db, path, id), {
      ...withMeta(sanitizedPayload, revision),
      _serverTime: serverTimestamp(),
    })
    return { ok: true, data: undefined }
  } catch (error) {
    return mapFirestoreError(error)
  }
}

export async function removeDoc(
  db: Firestore,
  path: string,
  id: string,
): Promise<RepositoryResult<void>> {
  try {
    await deleteDoc(doc(db, path, id))
    return { ok: true, data: undefined }
  } catch (error) {
    return mapFirestoreError(error)
  }
}

export function createBatch(db: Firestore): WriteBatch {
  return writeBatch(db)
}

/** KC-0064 — stay under Firestore's 500-op batch limit (bulk import/migration). */
export const FIRESTORE_BATCH_CHUNK_SIZE = 450

export async function commitBatchSetDocuments(
  db: Firestore,
  writes: ReadonlyArray<{ path: string; id: string; data: object }>,
): Promise<RepositoryResult<void>> {
  for (let index = 0; index < writes.length; index += FIRESTORE_BATCH_CHUNK_SIZE) {
    const chunk = writes.slice(index, index + FIRESTORE_BATCH_CHUNK_SIZE)
    const batch = createBatch(db)
    for (const write of chunk) {
      batch.set(doc(db, write.path, write.id), sanitizeForFirestore(write.data))
    }
    try {
      await batch.commit()
    } catch (error) {
      return mapFirestoreError(error)
    }
  }
  return repositoryOk(undefined)
}

export function reportConflict(
  entity: string,
  entityId: string,
  localVersion: unknown,
  remoteVersion: unknown,
): RepositoryResult<never> {
  return repositoryErr(
    'Duplicate' as RepositoryErrorCode,
    `Conflict detected for ${entity} ${entityId}. Remote data was preserved.`,
    { localVersion, remoteVersion },
  )
}
