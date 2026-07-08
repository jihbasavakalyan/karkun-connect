import { useMemo, useState } from 'react'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { getCompatibleRuknsForKarkun } from '@/lib/peopleStore'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import { AvailableKarkunRow, KarkunSearchField } from '@/components/relationship'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { PersonGender } from '@/types/karkun-registry.types'

type AssignKarkunModalProps = {
  isOpen: boolean
  onClose: () => void
  genderFilter?: PersonGender
}

export function AssignKarkunModal({ isOpen, onClose, genderFilter }: AssignKarkunModalProps) {
  const { getAvailableKarkunan, assignKarkun } = useAssignmentEngine()
  const availableKarkunan = getAvailableKarkunan().filter(
    (k) => !genderFilter || k.gender === genderFilter,
  )
  const [query, setQuery] = useState('')
  const [pendingKarkunId, setPendingKarkunId] = useState<string | null>(null)
  const [ruknId, setRuknId] = useState('')
  const [error, setError] = useState('')

  const filtered = useMemo(
    () => availableKarkunan.filter((karkun) => matchesKarkunRegistrySearch(karkun, query)),
    [availableKarkunan, query],
  )

  const pendingKarkun = pendingKarkunId
    ? availableKarkunan.find((karkun) => karkun.id === pendingKarkunId) ?? null
    : null

  const compatibleRukns = pendingKarkunId
    ? getCompatibleRuknsForKarkun(pendingKarkunId).filter((r) => r.status === 'active')
    : []

  const ruknOptions = genderFilter
    ? compatibleRukns.filter((r) => r.gender === genderFilter)
    : compatibleRukns

  const handleAssign = () => {
    if (!pendingKarkunId || !ruknId) {
      setError('Please choose a Rukn to complete the connection.')
      return
    }

    const result = assignKarkun(pendingKarkunId, ruknId, 'Administrator')
    if (!result.success) {
      setError(result.error)
      return
    }

    setPendingKarkunId(null)
    setRuknId('')
    setQuery('')
    setError('')
    onClose()
  }

  const handleClose = () => {
    setError('')
    setPendingKarkunId(null)
    setRuknId('')
    onClose()
  }

  return (
    <>
      <Modal isOpen={isOpen && !pendingKarkun} title="Connect Karkun" onClose={handleClose}>
        <div className="space-y-4">
          <KarkunSearchField
            id="assign-karkun-modal-search"
            value={query}
            onChange={setQuery}
            resultCount={query.trim() ? filtered.length : undefined}
          />

          <ul className="relationship-row-list max-h-[18rem] overflow-y-auto">
            {filtered.map((karkun) => (
              <li key={karkun.id}>
                <AvailableKarkunRow
                  karkun={karkun}
                  onConnect={() => {
                    setPendingKarkunId(karkun.id)
                    setRuknId('')
                    setError('')
                  }}
                />
              </li>
            ))}
          </ul>

          {filtered.length === 0 && (
            <p className="text-sm text-secondary">No available Karkuns match your search.</p>
          )}

          {genderFilter && (
            <p className="text-xs text-secondary">
              Only {genderFilter} Karkuns can be connected to {genderFilter} Rukns.
            </p>
          )}

          <SecondaryButton type="button" fullWidth onClick={handleClose}>
            Close
          </SecondaryButton>
        </div>
      </Modal>

      <Modal
        isOpen={pendingKarkun !== null}
        title="Choose Rukn"
        onClose={() => {
          setPendingKarkunId(null)
          setRuknId('')
          setError('')
        }}
      >
        {pendingKarkun && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Connect <span className="font-semibold text-text-heading">{pendingKarkun.name}</span>{' '}
              with:
            </p>
            <div className="grid gap-2">
              {ruknOptions.map((rukn) => (
                <button
                  key={rukn.id}
                  type="button"
                  onClick={() => setRuknId(rukn.id)}
                  className={`min-h-11 rounded-lg border px-4 py-2 text-left text-sm transition-colors ${
                    ruknId === rukn.id
                      ? 'border-primary bg-primary/5 font-semibold text-text-heading'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  {rukn.name} · {rukn.gender}
                </button>
              ))}
            </div>
            {ruknOptions.length === 0 && (
              <p className="text-sm text-secondary">No compatible active Rukns found.</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <PrimaryButton type="button" fullWidth disabled={!ruknId} onClick={handleAssign}>
              Confirm Connection
            </PrimaryButton>
          </div>
        )}
      </Modal>
    </>
  )
}
