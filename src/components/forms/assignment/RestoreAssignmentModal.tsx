import { useState } from 'react'
import { getKarkunsForRuknAssignment } from '@/services/assignmentService'
import { Modal } from '@/components/common/Modal'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { Rukn } from '@/data/ruknMaster'

type RestoreAssignmentModalProps = {
  isOpen: boolean
  rukn: Rukn | null
  onClose: () => void
  onSubmit: (input: { karkunId: string; effectiveFrom: string; remarks?: string }) => void
  error?: string
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function RestoreAssignmentModal({
  isOpen,
  rukn,
  onClose,
  onSubmit,
  error,
}: RestoreAssignmentModalProps) {
  const [karkunId, setKarkunId] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')

  const karkuns = rukn ? getKarkunsForRuknAssignment(rukn.id) : []

  const handleSubmit = () => {
    if (!karkunId) return
    onSubmit({ karkunId, effectiveFrom, remarks: remarks || undefined })
  }

  if (!rukn) return null

  return (
    <Modal
      isOpen={isOpen}
      title={`Reconnect — ${rukn.name}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSubmit}>
            Reconnect
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Reconnect an active Karkun for this Rukn.
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="restore-karkun" className="text-sm font-medium text-text-heading">
            Select Karkun
          </label>
          <select
            id="restore-karkun"
            value={karkunId}
            onChange={(e) => setKarkunId(e.target.value)}
            className={selectClassName}
          >
            <option value="">Choose Karkun...</option>
            {karkuns.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} · {k.mobile}
              </option>
            ))}
          </select>
        </div>

        <InputField
          id="restore-date"
          label="Effective From"
          type="date"
          value={effectiveFrom}
          onValueChange={setEffectiveFrom}
          required
        />

        <TextAreaField
          id="restore-remarks"
          label="Remarks (optional)"
          value={remarks}
          onValueChange={setRemarks}
          rows={2}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

      </div>
    </Modal>
  )
}
