import { useState } from 'react'
import { ruknMaster } from '@/data/ruknMaster'
import { bulkAssignKarkuns } from '@/lib/assignmentEngine'
import { getCompatibleRuknsForKarkun } from '@/lib/peopleStore'
import { getRuknAssignmentSummary } from '@/services/assignmentService'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { PersonGender } from '@/types/karkun-registry.types'

type BulkAssignModalProps = {
  isOpen: boolean
  karkunIds: string[]
  sectionGender: PersonGender
  onClose: () => void
  onComplete: () => void
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function BulkAssignModal({
  isOpen,
  karkunIds,
  sectionGender,
  onClose,
  onComplete,
}: BulkAssignModalProps) {
  const [ruknId, setRuknId] = useState('')
  const [resultMessage, setResultMessage] = useState('')

  const compatibleRukns = ruknMaster.filter(
    (r) => r.status === 'active' && r.gender === sectionGender,
  )

  const handleAssign = () => {
    if (!ruknId) {
      setResultMessage('Please select a Rukn.')
      return
    }

    void (async () => {
      const result = await bulkAssignKarkuns(karkunIds, ruknId, 'Administrator')
      setResultMessage(
        `Connected ${result.success} Karkun. ${result.failed.length > 0 ? `${result.failed.length} failed.` : ''}`,
      )

      if (result.failed.length === 0) {
        onComplete()
        onClose()
      }
    })()
  }

  const handleClose = () => {
    setRuknId('')
    setResultMessage('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} title="Bulk Connect Karkun" onClose={handleClose}>
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Connect {karkunIds.length} selected {sectionGender} Karkun to a compatible {sectionGender}{' '}
          Rukn.
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="bulk-assign-rukn" className="text-sm font-medium text-text-heading">
            Select Rukn
          </label>
          <select
            id="bulk-assign-rukn"
            value={ruknId}
            onChange={(event) => setRuknId(event.target.value)}
            className={selectClassName}
          >
            <option value="">Choose Rukn...</option>
            {compatibleRukns.map((rukn) => (
              <option key={rukn.id} value={rukn.id}>
                {rukn.id} – {rukn.name} (Connected Karkuns: {getRuknAssignmentSummary(rukn.id).assignedKarkunCount})
              </option>
            ))}
          </select>
        </div>

        {karkunIds.length === 1 && (
          <p className="text-xs text-secondary">
            Compatible Rukns for this Karkun:{' '}
            {getCompatibleRuknsForKarkun(karkunIds[0])
              .map((r) => r.name)
              .join(', ') || 'None available'}
          </p>
        )}

        {resultMessage && <p className="text-sm text-red-600">{resultMessage}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={handleClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleAssign}>
            Connect Selected
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
