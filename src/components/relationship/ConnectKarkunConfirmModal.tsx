import { Modal, ModalFormFooter, ModalFormGrid, ModalFormSection } from '@/components/common'
import { OPTIONAL_PROFILE_UNAVAILABLE_WARNING } from '@/lib/assignment/operatorFacingError'
import { fatherHusbandLabel } from '@/lib/relationshipPresentation'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type ConnectKarkunConfirmModalProps = {
  isOpen: boolean
  karkun: KarkunRegistryRecord | null
  ruknName?: string
  error?: string
  loading?: boolean
  onClose: () => void
  onConfirm: () => void
}

/** Required for Confirm: identity + mobile (assignment validation). */
export function hasRequiredConnectData(karkun: KarkunRegistryRecord): boolean {
  return Boolean(karkun.id?.trim() && karkun.name?.trim() && karkun.mobile?.trim())
}

/** Optional profile fields shown under Additional Information. */
export function hasOptionalAdditionalInfo(karkun: KarkunRegistryRecord): boolean {
  return Boolean(karkun.area?.trim() || karkun.place?.trim())
}

export function ConnectKarkunConfirmModal({
  isOpen,
  karkun,
  ruknName,
  error,
  loading = false,
  onClose,
  onConfirm,
}: ConnectKarkunConfirmModalProps) {
  if (!karkun) {
    return null
  }

  const canConfirm = hasRequiredConnectData(karkun)
  const additionalAvailable = hasOptionalAdditionalInfo(karkun)
  // KC-0060.2 — never treat FRIENDLY_DATA_ACCESS_ERROR as a connection blocker.
  const legacyOptionalLoadError = Boolean(
    error?.toLowerCase().includes('unable to load additional information'),
  )
  const blockingError = error && !legacyOptionalLoadError ? error : undefined

  return (
    <Modal
      isOpen={isOpen}
      title="Connect Karkun"
      onClose={loading ? () => undefined : onClose}
      footer={
        <ModalFormFooter
          onCancel={onClose}
          primaryLabel="Confirm Connection"
          onPrimaryClick={onConfirm}
          primaryDisabled={!canConfirm}
          loading={loading}
          error={blockingError}
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
          {additionalAvailable ? (
            <ModalFormGrid>
              <div>
                <p className="text-sm text-secondary">Area</p>
                <p className="break-words">{karkun.area || karkun.place}</p>
              </div>
            </ModalFormGrid>
          ) : null}
          {!additionalAvailable || legacyOptionalLoadError ? (
            <p className="text-sm text-amber-800" role="status">
              {OPTIONAL_PROFILE_UNAVAILABLE_WARNING}
            </p>
          ) : null}
        </ModalFormSection>

        {!canConfirm && (
          <p className="text-sm text-red-600" role="alert">
            Name and mobile are required before connecting.
          </p>
        )}
      </div>
    </Modal>
  )
}
