import { useState } from 'react'
import { getKarkunsForRuknAssignment } from '@/services/assignmentService'
import { Modal } from '@/components/common/Modal'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { REPLACEMENT_REASON_OPTIONS, getReplacementReasonLabel } from '@/types/assignment'
import type { Rukn } from '@/data/ruknMaster'
import type { ReplacementReason } from '@/types/assignment'

type ReplaceAssignmentModalProps = {
  isOpen: boolean
  rukn: Rukn | null
  currentKarkunName: string
  onClose: () => void
  onSubmit: (input: {
    newKarkunId: string
    effectiveFrom: string
    replacementReason: ReplacementReason
    remarks?: string
  }) => void
  error?: string
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function ReplaceAssignmentModal({
  isOpen,
  rukn,
  currentKarkunName,
  onClose,
  onSubmit,
  error,
}: ReplaceAssignmentModalProps) {
  const [newKarkunId, setNewKarkunId] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [replacementReason, setReplacementReason] = useState<ReplacementReason>(
    'Shifted responsibility',
  )
  const [remarks, setRemarks] = useState('')

  const karkuns = rukn ? getKarkunsForRuknAssignment(rukn.id) : []

  const handleSubmit = () => {
    if (!newKarkunId) return
    onSubmit({ newKarkunId, effectiveFrom, replacementReason, remarks: remarks || undefined })
  }

  if (!rukn) return null

  return (
    <Modal isOpen={isOpen} title={`Replace Connection — ${rukn.name}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Currently connected: <strong className="text-text-heading">{currentKarkunName}</strong>
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="replace-karkun" className="text-sm font-medium text-text-heading">
            New Karkun
          </label>
          <select
            id="replace-karkun"
            value={newKarkunId}
            onChange={(e) => setNewKarkunId(e.target.value)}
            className={selectClassName}
          >
            <option value="">Choose replacement Karkun...</option>
            {karkuns.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} · {k.mobile}
              </option>
            ))}
          </select>
        </div>

        <InputField
          id="replace-date"
          label="Replacement Date"
          type="date"
          value={effectiveFrom}
          onValueChange={setEffectiveFrom}
          required
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="replace-reason" className="text-sm font-medium text-text-heading">
            Reason
          </label>
          <select
            id="replace-reason"
            value={replacementReason}
            onChange={(e) => setReplacementReason(e.target.value as ReplacementReason)}
            className={selectClassName}
          >
            {REPLACEMENT_REASON_OPTIONS.map((reason) => (
              <option key={reason} value={reason}>
                {getReplacementReasonLabel(reason)}
              </option>
            ))}
          </select>
        </div>

        <TextAreaField
          id="replace-remarks"
          label="Remarks (optional)"
          value={remarks}
          onValueChange={setRemarks}
          rows={2}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSubmit}>
            Replace Connection
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
