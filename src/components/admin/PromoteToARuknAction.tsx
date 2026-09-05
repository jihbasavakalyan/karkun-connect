import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '@/components/forms/people'
import { ROUTES } from '@/constants/routes'
import {
  canOfferARuknPromotion,
  isDurableARuknPromotionSuccess,
  settleARuknPromotionAttempt,
} from '@/lib/aRuknPromotionUi'
import { UI_LABELS } from '@/lib/uiTerminology'
import { promoteKarkunToARukn } from '@/services/aRuknPromotionService'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type PromoteToARuknTriggerProps = {
  person: KarkunRegistryRecord
  variant?: 'inline' | 'button'
  disabled?: boolean
  onRequest: (person: KarkunRegistryRecord) => void
}

export function PromoteToARuknTrigger({
  person,
  variant = 'inline',
  disabled = false,
  onRequest,
}: PromoteToARuknTriggerProps) {
  if (!canOfferARuknPromotion(person)) {
    return null
  }

  const busy = disabled
  if (variant === 'button') {
    return (
      <button
        type="button"
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-primary hover:border-primary"
        disabled={busy}
        onClick={() => {
          if (busy) return
          onRequest(person)
        }}
      >
        {UI_LABELS.promoteToARukn}
      </button>
    )
  }

  return (
    <button
      type="button"
      className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
      disabled={busy}
      onClick={() => {
        if (busy) return
        onRequest(person)
      }}
    >
      {UI_LABELS.promoteToARukn}
    </button>
  )
}

type PromoteToARuknSessionProps = {
  person: KarkunRegistryRecord | null
  onSuccess?: (aRuknId: string, sourcePersonId: string) => void
  onDismiss: () => void
  onPendingChange?: (pending: boolean) => void
}

export function PromoteToARuknSession({
  person,
  onSuccess,
  onDismiss,
  onPendingChange,
}: PromoteToARuknSessionProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [successId, setSuccessId] = useState('')

  const setPendingState = (next: boolean) => {
    setPending(next)
    onPendingChange?.(next)
  }

  if (!person && !pending && !successId && !error) {
    return null
  }

  const displayPerson = person
  const confirmOpen = Boolean(displayPerson) && !successId

  const runPromotion = () => {
    if (!displayPerson || pending) return
    setPendingState(true)
    setError('')
    void (async () => {
      try {
        const result = await settleARuknPromotionAttempt(() =>
          promoteKarkunToARukn(displayPerson.id),
        )
        if (!isDurableARuknPromotionSuccess(result)) {
          setError(result.error)
          return
        }
        setSuccessId(result.aRuknId)
        onSuccess?.(result.aRuknId, result.sourcePersonId)
      } finally {
        setPendingState(false)
      }
    })()
  }

  if (successId) {
    return (
      <div className="flex flex-col items-start gap-1">
        <p className="text-sm text-secondary" role="status">
          Now {UI_LABELS.aRukn}{' '}
          <Link to={ROUTES.ADMIN_A_RUKN} className="font-medium text-primary hover:underline">
            {successId}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
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
              <strong>{displayPerson?.name ?? 'This Karkun'}</strong> will become an independent{' '}
              {UI_LABELS.aRukn} and will no longer be a normal Karkun.
            </p>
            <p className="mt-2">
              Existing active campaign assignments will end. Historical records remain preserved
              and are not deleted.
            </p>
            <p className="mt-2">
              This is an Administrator-controlled promotion. A Rukn referral is not required.
            </p>
            <p className="mt-2">Login access continues to use the existing first-sign-in path.</p>
            {error ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </>
        }
        onConfirm={runPromotion}
        onClose={() => {
          if (pending) return
          onDismiss()
        }}
      />
    </div>
  )
}

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
  const [target, setTarget] = useState<KarkunRegistryRecord | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <div className="flex flex-col items-start gap-1">
      <PromoteToARuknTrigger
        person={person}
        variant={variant}
        disabled={pending}
        onRequest={setTarget}
      />
      <PromoteToARuknSession
        key={target?.id ?? 'idle'}
        person={target}
        onPendingChange={setPending}
        onSuccess={onSuccess}
        onDismiss={() => setTarget(null)}
      />
    </div>
  )
}
