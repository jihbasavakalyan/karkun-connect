/**
 * TD-04 — Firestore assignment review repository (one document per review).
 * Create uses a pending-lock transaction; resolve uses Pending → Resolved CAS.
 * No shared-blob last-write-wins.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { getFirestoreDb } from '@/lib/firebase/firestore'
import { getFirebaseAuth } from '@/lib/firebase/firebase'
import {
  repositoryErr,
  repositoryOk,
  type RepositoryResult,
} from '@/repositories/errors'
import type { AssignmentReviewRepository } from '@/repositories/interfaces/AssignmentReviewRepository'
import type { AssignmentReviewRequest } from '@/types/assignmentReview.types'
import {
  FIRESTORE_COLLECTIONS,
  assignmentReviewPendingLockDocId,
} from '@/repositories/firestore/collections'
import {
  mapFirestoreError,
  sanitizeForFirestore,
  stripMeta,
  withMeta,
} from '@/repositories/firestore/firestoreHelpers'
import { SyncCache } from '@/repositories/firestore/cache'

const WRITE_LABEL = 'assignmentReviews'

type ClientAuthScope = {
  role: string | null
  ruknId: string | null
}

type PendingLockDoc = {
  _docType: 'pendingLock'
  karkunId: string
  ruknId: string
  reviewId: string
}

const assignmentReviewCache = new SyncCache<AssignmentReviewRequest[]>([])

export function getAssignmentReviewWriteLabel(): string {
  return WRITE_LABEL
}

export function peekAssignmentReviewCache(): AssignmentReviewRequest[] {
  return [...assignmentReviewCache.get()]
}

export function applyAssignmentReviewHydrate(reviews: AssignmentReviewRequest[]): void {
  assignmentReviewCache.set([...reviews])
}

export function resetAssignmentReviewCacheForTests(): void {
  assignmentReviewCache.reset([])
}

export function subscribeAssignmentReviewCache(listener: () => void): () => void {
  return assignmentReviewCache.subscribe(listener)
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code) : ''
  return code === 'permission-denied' || code.includes('permission-denied')
}

async function resolveClientAuthScope(): Promise<ClientAuthScope> {
  try {
    const user = getFirebaseAuth().currentUser
    if (!user) return { role: null, ruknId: null }
    const token = await user.getIdTokenResult()
    const role = typeof token.claims.role === 'string' ? token.claims.role : null
    const ruknId = typeof token.claims.ruknId === 'string' ? token.claims.ruknId : null
    return { role, ruknId }
  } catch {
    return { role: null, ruknId: null }
  }
}

function parseAssignmentReviewDoc(
  data: DocumentData,
): AssignmentReviewRequest | null {
  if (data._docType === 'pendingLock') {
    return null
  }
  const stripped = stripMeta<Record<string, unknown>>(data)
  delete stripped._docType
  return stripped as AssignmentReviewRequest
}

function upsertCache(review: AssignmentReviewRequest): void {
  const current = assignmentReviewCache.get()
  const without = current.filter((row) => row.id !== review.id)
  assignmentReviewCache.set([review, ...without])
}

/**
 * Soft-read assignment reviews for hydrate (Admin: all; Rukn: own ruknId).
 * Filters out pending-lock sentinel docs.
 */
export async function readAssignmentReviewsForClient(): Promise<AssignmentReviewRequest[]> {
  const db = getFirestoreDb()
  const scope = await resolveClientAuthScope()

  if (scope.role === 'rukn' && !scope.ruknId) {
    return []
  }

  try {
    if (scope.role === 'rukn' && scope.ruknId) {
      const snap = await getDocs(
        query(
          collection(db, FIRESTORE_COLLECTIONS.assignmentReviews),
          where('ruknId', '==', scope.ruknId),
        ),
      )
      return snap.docs
        .map((item) => parseAssignmentReviewDoc(item.data()))
        .filter((row): row is AssignmentReviewRequest => row != null)
    }

    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.assignmentReviews))
    return snap.docs
      .map((item) => parseAssignmentReviewDoc(item.data()))
      .filter((row): row is AssignmentReviewRequest => row != null)
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn('[firestore:hydrate] soft-skip assignmentReviews (permission-denied)')
      return []
    }
    throw error
  }
}

/** Pull server docs into SyncCache (Pass A refresh primitive). */
export async function refreshAssignmentReviewCacheFromServer(): Promise<void> {
  const reviews = await readAssignmentReviewsForClient()
  applyAssignmentReviewHydrate(reviews)
}

function transactionErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code
  }
  if (error instanceof Error) {
    if (error.message.includes('PENDING_EXISTS')) return 'PENDING_EXISTS'
    if (error.message.includes('ALREADY_RESOLVED')) return 'ALREADY_RESOLVED'
    if (error.message.includes('NOT_FOUND')) return 'NOT_FOUND'
  }
  return null
}

export class AssignmentReviewFirestoreRepository implements AssignmentReviewRepository {
  loadAll(): RepositoryResult<AssignmentReviewRequest[]> {
    return repositoryOk([...assignmentReviewCache.get()])
  }

  saveAll(requests: AssignmentReviewRequest[]): RepositoryResult<void> {
    // Cache-only — never LWW rewrite the whole collection from a client blob.
    assignmentReviewCache.set([...requests])
    return repositoryOk(undefined)
  }

