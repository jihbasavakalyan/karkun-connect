import { useMemo, useState } from 'react'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { getKarkunsForRuknAssignment } from '@/services/assignmentService'
import { matchesKarkunRegistrySearch } from '@/lib/relationshipPresentation'
import { Modal, ModalFormFooter, ModalFormGrid, ModalFormSection } from '@/components/common'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { KarkunSearchField } from '@/components/relationship'
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

export function AssignRuknModal({
  isOpen,
  rukn,
  onClose,
  onSubmit,
  error,
}: AssignRuknModalProps) {
  const peopleVersion = usePeopleStore()
  const [karkunId, setKarkunId] = useState('')
  const [search, setSearch] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')
  const [localError, setLocalError] = useState('')

  const eligibleKarkuns = useMemo(
    () => (rukn ? getKarkunsForRuknAssignment(rukn.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registry is module state
    [rukn, peopleVersion],
  )

  const filteredKarkuns = useMemo(
    () => eligibleKarkuns.filter((karkun) => matchesKarkunRegistrySearch(karkun, search)),
    [eligibleKarkuns, search],
  )

  const handleSubmit = () => {
    if (!karkunId) {
      setLocalError('Please select a Karkun before connecting.')
      return
    }
    setLocalError('')
    onSubmit({ karkunId, effectiveFrom, remarks: remarks || undefined })
  }

  const handleClose = () => {
    setKarkunId('')
    setSearch('')
    setRemarks('')
    setLocalError('')
    setEffectiveFrom(new Date().toISOString().slice(0, 10))
    onClose()
  }

  if (!rukn) return null

  return (
    <Modal
      isOpen={isOpen}
      title={`Connect Karkun to ${rukn.name}`}
      onClose={handleClose}
      footer={
        <ModalFormFooter
          onCancel={handleClose}
          primaryLabel="Connect"
          onPrimaryClick={handleSubmit}
          primaryDisabled={eligibleKarkuns.length === 0}
        />
      }
    >
      <div className="space-y-6">
        <ModalFormSection title="Connection">
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              {eligibleKarkuns.length} eligible {rukn.gender.toLowerCase()} Karkun
              {eligibleKarkuns.length === 1 ? '' : 's'} available. One Karkun may connect to only one
              Rukn.
            </p>

            <KarkunSearchField
              id="assign-rukn-modal-search"
              value={search}
              onChange={(value) => {
                setSearch(value)
                setLocalError('')
              }}
              resultCount={search.trim() ? filteredKarkuns.length : undefined}
              placeholder="Search by name, mobile, area, or ID…"
            />

            <div className="overflow-hidden rounded-xl border border-border">
              <ul
                className="max-h-[min(40vh,16rem)] divide-y divide-border overflow-y-auto overscroll-contain sm:max-h-[18rem]"
                role="listbox"
                aria-label="Eligible Karkuns"
              >
                {filteredKarkuns.map((karkun) => {
                  const selected = karkunId === karkun.id
                  return (
                    <li key={karkun.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setKarkunId(karkun.id)
                          setLocalError('')
                        }}
                        className={[
                          'flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors',
                          selected
                            ? 'bg-primary/10 ring-inset ring-2 ring-primary'
                            : 'hover:bg-surface-muted',
                        ].join(' ')}
                      >
                        <span className="font-semibold text-text-heading">{karkun.name}</span>
                        <span className="text-sm text-secondary">
                          {karkun.mobile || 'No mobile'}
                          {karkun.area || karkun.place
                            ? ` · ${karkun.area || karkun.place}`
                            : ''}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {filteredKarkuns.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-secondary">
                  {eligibleKarkuns.length === 0
                    ? 'No available Karkuns match this Rukn. Check gender compatibility and mobile numbers.'
                    : 'No Karkuns match your search. Clear the search to see the full list.'}
                </p>
              )}
            </div>
          </div>
        </ModalFormSection>

        <ModalFormSection title="Additional Information">
          <ModalFormGrid>
            <InputField
              id="assign-effective-from"
              label="Effective From"
              type="date"
              value={effectiveFrom}
              onValueChange={setEffectiveFrom}
              required
            />
            <div className="md:col-span-2">
              <TextAreaField
                id="assign-remarks"
                label="Remarks (optional)"
                value={remarks}
                onValueChange={setRemarks}
                rows={2}
              />
            </div>
          </ModalFormGrid>
        </ModalFormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {localError && <p className="text-sm text-red-600">{localError}</p>}
      </div>
    </Modal>
  )
}
