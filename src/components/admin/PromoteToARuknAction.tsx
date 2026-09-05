import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '@/components/forms/people'
import { ROUTES } from '@/constants/routes'
import { canOfferARuknPromotion } from '@/lib/aRuknPromotionUi'
import { UI_LABELS } from '@/lib/uiTerminology'
import { promoteKarkunToARukn } from '@/services/aRuknPromotionService'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type PromoteToARuknActionProps = {
  person: KarkunRegistryRecord
  variant?: 'inline' | 'button'
  onSuccess?: (aRuknId: string, sourcePersonId: string) => void
}

export function PromoteToARuknAction({
  person,
  variant = 'inline',
  onSuccess,
}: PromoteToARuknActionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [successId, setSuccessId] = useState('')

  if (successId) {
    return (
      <p className="text-sm text-secondary" role="status">
        Now {UI_LABELS.aRukn}{' '}
        <Link to={ROUTES.ADMIN_A_RUKN} className="font-medium text-primary hover:underline">
          {successId}
        </Link>
      </p>
    )
  }

  if (!canOfferARuknPromotion(person)) {
    return null
  }

  const openConfirm = () => {
    if (pending) return
    setError('')
    setConfirmOpen(true)
  }

  const runPromotion = () => {
    if (pending) return
    setPending(true)
    setError('')
    void (async () => {
      const result = await promoteKarkunToARukn(person.id)
      setPending(false)
      if (!result.success) {
        setError(result.error)
        return
      }
      setConfirmOpen(false)
      setSuccessId(result.aRuknId)
      onSuccess?.(result.aRuknId, result.sourcePersonId)
    })()
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {variant === 'button' ? (
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-primary hover:border-primary"
          disabled={pending}
          onClick={openConfirm}
        >
          {UI_LABELS.promoteToARukn}
        </button>
      ) : (
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
          disabled={pending}
          onClick={openConfirm}
        >
          {UI_LABELS.promoteToARukn}
        </button>
      )}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={UI_LABELS.promoteToARukn}
        confirmLabel={pending ? 'Promoting…' : UI_LABELS.promoteToARukn}
        confirmDisabled={pending}
        confirmLoading={pending}
        message={
          <>
            <p>
              <strong>{person.name}</strong> will become an independent {UI_LABELS.aRukn} and will
              no longer be a normal Karkun.
            </p>
            <p className="mt-2">
              Existing active campaign assignments will end. Historical records remain preserved
              and are not deleted.
            </p>
            <p className="mt-2">Login access continues to use the existing first-sign-in path.</p>
          </>
        }
        onConfirm={runPromotion}
        onClose={() => {
          if (!pending) setConfirmOpen(false)
        }}
      />
    </div>
  )
}
