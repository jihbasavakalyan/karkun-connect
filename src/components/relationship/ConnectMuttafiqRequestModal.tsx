/**
 * Increment A — Rukn requests Admin approval to link an existing Muttafiq.
 * Does not create a person and does not write campaign connections.
 */

import { useState } from 'react'
import { Modal, ModalFormFooter } from '@/components/common'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { getRuknById } from '@/data/ruknMaster'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import { getAllMuttafiqeen } from '@/lib/peopleStore'
import { mobilesMatch, normalizeMobile } from '@/lib/mobileValidation'
import { submitMuttafiqRuknLinkRequest } from '@/services/karkunRequestService'
import { useAuth } from '@/hooks/useAuth'

type ConnectMuttafiqRequestModalProps = {
  isOpen: boolean
  ruknId: string
  onClose: () => void
  onSubmitted: () => void
}

export function ConnectMuttafiqRequestModal({
  isOpen,
  ruknId,
  onClose,
  onSubmitted,
}: ConnectMuttafiqRequestModalProps) {
  const { user } = useAuth()
  const ruknName = getRuknById(ruknId)?.name ?? ruknId
  const [mobile, setMobile] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const { busy: submitting, progressMessage, run } = useWriteLifecycle()

  const reset = () => {
    setMobile('')
    setRemarks('')
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = () => {
    setError('')
    const normalized = normalizeMobile(mobile)
    const match = getAllMuttafiqeen().find((person) => mobilesMatch(person.mobile, normalized))
    if (!match) {
      setError('No Muttafiq found with this mobile number.')
      return
    }

    void run({
      key: `muttafiq-rukn-link-submit:${ruknId}:${match.id}`,
      queueLabels: ['settings.karkunRequests'],
      work: async () => {
        const result = await submitMuttafiqRuknLinkRequest({
          personId: match.id,
          requestingRuknId: ruknId,
          remarks,
          createdBy: user?.displayName ?? user?.uid ?? ruknName,
        })
        if (!result.ok) {
          setError(result.error)
          throw Object.assign(new Error(result.error), { code: result.code ?? 'unknown' })
        }
        return result
      },
    }).then((lifecycle) => {
      if (!lifecycle?.ok) return
      reset()
      onSubmitted()
      onClose()
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Connect Muttafiq"
      onClose={handleClose}
      size="md"
      footer={
        <ModalFormFooter
          onCancel={handleClose}
          primaryLabel={
            submitting ? progressMessage || 'محفوظ کیا جا رہا ہے...' : 'Submit Request'
          }
          onPrimaryClick={() => handleSubmit()}
          primaryDisabled={submitting}
        />
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-secondary">
          Request Admin approval to link an existing Muttafiq to{' '}
          <span className="font-semibold text-text-heading">{ruknName}</span>. The person stays a
          Muttafiq — this is not a campaign Karkun connection.
        </p>
        {error ? (
          <div className="ds-banner-error" role="alert">
            {error}
          </div>
        ) : null}
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Muttafiq mobile</span>
          <input
            className={FORM_INPUT_CLASS}
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            disabled={submitting}
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Notes (optional)</span>
          <input
            className={FORM_INPUT_CLASS}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            disabled={submitting}
          />
        </label>
      </div>
    </Modal>
  )
}
