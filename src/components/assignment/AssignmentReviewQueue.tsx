/**
 * Admin queue for Rukn-submitted assignment review requests (KC-008).
 * Ownership changes remain Admin-controlled; Continue/Reject only close the request.
 * TD-04 Pass B — durable resolve after connection mutations; retry resolve-only on persist fail.
 */

import { useEffect, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { getRuknById } from '@/data/ruknMaster'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { changeKarkunRuknAssignment } from '@/lib/assignmentEngine'
import {
  ASSIGNMENT_REVIEW_RESOLVE_AFTER_CONNECTION_ERROR,
  decideAssignmentReviewRequest,
  getPendingAssignmentReviewRequests,
  subscribeToAssignmentReviewStore,
} from '@/services/assignmentReviewService'
import { TransferConnectionModal } from '@/components/forms/assignment/TransferConnectionModal'
import { ReplaceKarkunModal } from '@/components/forms/assignment/ReplaceKarkunModal'
import type { AssignmentReviewDecision, AssignmentReviewRequest } from '@/types/assignmentReview.types'

type FollowUpAction = 'transfer' | 'replace' | null

/** Connection/assignment already applied; only durable review resolve remains. */
type ResolveAfterConnectionRetry = {
  request: AssignmentReviewRequest
  decision: Extract<AssignmentReviewDecision, 'Transfer' | 'Replace' | 'Release'>
}

export function AssignmentReviewQueue() {
  const { user } = useAuth()
  const { removeAssignment, assignmentVersion } = useAssignmentEngine()
  const [tick, setTick] = useState(0)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeRequest, setActiveRequest] = useState<AssignmentReviewRequest | null>(null)
  const [followUp, setFollowUp] = useState<FollowUpAction>(null)
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null)
  const [resolveRetry, setResolveRetry] = useState<ResolveAfterConnectionRetry | null>(null)

  useEffect(() => {
    return subscribeToAssignmentReviewStore(() => setTick((value) => value + 1))
  }, [])

  void tick
  void assignmentVersion
  const pending = getPendingAssignmentReviewRequests()
  const decidedBy: 'Administrator' = 'Administrator'
  const decidedByLabel = user?.displayName ?? user?.uid ?? 'Administrator'

  const recordDecision = async (
    request: AssignmentReviewRequest,
    decision: AssignmentReviewDecision,
  ): Promise<boolean> => {
    const result = await decideAssignmentReviewRequest({
      requestId: request.id,
      decision,
      decidedBy: decidedByLabel,
      decisionNotes: notesById[request.id],
    })
    if (!result.ok) {
      setError(result.error)
      setNotice('')
      return false
    }
    setError('')
    setResolveRetry(null)
    return true
  }

  const markConnectionThenResolveFailed = (
    request: AssignmentReviewRequest,
    decision: ResolveAfterConnectionRetry['decision'],
  ) => {
    setResolveRetry({ request, decision })
    setError(ASSIGNMENT_REVIEW_RESOLVE_AFTER_CONNECTION_ERROR)
    setNotice('')
  }

  const handleRetryResolveAfterConnection = () => {
    if (!resolveRetry || busyRequestId) return
    const { request, decision } = resolveRetry
    setBusyRequestId(request.id)
    void (async () => {
      try {
        if (!(await recordDecision(request, decision))) return
        setNotice(
          decision === 'Release'
            ? `Released ${request.karkunName} from ${request.ruknName}.`
            : decision === 'Transfer'
              ? `Transferred ${request.karkunName} to the selected Rukn.`
              : `Replaced Karkun for ${request.ruknName}.`,
        )
        setActiveRequest(null)
        setFollowUp(null)
      } finally {
        setBusyRequestId(null)
      }
    })()
  }

  const handleContinueOrReject = (
    request: AssignmentReviewRequest,
    decision: 'Continue' | 'Reject',
  ) => {
    if (busyRequestId) return
    setBusyRequestId(request.id)
    setNotice('')
    setResolveRetry(null)
    void (async () => {
      try {
        if (!(await recordDecision(request, decision))) return
        setNotice(
          decision === 'Continue'
            ? `Continue with ${request.ruknName} for ${request.karkunName}.`
            : `Review request rejected for ${request.karkunName}.`,
        )
      } finally {
        setBusyRequestId(null)
      }
    })()
  }

  const handleRelease = async (request: AssignmentReviewRequest) => {
    if (busyRequestId) return
    setBusyRequestId(request.id)
    setNotice('')
    setResolveRetry(null)
    try {
      const result = await removeAssignment({
        ruknId: request.ruknId,
        karkunId: request.karkunId,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        removalReason: 'Other',
        remarks: notesById[request.id] || `Release after review: ${request.reason}`,
        assignedBy: decidedBy,
      })
      if (!result.success) {
        setError(result.error)
        setNotice('')
        return
      }
      // TD-04 ordering: connection mutation succeeded — now durable resolve.
      if (!(await recordDecision(request, 'Release'))) {
        markConnectionThenResolveFailed(request, 'Release')
        return
      }
      setNotice(`Released ${request.karkunName} from ${request.ruknName}.`)
    } finally {
      setBusyRequestId(null)
    }
  }

  const openFollowUp = (request: AssignmentReviewRequest, action: FollowUpAction) => {
    if (busyRequestId) return
    setActiveRequest(request)
    setFollowUp(action)
    setError('')
    setResolveRetry(null)
  }

  if (pending.length === 0 && !notice && !error && !resolveRetry) {
    return null
  }

  return (
    <section className="rounded-(--radius-card) border border-amber-200 bg-amber-50/40 p-4 shadow-card">
      <h2 className="text-lg font-semibold text-text-heading">Review Requests</h2>
      <p className="mt-1 text-sm text-secondary">
        Rukn asked Admin to review ownership. Decide Continue, Transfer, Replace, Release, or Reject.
      </p>

      {notice ? (
        <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p>{error}</p>
          {resolveRetry ? (
            <div className="mt-2">
              <SecondaryButton
                type="button"
                className="min-h-10 px-3 py-2 text-sm"
                disabled={busyRequestId === resolveRetry.request.id}
                onClick={handleRetryResolveAfterConnection}
              >
                Retry mark resolved
              </SecondaryButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {pending.length === 0 ? (
        <p className="mt-3 text-sm text-secondary">No pending review requests.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {pending.map((request) => (
            <li
              key={request.id}
              className="rounded-xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-text-heading">{request.karkunName}</p>
                  <p className="text-sm text-secondary">
                    Rukn: {request.ruknName} · {request.assignmentNumber}
                  </p>
                  <p className="mt-1 text-sm text-text-heading">Reason: {request.reason}</p>
                  {request.notes ? (
                    <p className="mt-1 text-sm text-secondary">Notes: {request.notes}</p>
                  ) : null}
                </div>
                <p className="text-xs text-secondary">
                  {new Date(request.createdAt).toLocaleString()}
                </p>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                <div>
                  <dt className="text-secondary">Visits</dt>
                  <dd className="font-medium">{request.snapshot.visitCount}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Calls</dt>
                  <dd className="font-medium">{request.snapshot.callCount}</dd>
                </div>
                <div>
                  <dt className="text-secondary">WhatsApp</dt>
                  <dd className="font-medium">{request.snapshot.whatsappCount}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Last visit</dt>
                  <dd className="font-medium">{request.snapshot.lastVisit ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Stage</dt>
                  <dd className="font-medium">{request.snapshot.journeyStage}</dd>
                </div>
              </dl>

              <label className="mt-3 block">
                <span className={FORM_LABEL_CLASS}>Decision notes (optional)</span>
                <textarea
                  className={FORM_INPUT_CLASS}
                  rows={2}
                  value={notesById[request.id] ?? ''}
                  onChange={(event) =>
                    setNotesById((prev) => ({ ...prev, [request.id]: event.target.value }))
                  }
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <PrimaryButton
                  type="button"
                  className="min-h-10 px-3 py-2 text-sm"
                  disabled={busyRequestId === request.id}
                  onClick={() => handleContinueOrReject(request, 'Continue')}
                >
                  Continue
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  className="min-h-10 px-3 py-2 text-sm"
                  disabled={Boolean(busyRequestId)}
                  onClick={() => openFollowUp(request, 'transfer')}
                >
                  Transfer
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  className="min-h-10 px-3 py-2 text-sm"
                  disabled={Boolean(busyRequestId)}
                  onClick={() => openFollowUp(request, 'replace')}
                >
                  Replace
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  className="min-h-10 px-3 py-2 text-sm"
                  disabled={busyRequestId === request.id}
                  onClick={() => void handleRelease(request)}
                >
                  Release
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  className="min-h-10 px-3 py-2 text-sm"
                  disabled={busyRequestId === request.id}
                  onClick={() => handleContinueOrReject(request, 'Reject')}
                >
                  Reject
                </SecondaryButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {activeRequest && followUp === 'transfer' ? (
        <TransferConnectionModal
          isOpen
          karkunName={activeRequest.karkunName}
          currentRukn={getRuknById(activeRequest.ruknId) ?? null}
          error={error || undefined}
          onClose={() => {
            setActiveRequest(null)
            setFollowUp(null)
          }}
          onSubmit={(input) => {
            if (busyRequestId) return
            setBusyRequestId(activeRequest.id)
            setNotice('')
            setResolveRetry(null)
            void (async () => {
              try {
                const result = await changeKarkunRuknAssignment(
                  activeRequest.karkunId,
                  input.newRuknId,
                  decidedBy,
                  {
                    removalReason: input.transferReason,
                    remarks: input.remarks || notesById[activeRequest.id],
                    effectiveFrom: input.effectiveFrom,
                  },
                )
                if (!result.success) {
                  setError(result.error || 'Transfer failed. Please try again.')
                  setNotice('')
                  return
                }
                // TD-04 ordering: connection mutation succeeded — now durable resolve.
                if (!(await recordDecision(activeRequest, 'Transfer'))) {
                  markConnectionThenResolveFailed(activeRequest, 'Transfer')
                  return
                }
                setNotice(`Transferred ${activeRequest.karkunName} to the selected Rukn.`)
                setActiveRequest(null)
                setFollowUp(null)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Transfer failed unexpectedly.')
                setNotice('')
              } finally {
                setBusyRequestId(null)
              }
            })()
          }}
        />
      ) : null}

      {activeRequest && followUp === 'replace' ? (
        <ReplaceKarkunModal
          isOpen
          currentKarkunId={activeRequest.karkunId}
          currentKarkunName={activeRequest.karkunName}
          ruknId={activeRequest.ruknId}
          onClose={() => {
            setActiveRequest(null)
            setFollowUp(null)
          }}
          onComplete={() => {
            // ReplaceKarkunModal calls onComplete only after connection mutation succeeds.
            if (busyRequestId) return
            setBusyRequestId(activeRequest.id)
            setNotice('')
            setResolveRetry(null)
            void (async () => {
              try {
                if (!(await recordDecision(activeRequest, 'Replace'))) {
                  markConnectionThenResolveFailed(activeRequest, 'Replace')
                  return
                }
                setNotice(`Replaced Karkun for ${activeRequest.ruknName}.`)
                setActiveRequest(null)
                setFollowUp(null)
              } finally {
                setBusyRequestId(null)
              }
            })()
          }}
        />
      ) : null}
    </section>
  )
}
