import { useState } from 'react'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { ContactActionBar } from '@/components/common/ContactActionBar'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type AvailableKarkunCardProps = {
  karkun: KarkunRegistryRecord
  ruknId: string
}

export function AvailableKarkunCard({ karkun, ruknId }: AvailableKarkunCardProps) {
  const { assignKarkun } = useAssignmentEngine()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = () => {
    const result = assignKarkun(karkun.id, ruknId, 'Rukn')
    if (!result.success) {
      setError(result.error)
      return
    }
    setConfirmOpen(false)
    setError('')
  }

  return (
    <>
      <article className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">{karkun.name}</h2>
        <dl className="mt-3 space-y-1 text-sm text-secondary">
          {karkun.fatherHusbandName?.trim() && (
            <div>
              <dt className="sr-only">{karkun.gender === 'Female' ? 'Husband' : 'Father'}</dt>
              <dd>
                {karkun.gender === 'Female' ? 'Husband' : 'Father'}: {karkun.fatherHusbandName}
              </dd>
            </div>
          )}
          <div>
            <dt className="sr-only">Area</dt>
            <dd>{karkun.area || karkun.place}</dd>
          </div>
          <div>
            <dt className="sr-only">Mobile</dt>
            <dd>{karkun.mobile || 'Mobile Not Added'}</dd>
          </div>
        </dl>
        {karkun.mobile.trim() && (
          <div className="mt-3">
            <ContactActionBar
              name={karkun.name}
              mobile={karkun.mobile}
              whatsapp={karkun.whatsapp}
              size="sm"
            />
          </div>
        )}
        <div className="mt-4">
          <PrimaryButton type="button" fullWidth onClick={() => setConfirmOpen(true)}>
            Connect Karkun
          </PrimaryButton>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </article>

      <Modal
        isOpen={confirmOpen}
        title="Connect Karkun"
        onClose={() => setConfirmOpen(false)}
        footer={
          <div className="flex flex-col gap-3">
            <PrimaryButton type="button" fullWidth onClick={handleConfirm}>
              Confirm
            </PrimaryButton>
            <SecondaryButton type="button" fullWidth onClick={() => setConfirmOpen(false)}>
              Cancel
            </SecondaryButton>
          </div>
        }
      >
        <p className="text-secondary">
          Do you want to connect with this Karkun?
        </p>
        <p className="mt-2 font-semibold text-text-heading">{karkun.name}</p>
      </Modal>
    </>
  )
}
