import type { AssignmentReviewRequest } from '@/types/assignmentReview.types'
import type { AssignmentReviewRepository } from '@/repositories/interfaces/AssignmentReviewRepository'
import { repositoryErr, repositoryOk, tryRepository, type RepositoryResult } from '@/repositories/errors'
import { STORAGE_KEYS } from '@/repositories/storageKeys'
import { loadJsonFromStorage, saveJsonToStorage } from '@/lib/browserStorage'

function loadReviews(): AssignmentReviewRequest[] {
  return loadJsonFromStorage<AssignmentReviewRequest[]>(STORAGE_KEYS.assignmentReviews, [])
}

function saveReviews(requests: AssignmentReviewRequest[]): void {
  saveJsonToStorage(STORAGE_KEYS.assignmentReviews, requests)
}

/**
 * Local/mock provider parity for TD-04 assignment reviews.
 * Duplicate Pending prevention uses durable storage, not client memory alone.
 */
export class AssignmentReviewLocalRepository implements AssignmentReviewRepository {
  loadAll(): RepositoryResult<AssignmentReviewRequest[]> {
    return tryRepository(() => [...loadReviews()])
  }

  saveAll(requests: AssignmentReviewRequest[]): RepositoryResult<void> {
    return tryRepository(() => {
      saveReviews([...requests])
      return undefined
    })
  }

  async createDurable(
    request: AssignmentReviewRequest,
  ): Promise<RepositoryResult<AssignmentReviewRequest>> {
    try {
      const existing = loadReviews()
      if (
        existing.some(
          (row) => row.karkunId === request.karkunId && row.status === 'Pending',
        )
      ) {
        return repositoryErr(
          'Duplicate',
          'A review request is already pending for this Karkun.',
        )
      }
      if (existing.some((row) => row.id === request.id)) {
        return repositoryErr('Duplicate', `Duplicate review id ${request.id}`)
      }
      saveReviews([request, ...existing])
      return repositoryOk(request)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local assignment review create failed.', cause)
    }
  }

  async resolveDurable(
    id: string,
    patch: Pick<AssignmentReviewRequest, 'decision' | 'decidedBy' | 'updatedAt'> & {
      decisionNotes?: string
    },
  ): Promise<RepositoryResult<AssignmentReviewRequest>> {
    try {
      const existing = loadReviews()
      const index = existing.findIndex((row) => row.id === id)
      if (index < 0) {
        return repositoryErr('NotFound', 'Pending review request not found.')
      }
      const current = existing[index]!
      if (current.status !== 'Pending') {
        return repositoryErr(
          'Validation',
          'Another administrator already resolved this review. Refresh to see the latest status.',
        )
      }
      const resolved: AssignmentReviewRequest = {
        ...current,
        status: 'Resolved',
        decision: patch.decision,
        decidedBy: patch.decidedBy,
        decisionNotes: patch.decisionNotes?.trim() || undefined,
        updatedAt: patch.updatedAt,
      }
      const next = [...existing]
      next[index] = resolved
      saveReviews(next)
      return repositoryOk(resolved)
    } catch (cause) {
      return repositoryErr('StorageFailure', 'Local assignment review resolve failed.', cause)
    }
  }
}

/** Test helper — clears local assignment review storage. */
export function clearLocalAssignmentReviewsForTests(): RepositoryResult<void> {
  return tryRepository(() => {
    saveReviews([])
    return undefined
  })
}
