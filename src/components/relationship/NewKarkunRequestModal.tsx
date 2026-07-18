/**
 * Rukn form to submit a discovered worker for Admin approval (KC-018).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal, ModalFormFooter } from '@/components/common'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { getRuknById } from '@/data/ruknMaster'
import { normalizePersonGender } from '@/lib/peopleStore'
import { submitNewKarkunRequest } from '@/services/karkunRequestService'
import type { PersonGender } from '@/types/people.types'

type NewKarkunRequestModalProps = {
  isOpen: boolean
  ruknId: string
  onClose: () => void
  onSubmitted: () => void
}

export function NewKarkunRequestModal({
  isOpen,
  ruknId,
  onClose,
  onSubmitted,
}: NewKarkunRequestModalProps) {
  const ruknGender = normalizePersonGender(getRuknById(ruknId)?.gender) ?? 'Male'
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [gender, setGender] = useState<PersonGender>(ruknGender)
  const [area, setArea] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [duplicate, setDuplicate] = useState<{
    name: string
    viewRoute: string
    connectRoute: string
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setGender(ruknGender)
    }
  }, [isOpen, ruknGender])

  const reset = () => {
    setFullName('')
    setMobile('')
    setGender(ruknGender)
    setArea('')
    setRemarks('')
    setError('')
    setDuplicate(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = () => {
    const result = submitNewKarkunRequest({
      fullName,
      mobile,
      gender,
      area,
      remarks,
      requestingRuknId: ruknId,
    })

    if (!result.ok) {
      setError(result.error)
      setDuplicate(result.duplicate ?? null)
      return
    }

    reset()
    onSubmitted()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Add New Karkun"
      onClose={handleClose}
      size="md"
      footer={
        <ModalFormFooter
          onCancel={handleClose}
          primaryLabel="Submit"
          onPrimaryClick={handleSubmit}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Submit a worker who is not yet in the registry. An administrator must approve before
          they are added and connected.
        </p>

        {error ? (
          <div className="ds-banner-error" role="alert">
            <p>{error}</p>
            {duplicate ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={duplicate.viewRoute} className="text-sm font-semibold text-primary underline">
                  View Existing
                </Link>
                <Link
                  to={duplicate.connectRoute}
                  className="text-sm font-semibold text-primary underline"
                >
                  Connect Existing
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className={FORM_LABEL_CLASS} htmlFor="new-karkun-name">
            Full Name *
          </label>
          <input
            id="new-karkun-name"
            className={FORM_INPUT_CLASS}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className={FORM_LABEL_CLASS} htmlFor="new-karkun-mobile">
            Mobile Number *
          </label>
          <input
            id="new-karkun-mobile"
            className={FORM_INPUT_CLASS}
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            inputMode="numeric"
            autoComplete="tel"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className={FORM_LABEL_CLASS} htmlFor="new-karkun-gender">
            Gender *
          </label>
          <select
            id="new-karkun-gender"
            className={FORM_INPUT_CLASS}
            value={gender}
            onChange={(event) => setGender(event.target.value as PersonGender)}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className={FORM_LABEL_CLASS} htmlFor="new-karkun-area">
            Area / Mohalla
          </label>
          <input
            id="new-karkun-area"
            className={FORM_INPUT_CLASS}
            value={area}
            onChange={(event) => setArea(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className={FORM_LABEL_CLASS} htmlFor="new-karkun-remarks">
            Remarks (optional)
          </label>
          <textarea
            id="new-karkun-remarks"
            className={`${FORM_INPUT_CLASS} min-h-24`}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
