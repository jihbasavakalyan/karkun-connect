/**
 * Gentle, non-blocking reminder when a Connected Karkun profile is incomplete.
 */

import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'
import { updateKarkun } from '@/lib/peopleStore'
import {
  getMissingMandatoryProfileFields,
  type ProfileMissingField,
} from '@/lib/karkunProfileCompletion'
import { subscribeToPeopleStore } from '@/lib/peopleRegistryEvents'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import type { KarkunRegistryRecord, PersonGender } from '@/types/karkun-registry.types'
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS, FORM_SELECT_CLASS } from '@/components/ui/formStyles'

type ProfileCompletionReminderProps = {
  karkunId: string
  /** Compact chip for list cards; full banner on journey page. */
  variant?: 'banner' | 'chip'
}

export function ProfileCompletionReminder({
  karkunId,
  variant = 'banner',
}: ProfileCompletionReminderProps) {
  const { user } = useAuth()
  const [, setVersion] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)

  useEffect(() => {
    return subscribeToPeopleStore(() => setVersion((value) => value + 1))
  }, [])

  const karkun = getKarkunById(karkunId)
  if (!karkun) return null

  const missing = getMissingMandatoryProfileFields(karkun)
  if (missing.length === 0) return null

  return (
    <>
      {variant === 'chip' ? (
        <button
          type="button"
          className="profile-completion-chip"
          onClick={() => setEditorOpen(true)}
          dir="rtl"
        >
          معلومات مکمل نہیں · مکمل کریں
        </button>
      ) : (
        <aside className="profile-completion-banner" aria-live="polite" dir="rtl">
          <p className="profile-completion-lead">
            ⚠ اس کارکن کی معلومات ابھی مکمل نہیں ہیں۔
          </p>
          <p className="profile-completion-missing-label">
            اگر ملاقات کے دوران ممکن ہو تو درج ذیل معلومات مکمل کریں:
          </p>
          <ul className="profile-completion-list">
            {missing.map((field) => (
              <li key={field.key}>{field.label}</li>
            ))}
          </ul>
          <PrimaryButton
            type="button"
            className="mt-3 min-h-10 px-4 py-2 text-sm"
            onClick={() => setEditorOpen(true)}
          >
            معلومات مکمل کریں
          </PrimaryButton>
        </aside>
      )}

      <ProfileCompletionEditor
        isOpen={editorOpen}
        karkun={karkun}
        missing={missing}
        updatedBy={user?.displayName ?? user?.uid ?? 'Rukn'}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false)
          setVersion((value) => value + 1)
        }}
      />
    </>
  )
}

type ProfileCompletionEditorProps = {
  isOpen: boolean
  karkun: KarkunRegistryRecord
  missing: ProfileMissingField[]
  updatedBy: string
  onClose: () => void
  onSaved: () => void
}

function ProfileCompletionEditor({
  isOpen,
  karkun,
  missing,
  updatedBy,
  onClose,
  onSaved,
}: ProfileCompletionEditorProps) {
  const needsFather = missing.some((field) => field.key === 'fatherHusbandName')
  const needsAddress = missing.some((field) => field.key === 'address')
  const needsArea = missing.some((field) => field.key === 'area')
  const needsPlace = missing.some((field) => field.key === 'place')
  const needsGender = missing.some((field) => field.key === 'gender')

  const [fatherHusbandName, setFatherHusbandName] = useState(karkun.fatherHusbandName ?? '')
  const [address, setAddress] = useState(karkun.address ?? '')
  const [area, setArea] = useState(karkun.area ?? '')
  const [place, setPlace] = useState(karkun.place ?? '')
  const [gender, setGender] = useState<PersonGender>(karkun.gender)
  const [whatsapp, setWhatsapp] = useState(karkun.whatsapp ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setFatherHusbandName(karkun.fatherHusbandName ?? '')
    setAddress(karkun.address ?? '')
    setArea(karkun.area ?? '')
    setPlace(karkun.place ?? '')
    setGender(karkun.gender)
    setWhatsapp(karkun.whatsapp ?? '')
    setError('')
  }, [isOpen, karkun])

  const relationLabel = gender === 'Female' ? 'شوہر کا نام' : 'والد کا نام'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError('')

    const result = updateKarkun(
      karkun.id,
      {
        fatherHusbandName: fatherHusbandName.trim() || undefined,
        address: address.trim(),
        area: area.trim(),
        place: place.trim() || undefined,
        gender,
        whatsapp: whatsapp.trim() || undefined,
      },
      updatedBy,
    )

    if (!result.success) {
      setError(result.error ?? 'معلومات محفوظ نہیں ہو سکیں۔')
      return
    }

    onSaved()
  }

  return (
    <Modal
      isOpen={isOpen}
      title="معلومات مکمل کریں"
      onClose={onClose}
      size="md"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            منسوخ
          </SecondaryButton>
          <PrimaryButton type="submit" form="profile-completion-form">
            محفوظ کریں
          </PrimaryButton>
        </div>
      }
    >
      <form id="profile-completion-form" className="space-y-3" onSubmit={handleSubmit} dir="rtl">
        <p className="text-sm text-secondary">
          ملاقات کے دوران جو معلومات ملیں انہیں درج کریں۔ کال، واٹس ایپ اور ملاقات محفوظ کرنا ہمیشہ
          دستیاب رہتا ہے۔
        </p>

        {needsGender ? (
          <label className="block">
            <span className={FORM_LABEL_CLASS}>جنس</span>
            <select
              className={FORM_SELECT_CLASS}
              value={gender}
              onChange={(event) => setGender(event.target.value as PersonGender)}
            >
              <option value="Male">مرد</option>
              <option value="Female">عورت</option>
            </select>
          </label>
        ) : null}

        {needsFather ? (
          <label className="block">
            <span className={FORM_LABEL_CLASS}>{relationLabel}</span>
            <input
              className={FORM_INPUT_CLASS}
              value={fatherHusbandName}
              onChange={(event) => setFatherHusbandName(event.target.value)}
              autoComplete="off"
            />
          </label>
        ) : null}

        {needsAddress ? (
          <label className="block">
            <span className={FORM_LABEL_CLASS}>پتہ</span>
            <input
              className={FORM_INPUT_CLASS}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              autoComplete="street-address"
            />
          </label>
        ) : null}

        {needsArea ? (
          <label className="block">
            <span className={FORM_LABEL_CLASS}>علاقہ</span>
            <input
              className={FORM_INPUT_CLASS}
              value={area}
              onChange={(event) => setArea(event.target.value)}
              autoComplete="off"
            />
          </label>
        ) : null}

        {needsPlace ? (
          <label className="block">
            <span className={FORM_LABEL_CLASS}>مقام</span>
            <input
              className={FORM_INPUT_CLASS}
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              autoComplete="address-level2"
            />
          </label>
        ) : null}

        <label className="block">
          <span className={FORM_LABEL_CLASS}>واٹس ایپ (اختیاری)</span>
          <input
            className={FORM_INPUT_CLASS}
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </form>
    </Modal>
  )
}
