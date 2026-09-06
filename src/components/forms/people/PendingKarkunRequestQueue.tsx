/**
 * Pending New Karkun requests queue (KC-018 / KC-0068 / KC-0072C / KC-0107 / KC-0115).
 * Canonical owner: Karkun module. Dashboard only launches here.
 * KC-028B — unified write lifecycle for approve / reject.
 */

import { useEffect, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { useAuth } from '@/hooks/useAuth'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import { ExistingPersonFoundPanel } from '@/components/relationship/ExistingPersonFoundPanel'
import {
  approvePeopleIntakeRequest,
  getPendingKarkunRequests,
  rejectNewKarkunRequest,
  subscribeToKarkunRequestStore,
  type MobileDuplicateDetails,
} from '@/services/karkunRequestService'
import {
  isNewKarkunIntakeRequest,
  isPublicTrainingRequest,
  publicTrainingReferralValue,
  PublicTrainingApproveFields,
  SubmittedReferringRuknDisplay,
} from '@/components/forms/people/PublicTrainingApproveFields'
import { getRuknById } from '@/data/ruknMaster'
import { isEligibleReferringRukn } from '@/lib/referringRukn'
import type { NewKarkunRequest } from '@/types/karkunRequest.types'

export function PendingKarkunRequestQueue() {
  const { user } = useAuth()
  const [, setTick] = useState(0)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [referralById, setReferralById] = useState<Record<string, string>>({})
  const [familyById, setFamilyById] = useState<Record<string, string>>({})
  const [addressById, setAddressById] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [duplicate, setDuplicate] = useState<MobileDuplicateDetails | null>(null)
  const { busy, busyKey, progressMessage, run } = useWriteLifecycle()

  useEffect(() => {
    return subscribeToKarkunRequestStore(() => setTick((value) => value + 1))
  }, [])

  useEffect(() => {
    // KC-0102C — background hydrate already applied settings/karkunRequests into
    // cache + store. Remount sync getDoc removed (verified duplicate of Phase C).
    // Live updates continue via settings onSnapshot → hydrate cycle.
    void import('@/stores/karkunRequestStore').then(({ reloadKarkunRequestStoreFromPersistence }) => {
      reloadKarkunRequestStoreFromPersistence()
    })
  }, [])

  const pending = getPendingKarkunRequests()
  const decidedBy = user?.displayName ?? user?.uid ?? 'Administrator'

  const refreshUi = () => {
    setTick((value) => value + 1)
  }

  const handleApprove = (request: NewKarkunRequest) => {
    setError('')
    setNotice('')
    setDuplicate(null)

    void run({
      key: `pending-queue:approve:${request.id}`,
      queueLabels: ['settings.karkunRequests'],
      work: async () => {
        const result = await approvePeopleIntakeRequest({
          requestId: request.id,
          decidedBy,
          decisionNotes: notesById[request.id],
          referredByRuknId: publicTrainingReferralValue(request, referralById) || undefined,
          fatherHusbandName: isPublicTrainingRequest(request) ? familyById[request.id] : undefined,
          address: isPublicTrainingRequest(request) ? addressById[request.id] : undefined,
        })
        if (!result.ok) {
          throw Object.assign(new Error(result.error), {
            code: result.code ?? 'unknown',
            duplicate: result.duplicate,
          })
        }
        return result
      },
      refreshCounters: refreshUi,
      refreshUi,
    }).then((lifecycle) => {
      if (!lifecycle) return
      if (!lifecycle.ok) {
        setError(lifecycle.message)
        const dup = (lifecycle.error as { duplicate?: MobileDuplicateDetails } | undefined)
          ?.duplicate
        setDuplicate(dup ?? null)
        setNotice('')
        refreshUi()
        return
      }
      setError('')
      setDuplicate(null)
      setNotice(`Approved ${request.fullName} and connected to ${request.requestingRuknName}.`)
    })
  }

  const handleReject = (request: NewKarkunRequest) => {
    setError('')
    setNotice('')
    setDuplicate(null)

    void run({
      key: `pending-queue:reject:${request.id}`,
      queueLabels: ['settings.karkunRequests'],
      work: async () => {
        const result = await rejectNewKarkunRequest({
          requestId: request.id,
          decidedBy,
          decisionNotes: notesById[request.id],
        })
        if (!result.ok) {
          throw Object.assign(new Error(result.error), { code: 'unknown' })
        }
        return result
      },
      refreshCounters: refreshUi,
      refreshUi,
    }).then((lifecycle) => {
      if (!lifecycle) return
      if (!lifecycle.ok) {
        setError(lifecycle.message)
        setDuplicate(null)
        setNotice('')
        refreshUi()
        return
      }
      setError('')
      setDuplicate(null)
      setNotice(`Rejected request for ${request.fullName}.`)
    })
  }

  if (pending.length === 0) {
    return (
      <section
        id="pending-karkun-requests"
        className="mc-panel mc-panel-compact acc-section"
        aria-label="Pending Karkun Requests"
      >
        <div className="acc-section-head">
          <h2 className="mc-panel-title">Pending Karkun Requests</h2>
        </div>
        <p className="text-sm text-secondary">
          No pending requests. New Karkun intake is owned by the Karkun module.
        </p>
      </section>
    )
  }

  return (
    <section
      id="pending-karkun-requests"
      className="mc-panel mc-panel-compact acc-section"
      aria-label="Pending Karkun Requests"
    >
      <div className="acc-section-head">
        <div>
          <h2 className="mc-panel-title">Pending Karkun Requests</h2>
          <p className="mt-1 text-xs text-secondary">
            Karkun workflow — approve or reject New Karkun intake.
          </p>
        </div>
        <span className="text-sm font-semibold text-primary">{pending.length}</span>
      </div>

      {error ? (
        <div className="ds-banner-error mb-3" role="alert">
          <p>{error}</p>
          {duplicate ? <ExistingPersonFoundPanel duplicate={duplicate} preferAdminLinks /> : null}
        </div>
      ) : null}
      {notice ? (
        <div className="ds-banner-success mb-3" role="status">
          {notice}
        </div>
      ) : null}
      {busy && progressMessage ? (
        <p className="mb-3 text-sm text-secondary" role="status" aria-live="polite">
          {progressMessage}
        </p>
      ) : null}

      <ul className="space-y-3">
        {pending.map((request) => {
          const isBusy =
            busyKey === `pending-queue:approve:${request.id}` ||
            busyKey === `pending-queue:reject:${request.id}`
          const referralId = publicTrainingReferralValue(request, referralById)
          const referringRukn = referralId ? getRuknById(referralId) : undefined
          const approveBlockedForReferral =
            isNewKarkunIntakeRequest(request) &&
            (!referringRukn || !isEligibleReferringRukn(referringRukn))
          return (
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
                  {isBusy ? '…' : 'Pending Approval'}
                </span>
              </div>

              <label className={`${FORM_LABEL_CLASS} mt-3`} htmlFor={`kreq-notes-${request.id}`}>
                Notes (optional)
              </label>
              <input
                id={`kreq-notes-${request.id}`}
                className={FORM_INPUT_CLASS}
                value={notesById[request.id] ?? ''}
                disabled={busy}
                onChange={(event) =>
                  setNotesById((current) => ({ ...current, [request.id]: event.target.value }))
                }
              />

              {isNewKarkunIntakeRequest(request) && !isPublicTrainingRequest(request) ? (
                <SubmittedReferringRuknDisplay
                  request={request}
                  referredByRuknId={referralId}
                />
              ) : null}
              {isPublicTrainingRequest(request) ? (
                <PublicTrainingApproveFields
                  request={request}
                  referredByRuknId={referralById[request.id] ?? request.requestingRuknId ?? ''}
                  onReferredByRuknIdChange={(value) =>
                    setReferralById((current) => ({ ...current, [request.id]: value }))
                  }
                  fatherHusbandName={familyById[request.id] ?? ''}
                  onFatherHusbandNameChange={(value) =>
                    setFamilyById((current) => ({ ...current, [request.id]: value }))
                  }
                  address={addressById[request.id] ?? ''}
                  onAddressChange={(value) =>
                    setAddressById((current) => ({ ...current, [request.id]: value }))
                  }
                  disabled={busy}
                />
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <PrimaryButton
                  type="button"
                  disabled={busy || approveBlockedForReferral}
                  aria-busy={isBusy}
                  onClick={() => handleApprove(request)}
                >
                  {isBusy ? '…' : 'Approve'}
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  disabled={busy}
                  onClick={() => handleReject(request)}
                >
                  {isBusy ? '…' : 'Reject'}
                </SecondaryButton>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
