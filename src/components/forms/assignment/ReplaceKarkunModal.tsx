import { useMemo, useState } from 'react'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { RELEASE_REASON_OPTIONS, getReleaseReasonLabel, type ReleaseReason } from '@/types/assignment.types'
import { Modal, ModalFormFooter, ModalFormGrid, ModalFormSection } from '@/components/common'

type ReplaceKarkunModalProps = {
  isOpen: boolean
  currentKarkunId: string
  currentKarkunName: string
  ruknId: string
  onClose: () => void
  onComplete: () => void
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function ReplaceKarkunModal({
  isOpen,
  currentKarkunId,
  currentKarkunName,
  ruknId,
  onClose,
  onComplete,
}: ReplaceKarkunModalProps) {
  const { assignmentVersion, getAvailableKarkunan, replaceKarkun } = useAssignmentEngine()
  const availableKarkunan = useMemo(
    () => getAvailableKarkunan(ruknId),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- assignmentVersion includes people hydrate
    [assignmentVersion, getAvailableKarkunan, ruknId],
  )
  const [step, setStep] = useState<'release' | 'select'>('release')
  const [reason, setReason] = useState<ReleaseReason>('Wrong Assignment')
  const [newKarkunId, setNewKarkunId] = useState('')
  const [error, setError] = useState('')

  const handleReleaseStep = () => {
    setStep('select')
  }

  const handleConfirm = () => {
    if (!newKarkunId) {
      setError('Please select a new Karkun.')
      return
    }

    const result = replaceKarkun(currentKarkunId, newKarkunId, ruknId, reason, 'Rukn')
    if (!result.success) {
      setError(result.error)
      return
    }

    setStep('release')
    setNewKarkunId('')
    setError('')
    onComplete()
    onClose()
  }

  const handleClose = () => {
    setStep('release')
    setError('')
    onClose()
  }

  const footer =
    step === 'release' ? (
      <ModalFormFooter
        onCancel={handleClose}
        primaryLabel="Continue to Available Karkun"
        onPrimaryClick={handleReleaseStep}
      />
    ) : (
      <ModalFormFooter
        onCancel={() => setStep('release')}
        primaryLabel="Confirm Replacement"
        onPrimaryClick={handleConfirm}
      />
    )

  return (
    <Modal isOpen={isOpen} title="Replace Karkun" onClose={handleClose} footer={footer}>
      {step === 'release' ? (
        <div className="space-y-6">
          <ModalFormSection title="Basic Information">
            <p className="text-secondary">
              Current Karkun:{' '}
              <span className="font-semibold text-text-heading">{currentKarkunName}</span>
            </p>
            <p className="text-sm text-secondary">
              First disconnect the current Karkun, then select a new Karkun.
            </p>
          </ModalFormSection>

          <ModalFormSection title="Additional Information">
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-text-heading">Release Reason</legend>
              <ModalFormGrid>
                {RELEASE_REASON_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-2"
                  >
                    <input
                      type="radio"
                      name="replace-reason"
                      value={option}
                      checked={reason === option}
                      onChange={() => setReason(option)}
                      className="h-4 w-4 text-primary"
                    />
                    <span className="text-sm text-text-heading">{getReleaseReasonLabel(option)}</span>
                  </label>
                ))}
              </ModalFormGrid>
            </fieldset>
          </ModalFormSection>
        </div>
      ) : (
        <div className="space-y-6">
          <ModalFormSection title="Connection">
            <div className="space-y-4">
              <p className="text-sm text-secondary">Select a new Karkun from the Available pool.</p>

              <select
                value={newKarkunId}
                onChange={(event) => setNewKarkunId(event.target.value)}
                className={selectClassName}
              >
                <option value="">Choose Karkun...</option>
                {availableKarkunan.map((karkun) => (
                  <option key={karkun.id} value={karkun.id}>
                    {karkun.name} · {karkun.area}
                  </option>
                ))}
              </select>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </ModalFormSection>
        </div>
      )}
    </Modal>
  )
}
