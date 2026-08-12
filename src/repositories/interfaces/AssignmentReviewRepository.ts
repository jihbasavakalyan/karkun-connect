import type { AssignmentReviewRequest } from '@/types/assignmentReview.types'
import type { RepositoryResult } from '@/repositories/errors'

/**
 * TD-04 — durable assignment review persistence (one document per review).
 * Firestore implementations must await durable writes before reporting success.
 * Resolve uses compare-and-set (Pending → Resolved) — no shared-blob LWW.
 */
export interface AssignmentReviewRepository {
  loadAll(): RepositoryResult<AssignmentReviewRequest[]>
  /** Local provider full replace. Firestore: updates SyncCache only (no LWW blob write). */
  saveAll(requests: AssignmentReviewRequest[]): RepositoryResult<void>
  /**
   * Durable create. Must await Firestore transaction (review + pending lock).
   * Rejects when a Pending review already exists for the same karkunId.
   */
  createDurable(
    request: AssignmentReviewRequest,
  ): Promise<RepositoryResult<AssignmentReviewRequest>>
  /**
   * Durable resolve CAS: require status == Pending, then set Resolved + decision fields.
   * Clears pending lock for the karkun.
   */
  resolveDurable(
    id: string,
    patch: Pick<AssignmentReviewRequest, 'decision' | 'decidedBy' | 'updatedAt'> & {
      decisionNotes?: string
    },
  ): Promise<RepositoryResult<AssignmentReviewRequest>>
}
