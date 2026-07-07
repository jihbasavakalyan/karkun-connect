import { useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  cancelCommitment,
  completeCommitment,
  createCommitment,
} from '@/services/guidanceService'
import type { Commitment } from '@/types/guidance'

const inputClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

type CommitmentPanelProps = {
  karkunId: string
  ruknId: string
  assignmentId?: string
  commitments: Commitment[]
  onChange?: () => void
}

export function CommitmentPanel({
  karkunId,
  ruknId,
  assignmentId,
  commitments,
  onChange,
}: CommitmentPanelProps) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10))

  const pending = commitments.filter((record) => record.status === 'pending')

  const handleAdd = () => {
    if (!text.trim()) {
      return
    }
    createCommitment({
      karkunId,
      ruknId,
      assignmentId,
      text,
      targetDate,
      source: 'manual',
    })
    setText('')
    setAdding(false)
    onChange?.()
  }

  const handleComplete = (id: string) => {
    completeCommitment(id)
    onChange?.()
  }

  const handleCancel = (id: string) => {
    cancelCommitment(id)
    onChange?.()
  }

  return (
    <div className="space-y-3">
      {pending.length === 0 && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full rounded-lg border border-dashed border-border py-4 text-sm font-medium text-primary hover:border-primary hover:bg-primary-muted/20"
        >
          + Add Follow-up Commitment
        </button>
      )}

      {pending.map((commitment) => (
        <div
          key={commitment.id}
          className="rounded-lg border border-border bg-surface-muted p-3"
        >
          <p className="font-medium text-text-heading">{commitment.text}</p>
          <p className="mt-1 text-xs text-secondary">Target: {commitment.targetDate}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={() => handleComplete(commitment.id)}>
              Mark Done
            </SecondaryButton>
            <SecondaryButton type="button" onClick={() => handleCancel(commitment.id)}>
              Cancel
            </SecondaryButton>
          </div>
        </div>
      ))}

      {adding && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <input
            type="text"
            className={inputClassName}
            placeholder="Agreed next step (e.g. Meet Sunday)"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <input
            type="date"
            className={inputClassName}
            min={new Date().toISOString().slice(0, 10)}
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
          />
          <div className="flex gap-2">
            <PrimaryButton type="button" onClick={handleAdd} disabled={!text.trim()}>
              Save Commitment
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setAdding(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </div>
      )}

      {pending.length > 0 && !adding && (
        <SecondaryButton type="button" fullWidth onClick={() => setAdding(true)}>
          + Add Commitment
        </SecondaryButton>
      )}
    </div>
  )
}
