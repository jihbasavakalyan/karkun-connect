/**
 * KC-0123 — Independent Add Muttafiq request modal (not shared with Add Karkun).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal, ModalFormFooter } from '@/components/common'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/components/ui/formStyles'
import { getRuknById } from '@/data/ruknMaster'
import { normalizePersonGender } from '@/lib/peopleStore'
import { submitNewMuttafiqRequest } from '@/services/karkunRequestService'
import type { PersonGender } from '@/types/people.types'

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
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [duplicate, setDuplicate] = useState<{
    name: string
    mobile: string
    category?: string
    connectedToRuknName?: string
    status?: string
    adminViewRoute: string
    viewRoute: string
  } | null>(null)

  const reset = () => {
    setFullName('')
    setMobile('')
    setGenderOverride(null)
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
    if (submitting) return
    setSubmitting(true)
    setError('')
    void (async () => {
      try {
        const result = await submitNewMuttafiqRequest({
          fullName,
          mobile,
          gender,
          area,
          remarks,
          requestingRuknId: ruknId,
        })
        if (!result.ok) {
          setError(result.error)
          setDuplicate(
            result.duplicate
              ? {
                  name: result.duplicate.name,
                  mobile: result.duplicate.mobile,
                  category: result.duplicate.category,
                  connectedToRuknName: result.duplicate.connectedToRuknName,
                  status: result.duplicate.status,
                  adminViewRoute: result.duplicate.adminViewRoute,
                  viewRoute: result.duplicate.viewRoute,
                }
              : null,
          )
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
      title="Add Muttafiq"
      onClose={handleClose}
      size="md"
      footer={
        <ModalFormFooter
          onCancel={handleClose}
          primaryLabel={submitting ? 'Submitting…' : 'Submit Request'}
          onPrimaryClick={() => handleSubmit()}
          primaryDisabled={submitting}
        />
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-secondary">
          Submit a new Muttafiq for Admin approval. This is separate from Add Karkun.
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
            {duplicate ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className="font-semibold">Existing person</p>
                <p>Name: {duplicate.name}</p>
                <p>Mobile: {duplicate.mobile}</p>
                {duplicate.category ? <p>Registry: {duplicate.category}</p> : null}
                {duplicate.connectedToRuknName ? (
                  <p>Connected To: {duplicate.connectedToRuknName}</p>
                ) : null}
                {duplicate.status ? <p>Status: {duplicate.status}</p> : null}
                <Link to={duplicate.viewRoute} className="font-semibold text-primary underline">
                  Open Profile
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
