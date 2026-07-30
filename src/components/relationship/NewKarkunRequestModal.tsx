/**
 * Rukn form to submit a discovered worker for Admin approval (KC-018 / KC-0068).
 */

import { useState } from 'react'
import { Modal, ModalFormFooter } from '@/components/common'
import { ExistingPersonFoundPanel } from '@/components/relationship/ExistingPersonFoundPanel'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { getRuknById } from '@/data/ruknMaster'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import { normalizePersonGender } from '@/lib/peopleStore'
import { submitNewKarkunRequest, type MobileDuplicateDetails } from '@/services/karkunRequestService'
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
  const [genderOverride, setGenderOverride] = useState<PersonGender | null>(null)
  const gender = genderOverride ?? ruknGender
  const [area, setArea] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [nameWarning, setNameWarning] = useState(false)
  const [nameMatches, setNameMatches] = useState<{ id: string; name: string }[]>([])
  const [duplicate, setDuplicate] = useState<MobileDuplicateDetails | null>(null)
  const { busy: submitting, progressMessage, run } = useWriteLifecycle()

  const reset = () => {
    setFullName('')
    setMobile('')
    setGenderOverride(null)
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
    setError('')
    void run({
      key: `new-karkun-submit:${ruknId}`,
      queueLabels: ['settings.karkunRequests'],
      work: async () => {
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
          setDuplicate(result.duplicate ?? null)
          setNameWarning(result.code === 'NAME_WARNING')
          setNameMatches(result.nameMatches ?? [])
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
      title="Add New Karkun"
      onClose={handleClose}
      size="md"
      footer={
        <ModalFormFooter
          onCancel={handleClose}
          primaryLabel={
            submitting
              ? progressMessage || 'محفوظ کیا جا رہا ہے...'
              : nameWarning
                ? 'Continue anyway'
                : 'Submit'
          }
          primaryDisabled={submitting}
          onPrimaryClick={() => handleSubmit(nameWarning)}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Submit a worker who is not yet in the registry. People (Admin) must approve before they
          are added and Connected.
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
            {duplicate ? <ExistingPersonFoundPanel duplicate={duplicate} /> : null}
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
            onChange={(event) => setGenderOverride(event.target.value as PersonGender)}
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
