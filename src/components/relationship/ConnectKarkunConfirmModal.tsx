import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
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
      size="lg"
      footer={
        <div className="flex flex-col gap-3">
          <PrimaryButton type="button" fullWidth onClick={onConfirm}>
            Confirm Connection
          </PrimaryButton>
          <SecondaryButton type="button" fullWidth onClick={onClose}>
            Cancel
          </SecondaryButton>
        </div>
      }
    >
      <div className="space-y-4 overflow-y-auto">
        <p className="text-secondary">
          {ruknName
            ? `Connect ${karkun.name} with ${ruknName}?`
            : 'Do you want to connect with this Karkun?'}
        </p>
        <dl className="space-y-2 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm">
          <div>
            <dt className="text-secondary">Name</dt>
            <dd className="font-semibold text-text-heading break-words">{karkun.name}</dd>
          </div>
          {karkun.fatherHusbandName?.trim() && (
            <div>
              <dt className="text-secondary">{fatherHusbandLabel(karkun.gender)}</dt>
              <dd className="break-words">{karkun.fatherHusbandName}</dd>
            </div>
          )}
          <div>
            <dt className="text-secondary">Mobile</dt>
            <dd className="break-words">{karkun.mobile || 'Not added'}</dd>
          </div>
          <div>
            <dt className="text-secondary">Area</dt>
            <dd className="break-words">{karkun.area || karkun.place}</dd>
          </div>
        </dl>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
