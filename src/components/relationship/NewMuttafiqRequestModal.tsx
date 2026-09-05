/**
 * KC-0123 — Independent Add Muttafiq request modal (not shared with Add Karkun).
 */

import { useState } from 'react'
import { Modal, ModalFormFooter } from '@/components/common'
import { ExistingPersonFoundPanel } from '@/components/relationship/ExistingPersonFoundPanel'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { getRuknById } from '@/data/ruknMaster'
import { useWriteLifecycle } from '@/hooks/useWriteLifecycle'
import { normalizePersonGender } from '@/lib/peopleStore'
import {
  submitNewMuttafiqRequest,
  type MobileDuplicateDetails,
} from '@/services/karkunRequestService'
import { getFatherHusbandLabel, type PersonGender } from '@/types/people.types'

type NewMuttafiqRequestModalProps = {
  isOpen: boolean
  ruknId: string
  onClose: () => void
  onSubmitted: () => void
}

export function NewMuttafiqRequestModal({
  isOpen,
  ruknId,
  onClose,
  onSubmitted,
}: NewMuttafiqRequestModalProps) {
  const ruknGender = normalizePersonGender(getRuknById(ruknId)?.gender) ?? 'Male'
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [genderOverride, setGenderOverride] = useState<PersonGender | null>(null)
  const gender = genderOverride ?? ruknGender
  const [area, setArea] = useState('')
  const [fatherHusbandName, setFatherHusbandName] = useState('')
  const [address, setAddress] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [duplicate, setDuplicate] = useState<MobileDuplicateDetails | null>(null)
  const { busy: submitting, progressMessage, run } = useWriteLifecycle()

  const reset = () => {
    setFullName('')
    setMobile('')
    setGenderOverride(null)
    setArea('')
    setFatherHusbandName('')
    setAddress('')
    setRemarks('')
    setError('')
    setDuplicate(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = () => {
    setError('')
    void run({
      key: `new-muttafiq-submit:${ruknId}`,
      queueLabels: ['settings.karkunRequests'],
      work: async () => {
        const result = await submitNewMuttafiqRequest({
          fullName,
          mobile,
          gender,
          area,
          fatherHusbandName,
          address,
          remarks,
          requestingRuknId: ruknId,
        })
        if (!result.ok) {
          setError(result.error)
          setDuplicate(result.duplicate ?? null)
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
      title="Add Muttafiq"
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
          Submit a new Muttafiq for Admin approval. This is separate from Add Karkun. You are
          recorded as the referring Rukn for this person.
        </p>
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Full name</span>
          <input
            className={FORM_INPUT_CLASS}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Mobile</span>
          <input
            className={FORM_INPUT_CLASS}
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Gender</span>
          <select
            className={FORM_INPUT_CLASS}
            value={gender}
            onChange={(e) => setGenderOverride(e.target.value as PersonGender)}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
        <label className="block">
          <span className={FORM_LABEL_CLASS}>{getFatherHusbandLabel(gender)} *</span>
          <input
            className={FORM_INPUT_CLASS}
            value={fatherHusbandName}
            onChange={(e) => setFatherHusbandName(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Address *</span>
          <input
            className={FORM_INPUT_CLASS}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Area</span>
          <input
            className={FORM_INPUT_CLASS}
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={FORM_LABEL_CLASS}>Remarks</span>
          <textarea
            className={FORM_INPUT_CLASS}
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </label>
        {error ? (
          <div className="ds-banner-error" role="alert">
            <p>{error}</p>
            {duplicate ? <ExistingPersonFoundPanel duplicate={duplicate} /> : null}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
