/**
 * Rukn form to submit a discovered worker for Admin approval (KC-018 / KC-0068).
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
  const [submitting, setSubmitting] = useState(false)
  const [nameWarning, setNameWarning] = useState(false)
  const [nameMatches, setNameMatches] = useState<{ id: string; name: string }[]>([])
  const [duplicate, setDuplicate] = useState<{
    name: string
    mobile: string
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
    setNameWarning(false)
    setNameMatches([])
    setDuplicate(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = (acknowledgeNameWarning = false) => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    void (async () => {
      try {
        const result = await submitNewKarkunRequest({
          fullName,
          mobile,
          gender,
          area,
          remarks,
          requestingRuknId: ruknId,
          acknowledgeNameWarning,
        })

        if (!result.ok) {
          setError(result.error)
          setDuplicate(
            result.duplicate
              ? {
                  name: result.duplicate.name,
                  mobile: result.duplicate.mobile,
                  viewRoute: result.duplicate.viewRoute,
                  connectRoute: result.duplicate.connectRoute,
                }
              : null,
          )
          setNameWarning(result.code === 'NAME_WARNING')
          setNameMatches(result.nameMatches ?? [])
          return
        }

        reset()
        onSubmitted()
        onClose()
      } finally {
        setSubmitting(false)
      }
    })()
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
          primaryLabel={
            submitting ? 'Submitting…' : nameWarning ? 'Continue anyway' : 'Submit'
          }
          primaryDisabled={submitting}
          onPrimaryClick={() => handleSubmit(nameWarning)}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Submit a worker who is not yet in the registry. An administrator must approve before
          they are added and connected.
        </p>

        {error ? (
          <div
            className={
              nameWarning
                ? 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950'
                : 'ds-banner-error'
            }
            role="alert"
          >
            <p>{error}</p>
            {duplicate ? (
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  <span className="font-medium">Existing Name: </span>
                  {duplicate.name}
                </p>
                <p>
                  <span className="font-medium">Mobile Number: </span>
                  {duplicate.mobile}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    to={duplicate.viewRoute}
                    className="text-sm font-semibold text-primary underline"
                  >
                    View Existing Record
                  </Link>
                  <Link
                    to={duplicate.connectRoute}
                    className="text-sm font-semibold text-primary underline"
                  >
                    Connect Existing
                  </Link>
                </div>
              </div>
            ) : null}
            {nameWarning && nameMatches.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-sm">
                {nameMatches.slice(0, 5).map((match) => (
                  <li key={match.id}>{match.name}</li>
                ))}
              </ul>
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
            onChange={(event) => {
              setFullName(event.target.value)
              setNameWarning(false)
              setNameMatches([])
              setError('')
              setDuplicate(null)
            }}
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
            onChange={(event) => {
              setMobile(event.target.value)
              setNameWarning(false)
              setNameMatches([])
              setError('')
              setDuplicate(null)
            }}
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
