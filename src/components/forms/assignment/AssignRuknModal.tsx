import { useState } from 'react'
import { getKarkunsForRuknAssignment } from '@/services/assignmentService'
import { Modal } from '@/components/common/Modal'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { Rukn } from '@/data/ruknMaster'

type AssignRuknModalProps = {
  isOpen: boolean
  rukn: Rukn | null
  onClose: () => void
  onSubmit: (input: {
    karkunId: string
    effectiveFrom: string
    remarks?: string
  }) => void
  error?: string
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function AssignRuknModal({
  isOpen,
  rukn,
  onClose,
  onSubmit,
  error,
}: AssignRuknModalProps) {
  const [karkunId, setKarkunId] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')

  const karkuns = rukn ? getKarkunsForRuknAssignment(rukn.id) : []

  const handleSubmit = () => {
    if (!karkunId) return
    onSubmit({ karkunId, effectiveFrom, remarks: remarks || undefined })
  }

  const handleClose = () => {
    setKarkunId('')
    setRemarks('')
    onClose()
  }

  if (!rukn) return null

  return (
    <Modal isOpen={isOpen} title={`Assign Karkun to ${rukn.name}`} onClose={handleClose}>
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="assign-karkun" className="text-sm font-medium text-text-heading">
            Select Karkun
          </label>
          <select
            id="assign-karkun"
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
          id="assign-effective-from"
          label="Effective From"
          type="date"
          value={effectiveFrom}
          onValueChange={setEffectiveFrom}
          required
        />

        <TextAreaField
          id="assign-remarks"
          label="Remarks (optional)"
          value={remarks}
          onValueChange={setRemarks}
          rows={2}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={handleClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleSubmit}>
            Assign
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
