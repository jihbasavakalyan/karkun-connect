import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/forms/people/ConfirmDialog'
import { InputField } from '@/components/forms/InputField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ROUTES } from '@/constants/routes'
import { getPersonCategory, isSoftRemoved } from '@/lib/peopleClassification'
import { persistKarkunDurable } from '@/lib/peopleStore'
import {
  clearKarkunReview,
  deleteKarkunSafely,
  flagKarkunForReview,
  getKarkunDeleteBlockers,
  getMoveToMuttafiqeenBlockers,
  moveToKarkunSafely,
  moveToMuttafiqeenSafely,
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

type MoveConfirmKind = 'muttafiqeen' | 'karkun' | null

/**
 * KC-0076 / KC-0101 — Admin review, classification moves, controlled delete.
 */
export function RegistryMaintenancePanel({ karkun, karkunId }: RegistryMaintenancePanelProps) {
  const navigate = useNavigate()
  const [reviewReason, setReviewReason] = useState<KarkunReviewReason>(
    karkun.reviewReason ?? 'Unknown Person',
  )
  const [reviewNotes, setReviewNotes] = useState(karkun.reviewNotes ?? '')
  const [deleteReason, setDeleteReason] = useState('')
  const [reclassifyRemarks, setReclassifyRemarks] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [moveConfirm, setMoveConfirm] = useState<MoveConfirmKind>(null)

  const category = getPersonCategory(karkun)
  const softRemoved = isSoftRemoved(karkun)
  const moveBlockers = getMoveToMuttafiqeenBlockers(karkunId)
  const deleteBlockers = getKarkunDeleteBlockers(karkunId)
  const canMoveToMuttafiqeen = moveBlockers.length === 0 && category === 'Karkun' && !softRemoved
  const canMoveToKarkun = category === 'Muttafiq' && !softRemoved
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

  const handleConfirmMove = () => {
    const kind = moveConfirm
    setMoveConfirm(null)
    if (!kind) return

    void (async () => {
      if (kind === 'muttafiqeen') {
        const ok = await runDurable(() =>
          moveToMuttafiqeenSafely(karkunId, 'Administrator', reclassifyRemarks || undefined),
        )
        if (ok) {
          setMessage('Moved to Muttafiqeen.')
          navigate(ROUTES.ADMIN_MUTTAFIQEEN)
        }
        return
      }

      const ok = await runDurable(() =>
        moveToKarkunSafely(karkunId, 'Administrator', reclassifyRemarks || undefined),
      )
      if (ok) {
        setMessage('Moved to Karkun Registry.')
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
        setMessage('Person removed from the registry.')
        navigate(category === 'Muttafiq' ? ROUTES.ADMIN_MUTTAFIQEEN : ROUTES.ADMIN_KARKUN)
      }
    })()
  }

  const history = karkun.classificationHistory ?? []

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card"
      aria-label="Registry maintenance"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-text-heading">Registry Maintenance</h2>
        <StatusBadge variant={category === 'Muttafiq' ? 'info' : 'connected'}>
          {category}
        </StatusBadge>
        {karkun.needsReview && !softRemoved ? (
          <StatusBadge variant="warning">Needs Review</StatusBadge>
        ) : null}
        {softRemoved ? (
          <StatusBadge variant="dormant">
            {karkun.archiveKind === 'admin_delete' ? 'Removed' : 'Merged Duplicate'}
          </StatusBadge>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-secondary">Administrator only — does not affect Rukn Home.</p>

      {!softRemoved ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-text-heading">Mark for Review</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="review-reason" className="text-sm font-medium text-text-heading">
                Reason
              </label>
              <select
                id="review-reason"
                className={selectClassName}
                value={reviewReason}
                onChange={(event) => setReviewReason(event.target.value as KarkunReviewReason)}
                disabled={busy}
              >
                {KARKUN_REVIEW_REASON_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <InputField
              id="review-notes"
              label="Notes"
              value={reviewNotes}
              onValueChange={setReviewNotes}
              className="px-3 py-2 text-sm"
              disabled={busy}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton
              type="button"
              className="px-4 py-2 text-sm"
              disabled={busy}
              onClick={handleFlagReview}
            >
              Mark for Review
            </SecondaryButton>
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
          {karkun.reviewedAt ? (
            <p className="text-xs text-secondary">
              Last review update: {karkun.reviewedBy} · {new Date(karkun.reviewedAt).toLocaleString()}
              {karkun.reviewReason ? ` · ${karkun.reviewReason}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}

      {!softRemoved ? (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-text-heading">Classification</h3>
          <p className="text-xs text-secondary">
            Changing classification never deletes the person or creates a duplicate. History is
            preserved.
          </p>
          <InputField
            id="reclassify-remarks"
            label="Remarks (optional)"
            value={reclassifyRemarks}
            onValueChange={setReclassifyRemarks}
            className="px-3 py-2 text-sm"
            disabled={busy}
          />
          {category === 'Karkun' ? (
            canMoveToMuttafiqeen ? (
              <SecondaryButton
                type="button"
                className="px-4 py-2 text-sm"
                disabled={busy}
                onClick={() => setMoveConfirm('muttafiqeen')}
              >
                Move to Muttafiqeen
              </SecondaryButton>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-secondary">Move to Muttafiqeen is unavailable.</p>
                <ul className="list-disc pl-5 text-sm text-red-700">
                  {moveBlockers.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )
          ) : null}
          {canMoveToKarkun ? (
            <PrimaryButton
              type="button"
              className="px-4 py-2 text-sm"
              disabled={busy}
              onClick={() => setMoveConfirm('karkun')}
            >
              Move to Karkun Registry
            </PrimaryButton>
          ) : null}
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-text-heading">Classification History</h3>
          <ul className="space-y-2 text-sm text-secondary">
            {[...history].reverse().map((entry, index) => (
              <li key={`${entry.changedAt}-${index}`} className="rounded-lg bg-surface-muted px-3 py-2">
                <p className="text-text-heading">
                  {entry.previousCategory} → {entry.newCategory}
                </p>
                <p className="text-xs">
                  {entry.changedBy} · {new Date(entry.changedAt).toLocaleString()}
                  {entry.remarks ? ` · ${entry.remarks}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-medium text-text-heading">Delete</h3>
        <p className="text-xs text-secondary">
          Allowed only with no assignment, no connection, and no campaign history. Uses controlled
          registry removal — not available when history exists.
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

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <ConfirmDialog
        isOpen={moveConfirm === 'muttafiqeen'}
        title="Move to Muttafiqeen?"
        confirmLabel="Move to Muttafiqeen"
        onClose={() => setMoveConfirm(null)}
        onConfirm={handleConfirmMove}
        message={
          <div className="space-y-2">
            <p>
              <strong>{karkun.name}</strong> will be classified as a Muttafiq and leave the Karkun
              Registry.
            </p>
            <p className="text-secondary">
              They will no longer be eligible for campaign assignment or connections. Profile and
              history are preserved.
            </p>
          </div>
        }
      />

      <ConfirmDialog
        isOpen={moveConfirm === 'karkun'}
        title="Move to Karkun Registry?"
        confirmLabel="Move to Karkun Registry"
        onClose={() => setMoveConfirm(null)}
        onConfirm={handleConfirmMove}
        message={
          <div className="space-y-2">
            <p>
              <strong>{karkun.name}</strong> will be classified as a Karkun and leave the Muttafiqeen
              Registry.
            </p>
            <p className="text-secondary">
              They become eligible for campaign assignment and connections. Profile and history are
              preserved.
            </p>
          </div>
        }
      />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Confirm permanent removal"
        confirmLabel="Delete"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        message={
          <div className="space-y-2">
            <p>
              You are about to permanently remove this person from the active registry.
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
