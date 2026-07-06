import { useState } from 'react'
import { ruknMaster } from '@/data/ruknMaster'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { getCompatibleRuknsForKarkun } from '@/lib/peopleStore'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { PersonGender } from '@/types/karkun-registry.types'

type AssignKarkunModalProps = {
  isOpen: boolean
  onClose: () => void
  genderFilter?: PersonGender
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function AssignKarkunModal({ isOpen, onClose, genderFilter }: AssignKarkunModalProps) {
  const { getAvailableKarkunan, assignKarkun } = useAssignmentEngine()
  const availableKarkunan = getAvailableKarkunan().filter(
    (k) => !genderFilter || k.gender === genderFilter,
  )
  const [karkunId, setKarkunId] = useState('')
  const [ruknId, setRuknId] = useState('')
  const [error, setError] = useState('')

  const compatibleRukns =
    karkunId ? getCompatibleRuknsForKarkun(karkunId) : ruknMaster.filter((r) => r.status === 'active')

  const ruknOptions = genderFilter
    ? compatibleRukns.filter((r) => r.gender === genderFilter && r.status === 'active')
    : compatibleRukns.filter((r) => r.status === 'active')

  const handleAssign = () => {
    if (!karkunId || !ruknId) {
      setError('Please select both a Karkun and a Rukn.')
      return
    }

    const result = assignKarkun(karkunId, ruknId, 'Administrator')
    if (!result.success) {
      setError(result.error)
      return
    }

    setKarkunId('')
    setRuknId('')
    setError('')
    onClose()
  }

  const handleClose = () => {
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} title="Assign Karkun" onClose={handleClose}>
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="assign-karkun-select" className="text-sm font-medium text-text-heading">
            Select Karkun
          </label>
          <select
            id="assign-karkun-select"
            value={karkunId}
            onChange={(event) => {
              setKarkunId(event.target.value)
              setRuknId('')
            }}
            className={selectClassName}
          >
            <option value="">Choose available Karkun...</option>
            {availableKarkunan.map((karkun) => (
              <option key={karkun.id} value={karkun.id}>
                {karkun.name} · {karkun.area || karkun.gender}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="assign-rukn-select" className="text-sm font-medium text-text-heading">
            Select Rukn
          </label>
          <select
            id="assign-rukn-select"
            value={ruknId}
            onChange={(event) => setRuknId(event.target.value)}
            className={selectClassName}
          >
            <option value="">Choose Rukn...</option>
            {ruknOptions.map((rukn) => (
              <option key={rukn.id} value={rukn.id}>
                {rukn.name} · {rukn.gender}
              </option>
            ))}
          </select>
        </div>

        {genderFilter && (
          <p className="text-xs text-secondary">
            Only {genderFilter} Karkuns can be assigned to {genderFilter} Rukns.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-3 pt-2">
          <PrimaryButton type="button" fullWidth onClick={handleAssign}>
            Assign
          </PrimaryButton>
          <SecondaryButton type="button" fullWidth onClick={handleClose}>
            Cancel
          </SecondaryButton>
        </div>
      </div>
    </Modal>
  )
}
