import { Modal, ModalFormFooter, ModalFormGrid, ModalFormSection } from '@/components/common'
import { fatherHusbandLabel } from '@/lib/relationshipPresentation'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type ConnectKarkunConfirmModalProps = {
  isOpen: boolean
  karkun: KarkunRegistryRecord | null
  ruknName?: string
  error?: string
  onClose: () => void
  onConfirm: () => void
}

export function ConnectKarkunConfirmModal({
  isOpen,
  karkun,
  ruknName,
  error,
  onClose,
  onConfirm,
}: ConnectKarkunConfirmModalProps) {
  if (!karkun) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Connect Karkun"
      onClose={onClose}
      footer={
        <ModalFormFooter
          onCancel={onClose}
          primaryLabel="Confirm Connection"
          onPrimaryClick={onConfirm}
        />
      }
    >
      <div className="space-y-6">
        <p className="text-secondary">
          {ruknName
            ? `Connect ${karkun.name} with ${ruknName}?`
            : 'Do you want to connect with this Karkun?'}
        </p>

        <ModalFormSection title="Basic Information">
          <ModalFormGrid>
            <div>
              <p className="text-sm text-secondary">Name</p>
              <p className="font-semibold break-words text-text-heading">{karkun.name}</p>
            </div>
            {karkun.fatherHusbandName?.trim() && (
              <div>
                <p className="text-sm text-secondary">{fatherHusbandLabel(karkun.gender)}</p>
                <p className="break-words">{karkun.fatherHusbandName}</p>
              </div>
            )}
          </ModalFormGrid>
        </ModalFormSection>

        <ModalFormSection title="Contact Information">
          <ModalFormGrid>
            <div>
              <p className="text-sm text-secondary">Mobile</p>
              <p className="break-words">{karkun.mobile || 'Not added'}</p>
            </div>
          </ModalFormGrid>
        </ModalFormSection>

        <ModalFormSection title="Additional Information">
          <ModalFormGrid>
            <div>
              <p className="text-sm text-secondary">Area</p>
              <p className="break-words">{karkun.area || karkun.place}</p>
            </div>
          </ModalFormGrid>
        </ModalFormSection>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
