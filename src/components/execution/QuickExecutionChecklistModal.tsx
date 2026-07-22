/**
 * KC-0081 — Quick Execution Checklist modal (one-tap progress tracking).
 */

import { useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'
import {
  buildQuickExecutionSnapshot,
  QUICK_EXECUTION_JOURNEY_OPTIONS,
  saveQuickExecutionChecklist,
  type JihAppChecklist,
  type QuickExecutionDraft,
  type VisitChecklist,
} from '@/lib/quickExecutionChecklist'
import type { JourneyStageId } from '@/types/guidance'
import type { IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'

const tapClass =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-heading active:bg-surface-muted'

type QuickExecutionChecklistModalProps = {
  isOpen: boolean
  karkunId: string
  ruknId: string
  onClose: () => void
  onSaved?: () => void
}

function CheckRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className={`${tapClass} ${disabled ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="font-medium">{label}</span>
    </label>
  )
}

function RadioRow({
  label,
  checked,
  onSelect,
}: {
  label: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label className={tapClass}>
      <input
        type="radio"
        className="h-5 w-5 border-border text-primary focus:ring-primary"
        checked={checked}
        onChange={onSelect}
      />
      <span className="font-medium">{label}</span>
    </label>
  )
}

export function QuickExecutionChecklistModal({
  isOpen,
  karkunId,
  ruknId,
  onClose,
  onSaved,
}: QuickExecutionChecklistModalProps) {
  const { user } = useAuth()
  const snapshot = buildQuickExecutionSnapshot(karkunId)
  const [draft, setDraft] = useState<QuickExecutionDraft | null>(
    snapshot?.draft ?? null,
  )
  const [initial] = useState<QuickExecutionDraft | null>(snapshot?.draft ?? null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isOpen || !snapshot || !draft || !initial) return null

  const setVisit = (key: keyof VisitChecklist, value: boolean) => {
    setDraft((current) =>
      current ? { ...current, visit: { ...current.visit, [key]: value } } : current,
    )
  }

  const setJih = (key: keyof JihAppChecklist, value: boolean) => {
    setDraft((current) => {
      if (!current) return current
      const next = { ...current.jih, [key]: value }
      if (key === 'registered' && value) {
        next.discussed = true
        next.installed = true
      }
      if (key === 'installed' && value) {
        next.discussed = true
      }
      if (key === 'discussed' && !value) {
        next.installed = false
        next.registered = false
      }
      if (key === 'installed' && !value) {
        next.registered = false
      }
      return { ...current, jih: next }
    })
  }

  const setJourney = (id: JourneyStageId, value: boolean) => {
    setDraft((current) =>
      current
        ? { ...current, journey: { ...current.journey, [id]: value } }
        : current,
    )
  }

  const handleSave = () => {
    setError('')
    setSaving(true)
    const result = saveQuickExecutionChecklist(
      karkunId,
      ruknId,
      user?.uid,
      initial,
      draft,
    )
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
      title="Quick Execution"
      onClose={onClose}
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose} disabled={saving}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-5">
        <header>
          <h3 className="text-lg font-semibold text-text-heading">{snapshot.karkunName}</h3>
          <p className="mt-0.5 text-sm text-secondary">
            Current Stage · {snapshot.currentStageLabel}
          </p>
        </header>

        <section aria-label="Today's Visit" className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Today&apos;s Visit
          </h4>
          <CheckRow
            label="Visited Today"
            checked={draft.visit.visitedToday}
            onChange={(v) => setVisit('visitedToday', v)}
          />
          <CheckRow
            label="Phone Discussion"
            checked={draft.visit.phoneDiscussion}
            onChange={(v) => setVisit('phoneDiscussion', v)}
          />
          <CheckRow
            label="Follow-up Required"
            checked={draft.visit.followUpRequired}
            onChange={(v) => setVisit('followUpRequired', v)}
          />
          <CheckRow
            label="Meeting Completed"
            checked={draft.visit.meetingCompleted}
            onChange={(v) => setVisit('meetingCompleted', v)}
          />
        </section>

        <section aria-label="Weekly Ijtema" className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Weekly Ijtema
          </h4>
          {(['Present', 'Absent', 'Excused'] as IjtemaAttendanceStatus[]).map((status) => (
            <RadioRow
              key={status}
              label={status}
              checked={draft.ijtema === status}
              onSelect={() => setDraft((c) => (c ? { ...c, ijtema: status } : c))}
            />
          ))}
        </section>

        <section aria-label="Journey Progress" className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Journey Progress
          </h4>
          {QUICK_EXECUTION_JOURNEY_OPTIONS.map((option) => (
            <CheckRow
              key={option.id}
              label={option.label}
              checked={draft.journey[option.id]}
              disabled={Boolean(snapshot.journeyLocked[option.id])}
              onChange={(v) => setJourney(option.id, v)}
            />
          ))}
        </section>

        <section aria-label="JIH App" className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
            JIH App
          </h4>
          <CheckRow
            label="Discussed"
            checked={draft.jih.discussed}
            onChange={(v) => setJih('discussed', v)}
          />
          <CheckRow
            label="Installed"
            checked={draft.jih.installed}
            onChange={(v) => setJih('installed', v)}
          />
          <CheckRow
            label="Registered"
            checked={draft.jih.registered}
            onChange={(v) => setJih('registered', v)}
          />
        </section>

        <section aria-label="Remarks" className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Remarks (Optional)
          </h4>
          <textarea
            value={draft.remarks}
            onChange={(event) =>
              setDraft((c) => (c ? { ...c, remarks: event.target.value } : c))
            }
            rows={2}
            dir="auto"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Optional notes…"
          />
        </section>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  )
}
