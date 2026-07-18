/**
 * Admin queue for Pending New Karkun requests (KC-018).
 */

import { useEffect, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { useAuth } from '@/hooks/useAuth'
import {
  approveNewKarkunRequest,
  getPendingKarkunRequests,
  rejectNewKarkunRequest,
  subscribeToKarkunRequestStore,
} from '@/services/karkunRequestService'
import type { NewKarkunRequest } from '@/types/karkunRequest.types'

export function PendingKarkunRequestQueue() {
  const { user } = useAuth()
  const [, setTick] = useState(0)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    return subscribeToKarkunRequestStore(() => setTick((value) => value + 1))
  }, [])

  const pending = getPendingKarkunRequests()
  const decidedBy = user?.displayName ?? user?.uid ?? 'Administrator'

  const handleApprove = (request: NewKarkunRequest) => {
    void (async () => {
      const result = await approveNewKarkunRequest({
        requestId: request.id,
        decidedBy,
        decisionNotes: notesById[request.id],
      })
      if (!result.ok) {
        setError(result.error)
        setNotice('')
        return
      }
      setError('')
      setNotice(`Approved ${request.fullName} and connected to ${request.requestingRuknName}.`)
    })()
  }

  const handleReject = (request: NewKarkunRequest) => {
    const result = rejectNewKarkunRequest({
      requestId: request.id,
      decidedBy,
      decisionNotes: notesById[request.id],
    })
    if (!result.ok) {
      setError(result.error)
      setNotice('')
      return
    }
    setError('')
    setNotice(`Rejected request for ${request.fullName}.`)
  }

  if (pending.length === 0) {
    return (
      <section className="mc-panel mc-panel-compact acc-section" aria-label="Pending Karkun Requests">
        <div className="acc-section-head">
          <h2 className="mc-panel-title">Pending Karkun Requests</h2>
        </div>
        <p className="text-sm text-secondary">No pending requests.</p>
      </section>
    )
  }

  return (
    <section className="mc-panel mc-panel-compact acc-section" aria-label="Pending Karkun Requests">
      <div className="acc-section-head">
        <h2 className="mc-panel-title">Pending Karkun Requests</h2>
        <span className="text-sm font-semibold text-primary">{pending.length}</span>
      </div>

      {error ? (
        <div className="ds-banner-error mb-3" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="ds-banner-success mb-3" role="status">
          {notice}
        </div>
      ) : null}

      <ul className="space-y-3">
        {pending.map((request) => (
          <li key={request.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-text-heading">{request.fullName}</p>
                <p className="text-sm text-secondary">
                  {request.gender} · {request.mobile}
                  {request.area ? ` · ${request.area}` : ''}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  Requested by {request.requestingRuknName}
                </p>
                {request.remarks ? (
                  <p className="mt-1 text-sm text-text-heading">{request.remarks}</p>
                ) : null}
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Pending Approval
              </span>
            </div>

            <label className={`${FORM_LABEL_CLASS} mt-3`} htmlFor={`kreq-notes-${request.id}`}>
              Notes (optional)
            </label>
            <input
              id={`kreq-notes-${request.id}`}
              className={FORM_INPUT_CLASS}
              value={notesById[request.id] ?? ''}
              onChange={(event) =>
                setNotesById((current) => ({ ...current, [request.id]: event.target.value }))
              }
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <PrimaryButton type="button" onClick={() => handleApprove(request)}>
                Approve
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => handleReject(request)}>
                Reject
              </SecondaryButton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
