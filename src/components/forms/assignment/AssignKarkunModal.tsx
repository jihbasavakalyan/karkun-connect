import { useMemo, useState } from 'react'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { getCompatibleRuknsForKarkun } from '@/lib/peopleStore'
import { getRuknAssignmentSummary } from '@/services/assignmentService'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import { AvailableKarkunRow, KarkunSearchField } from '@/components/relationship'
import { Modal, ModalFormFooter, ModalFormSection } from '@/components/common'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { PersonGender } from '@/types/karkun-registry.types'

type AssignKarkunModalProps = {
  isOpen: boolean
  onClose: () => void
  genderFilter?: PersonGender
}

export function AssignKarkunModal({ isOpen, onClose, genderFilter }: AssignKarkunModalProps) {
  const { assignmentVersion, getAvailableKarkunan, assignKarkun } = useAssignmentEngine()
  const availableKarkunan = useMemo(
    () =>
      getAvailableKarkunan().filter((k) => !genderFilter || k.gender === genderFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- assignmentVersion includes people hydrate
    [assignmentVersion, genderFilter, getAvailableKarkunan],
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
    setQuery('')
    onClose()
  }

  const handleCancelRuknStep = () => {
    setPendingKarkunId(null)
    setRuknId('')
    setError('')
  }

  return (
    <>
      <Modal
        isOpen={isOpen && !pendingKarkun}
        title="Connect Karkun"
        onClose={handleClose}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <SecondaryButton type="button" onClick={handleClose}>
              Cancel
            </SecondaryButton>
          </div>
        }
      >
        <div className="space-y-6">
          <ModalFormSection title="Connection">
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                {availableKarkunan.length} available Karkun
                {availableKarkunan.length === 1 ? '' : 's'}
                {genderFilter ? ` (${genderFilter})` : ''}. Search filters the list live.
              </p>

              <KarkunSearchField
                id="assign-karkun-modal-search"
                value={query}
                onChange={setQuery}
                resultCount={query.trim() ? filtered.length : undefined}
              />

              <div className="overflow-hidden rounded-xl border border-border">
                <ul className="max-h-[min(40vh,16rem)] space-y-0 overflow-y-auto overscroll-contain sm:max-h-[18rem]">
                  {filtered.map((karkun) => (
                    <li key={karkun.id} className="border-b border-border p-2 last:border-b-0">
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
                  <p className="px-4 py-6 text-center text-sm text-secondary">
                    {availableKarkunan.length === 0
                      ? 'No available Karkuns to connect.'
                      : 'No Karkuns match your search. Clear the search to see the full list.'}
                  </p>
                )}
              </div>

              {genderFilter && (
                <p className="text-xs text-secondary">
                  Only {genderFilter} Karkuns can be connected to {genderFilter} Rukns.
                </p>
              )}
            </div>
          </ModalFormSection>
        </div>
      </Modal>

      <Modal
        isOpen={pendingKarkun !== null}
        title="Choose Rukn"
        onClose={handleCancelRuknStep}
        footer={
          <ModalFormFooter
            onCancel={handleCancelRuknStep}
            primaryLabel="Confirm Connection"
            onPrimaryClick={handleAssign}
            primaryDisabled={!ruknId}
          />
        }
      >
        {pendingKarkun && (
          <div className="space-y-6">
            <ModalFormSection title="Connection">
              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  Connect <span className="font-semibold text-text-heading">{pendingKarkun.name}</span>{' '}
                  with:
                </p>
                <div className="grid max-h-[min(40vh,14rem)] gap-2 overflow-y-auto overscroll-contain md:grid-cols-2">
                  {ruknOptions.map((rukn) => {
                    const connectedCount = getRuknAssignmentSummary(rukn.id).assignedKarkunCount
                    return (
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
                        <span className="block">
                          {rukn.id} – {rukn.name}
                        </span>
                        <span className="mt-0.5 block text-xs font-normal text-secondary">
                          Connected Karkuns: {connectedCount}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {ruknOptions.length === 0 && (
                  <p className="text-sm text-secondary">No compatible active Rukns found.</p>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </ModalFormSection>
          </div>
        )}
      </Modal>
    </>
  )
}
