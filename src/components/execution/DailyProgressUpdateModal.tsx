/**
 * KC-0080 — Lightweight Daily Progress update modal (reuses Annexure save path).
 */

import { useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'
import {
  buildFormFromDailyProgressOutcome,
  DAILY_PROGRESS_OUTCOME_OPTIONS,
  deriveOutcomeFromForm,
  getDailyProgressView,
  type DailyProgressOutcome,
} from '@/lib/dailyProgressPresentation'
import { saveDailyProgress } from '@/services/annexure1Service'
import { createInitialAnnexure1FormState } from '@/types/annexure1.types'

const fieldClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

type DailyProgressUpdateModalProps = {
  isOpen: boolean
  karkunId: string
  karkunName: string
  ruknId: string
  onClose: () => void
  onSaved?: () => void
}

export function DailyProgressUpdateModal({
  isOpen,
  karkunId,
  karkunName,
  ruknId,
  onClose,
  onSaved,
}: DailyProgressUpdateModalProps) {
  const { user } = useAuth()
  const view = useMemo(() => getDailyProgressView(karkunId), [karkunId, isOpen])

  const initialOutcome = view.submission
    ? deriveOutcomeFromForm(view.submission)
    : ('visit_completed' as DailyProgressOutcome)

  const [outcome, setOutcome] = useState<DailyProgressOutcome>(initialOutcome)
  const [remarks, setRemarks] = useState(
    view.submission?.discussionSummary ||
      view.submission?.notConductedReason ||
      '',
  )
  const [followUpDate, setFollowUpDate] = useState(
    view.submission?.followUpDate || createInitialAnnexure1FormState().visitDate,
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = () => {
    setError('')
    setSaving(true)
    const form = buildFormFromDailyProgressOutcome(
      outcome,
      remarks,
      followUpDate,
      view.submission ?? createInitialAnnexure1FormState(),
    )
    const result = saveDailyProgress(form, {
      karkunId,
      ruknId,
      actorRole: 'rukn',
      actorId: user?.uid,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    onSaved?.()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      title={view.hasTodayProgress ? 'Edit Progress' : 'Update Progress'}
      onClose={onClose}
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Progress'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          <span className="font-medium text-text-heading">{karkunName}</span>
          {view.hasTodayProgress
            ? ' — update today\'s progress.'
            : ' — record today\'s progress.'}
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="daily-progress-outcome" className="text-sm font-medium text-text-heading">
            Outcome
          </label>
          <select
            id="daily-progress-outcome"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as DailyProgressOutcome)}
            className={fieldClass}
          >
            {DAILY_PROGRESS_OUTCOME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {outcome === 'follow_up_required' ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="daily-progress-followup" className="text-sm font-medium text-text-heading">
              Next Follow-up
            </label>
            <input
              id="daily-progress-followup"
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
              className={fieldClass}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor="daily-progress-remarks" className="text-sm font-medium text-text-heading">
            Remarks
          </label>
          <textarea
            id="daily-progress-remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={3}
            dir="auto"
            className={fieldClass}
            placeholder="Optional notes…"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  )
}
