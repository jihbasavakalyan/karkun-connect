import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/forms/people/ConfirmDialog'
import { InputField } from '@/components/forms/InputField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ROUTES } from '@/constants/routes'
import { persistKarkunDurable } from '@/lib/peopleStore'
import {
  archiveKarkunSafely,
  clearKarkunReview,
  deleteKarkunSafely,
  flagKarkunForReview,
  getKarkunArchiveBlockers,
  getKarkunDeleteBlockers,
  updateKarkunReviewNotes,
} from '@/services/registryMaintenanceService'
import {
  KARKUN_REVIEW_REASON_OPTIONS,
  type KarkunRegistryRecord,
  type KarkunReviewReason,
} from '@/types/karkun-registry.types'

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

type RegistryMaintenancePanelProps = {
  karkun: KarkunRegistryRecord
  karkunId: string
}

/**
 * KC-0076 — Admin-only review / archive / controlled delete on Karkun profile.
 */
export function RegistryMaintenancePanel({ karkun, karkunId }: RegistryMaintenancePanelProps) {
  const navigate = useNavigate()
  const [reviewReason, setReviewReason] = useState<KarkunReviewReason>(
    karkun.reviewReason ?? 'Unknown Person',
  )
  const [reviewNotes, setReviewNotes] = useState(karkun.reviewNotes ?? '')
  const [deleteReason, setDeleteReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const archiveBlockers = useMemo(() => getKarkunArchiveBlockers(karkunId), [karkunId, karkun])
  const deleteBlockers = useMemo(() => getKarkunDeleteBlockers(karkunId), [karkunId, karkun])
  const canArchive = archiveBlockers.length === 0 && !karkun.isArchived
  const canDelete = deleteBlockers.length === 0 && Boolean(deleteReason.trim())

  const runDurable = async (mutate: () => { success: boolean; error?: string }) => {
    setBusy(true)
    setError('')
    setMessage('')
    const result = mutate()
    if (!result.success) {
      setError(result.error ?? 'Unable to update registry.')
      setBusy(false)
      return false
    }
    const durable = await persistKarkunDurable(karkunId)
    if (!durable.success) {
      setError(durable.error ?? 'Changes could not be saved durably. Please try again.')
      setBusy(false)
      return false
    }
    setBusy(false)
    return true
  }

  const handleFlagReview = () => {
    void (async () => {
      const ok = await runDurable(() =>
        flagKarkunForReview(karkunId, reviewReason, reviewNotes, 'Administrator'),
      )
      if (ok) setMessage('Marked for review.')
    })()
  }

  const handleSaveNotes = () => {
    void (async () => {
      const ok = await runDurable(() =>
        updateKarkunReviewNotes(karkunId, reviewNotes, 'Administrator'),
      )
      if (ok) setMessage('Review notes saved.')
    })()
  }

  const handleClearReview = () => {
    void (async () => {
      const ok = await runDurable(() => clearKarkunReview(karkunId, 'Administrator'))
      if (ok) {
        setReviewNotes('')
        setMessage('Review flag cleared.')
      }
    })()
  }

  const handleArchive = () => {
    void (async () => {
      const ok = await runDurable(() => archiveKarkunSafely(karkunId, 'Administrator'))
      if (ok) {
        setMessage('Karkun archived.')
        navigate(ROUTES.ADMIN_KARKUN)
      }
    })()
  }

  const handleConfirmDelete = () => {
    void (async () => {
      setConfirmDeleteOpen(false)
      const ok = await runDurable(() =>
        deleteKarkunSafely(karkunId, deleteReason, 'Administrator'),
      )
      if (ok) {
        setMessage('Karkun removed from the registry.')
        navigate(ROUTES.ADMIN_KARKUN)
      }
    })()
  }

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
      aria-label="Registry maintenance"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-text-heading">Registry Maintenance</h2>
        {karkun.needsReview && !karkun.isArchived ? (
          <StatusBadge variant="warning">🟡 Needs Review</StatusBadge>
        ) : null}
        {karkun.isArchived ? (
          <StatusBadge variant="dormant">
            {karkun.archiveKind === 'admin_delete' ? 'Removed' : 'Archived'}
          </StatusBadge>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-secondary">Administrator only — does not affect Rukn Home.</p>

      {!karkun.isArchived ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-text-heading">Mark for Review</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="review-reason" className="text-sm font-medium text-text-heading">
                Reason
              </label>
              <select
                id="review-reason"
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value as KarkunReviewReason)}
                className={selectClassName}
                disabled={busy}
              >
                {KARKUN_REVIEW_REASON_OPTIONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
            <InputField
              id="review-notes"
              label="Administrator Notes (optional)"
              value={reviewNotes}
              onValueChange={setReviewNotes}
              className="px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton type="button" className="px-4 py-2 text-sm" disabled={busy} onClick={handleFlagReview}>
              {karkun.needsReview ? 'Update Review Flag' : 'Mark for Review'}
            </PrimaryButton>
            {karkun.needsReview ? (
              <>
                <SecondaryButton
                  type="button"
                  className="px-4 py-2 text-sm"
                  disabled={busy}
                  onClick={handleSaveNotes}
                >
                  Save Notes
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  className="px-4 py-2 text-sm"
                  disabled={busy}
                  onClick={handleClearReview}
                >
                  Clear Review
                </SecondaryButton>
              </>
            ) : null}
          </div>
          {karkun.reviewedBy && karkun.reviewedAt ? (
            <p className="text-xs text-secondary">
              Last review update: {karkun.reviewedBy} · {new Date(karkun.reviewedAt).toLocaleString()}
              {karkun.reviewReason ? ` · ${karkun.reviewReason}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-medium text-text-heading">Archive</h3>
        {canArchive ? (
          <SecondaryButton type="button" className="px-4 py-2 text-sm" disabled={busy} onClick={handleArchive}>
            Archive Karkun
          </SecondaryButton>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-secondary">Archive is unavailable.</p>
            <ul className="list-disc pl-5 text-sm text-red-700">
              {(karkun.isArchived ? ['Already archived.'] : archiveBlockers).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-medium text-text-heading">Delete</h3>
        <p className="text-xs text-secondary">
          Allowed only with no assignment, no connection, and no campaign history. Uses controlled
          registry removal (soft-archive) — not available when history exists.
        </p>
        {deleteBlockers.length > 0 ? (
          <ul className="list-disc pl-5 text-sm text-red-700">
            {deleteBlockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <>
            <InputField
              id="delete-reason"
              label="Delete reason (required)"
              value={deleteReason}
              onValueChange={setDeleteReason}
              className="px-3 py-2 text-sm"
              disabled={busy}
              required
            />
            <PrimaryButton
              type="button"
              className="px-4 py-2 text-sm"
              disabled={busy || !canDelete}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Permanently Remove
            </PrimaryButton>
          </>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Confirm permanent removal"
        confirmLabel="Delete"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        message={
          <div className="space-y-2">
            <p>
              You are about to permanently delete this Karkun.
              <br />
              This action cannot be undone.
            </p>
            <p className="text-secondary">Reason: {deleteReason.trim() || '—'}</p>
          </div>
        }
      />
    </section>
  )
}