  async createDurable(
    request: AssignmentReviewRequest,
  ): Promise<RepositoryResult<AssignmentReviewRequest>> {
    const db = getFirestoreDb()
    const reviewRef = doc(db, FIRESTORE_COLLECTIONS.assignmentReviews, request.id)
    const lockRef = doc(
      db,
      FIRESTORE_COLLECTIONS.assignmentReviews,
      assignmentReviewPendingLockDocId(request.karkunId),
    )

    try {
      await runTransaction(db, async (transaction) => {
        const lockSnap = await transaction.get(lockRef)
        if (lockSnap.exists()) {
          throw new Error('PENDING_EXISTS')
        }
        const existingSnap = await transaction.get(reviewRef)
        if (existingSnap.exists()) {
          throw new Error('PENDING_EXISTS')
        }
        transaction.set(reviewRef, {
          ...withMeta(sanitizeForFirestore(request)),
          _serverTime: serverTimestamp(),
        })
        const lock: PendingLockDoc = {
          _docType: 'pendingLock',
          karkunId: request.karkunId,
          ruknId: request.ruknId,
          reviewId: request.id,
        }
        transaction.set(lockRef, sanitizeForFirestore(lock))
      })

      upsertCache(request)
      console.info('[TD-04] assignmentReviews createDurable success', {
        module: 'assignmentReviews',
        operation: 'createDurable',
        result: 'ok',
        reviewId: request.id,
        karkunId: request.karkunId,
        ruknId: request.ruknId,
      })
      return repositoryOk(request)
    } catch (error) {
      const code = transactionErrorCode(error)
      console.error('[TD-04] assignmentReviews createDurable failed', {
        module: 'assignmentReviews',
        operation: 'createDurable',
        result: 'error',
        reviewId: request.id,
        errorCode: code,
        error,
      })
      if (code === 'PENDING_EXISTS') {
        return repositoryErr(
          'Duplicate',
          'A review request is already pending for this Karkun.',
          error,
        )
      }
      return mapFirestoreError(error)
    }
  }

  async resolveDurable(
    id: string,
    patch: Pick<AssignmentReviewRequest, 'decision' | 'decidedBy' | 'updatedAt'> & {
      decisionNotes?: string
    },
  ): Promise<RepositoryResult<AssignmentReviewRequest>> {
    const db = getFirestoreDb()
    const reviewRef = doc(db, FIRESTORE_COLLECTIONS.assignmentReviews, id)

    try {
      const resolved = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(reviewRef)
        if (!snap.exists()) {
          throw new Error('NOT_FOUND')
        }
        const current = parseAssignmentReviewDoc(snap.data() as DocumentData)
        if (!current) {
          throw new Error('NOT_FOUND')
        }
        if (current.status !== 'Pending') {
          throw new Error('ALREADY_RESOLVED')
        }

        const lockRef = doc(
          db,
          FIRESTORE_COLLECTIONS.assignmentReviews,
          assignmentReviewPendingLockDocId(current.karkunId),
        )
        const lockSnap = await transaction.get(lockRef)

        const next: AssignmentReviewRequest = {
          ...current,
          status: 'Resolved',
          decision: patch.decision,
          decidedBy: patch.decidedBy,
          decisionNotes: patch.decisionNotes?.trim() || undefined,
          updatedAt: patch.updatedAt,
        }

        const priorRevision =
          typeof (snap.data() as { _revision?: unknown })._revision === 'number'
            ? ((snap.data() as { _revision: number })._revision)
            : 1

        transaction.set(reviewRef, {
          ...withMeta(sanitizeForFirestore(next), priorRevision + 1),
          _serverTime: serverTimestamp(),
        })
        if (lockSnap.exists()) {
          transaction.delete(lockRef)
        }

        return next
      })

      upsertCache(resolved)
      console.info('[TD-04] assignmentReviews resolveDurable success', {
        module: 'assignmentReviews',
        operation: 'resolveDurable',
        result: 'ok',
        reviewId: id,
        decision: patch.decision,
      })
      return repositoryOk(resolved)
    } catch (error) {
      const code = transactionErrorCode(error)
      console.error('[TD-04] assignmentReviews resolveDurable failed', {
        module: 'assignmentReviews',
        operation: 'resolveDurable',
        result: 'error',
        reviewId: id,
        errorCode: code,
        error,
      })
      if (code === 'NOT_FOUND') {
        return repositoryErr('NotFound', 'Pending review request not found.', error)
      }
      if (code === 'ALREADY_RESOLVED') {
        return repositoryErr(
          'Validation',
          'Another administrator already resolved this review. Refresh to see the latest status.',
          error,
        )
      }
      return mapFirestoreError(error)
    }
  }
}

/** Pass B helper — read current remote status for CAS diagnostics (not required for Pass A UX). */
export async function readAssignmentReviewRemoteStatus(
  reviewId: string,
): Promise<'Pending' | 'Resolved' | 'missing' | 'lock'> {
  const snap = await getDoc(doc(getFirestoreDb(), FIRESTORE_COLLECTIONS.assignmentReviews, reviewId))
  if (!snap.exists()) return 'missing'
  const data = snap.data() as DocumentData
  if (data._docType === 'pendingLock') return 'lock'
  const review = parseAssignmentReviewDoc(data)
  if (!review) return 'missing'
  return review.status
}

/** Test-only — does not delete production review history from UI clear paths. */
export async function deleteAssignmentReviewPendingLockForTests(
  karkunId: string,
): Promise<void> {
  await deleteDoc(
    doc(
      getFirestoreDb(),
      FIRESTORE_COLLECTIONS.assignmentReviews,
      assignmentReviewPendingLockDocId(karkunId),
    ),
  )
}
