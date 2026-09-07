/**
 * Gentle, non-blocking reminder when a Connected Karkun profile is incomplete.
 * Opens the canonical PersonFormModal (same form as Admin Karkun edit).
 */

import { useEffect, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { PersonFormModal, type PersonFormValues } from '@/components/forms/people/PersonFormModal'
import { useAuth } from '@/hooks/useAuth'
import { persistKarkunDurable, updateKarkun } from '@/lib/peopleStore'
import {
  getMissingMandatoryProfileFields,
  isKarkunProfileComplete,
} from '@/lib/karkunProfileCompletion'
import { subscribeToPeopleStore } from '@/lib/peopleRegistryEvents'
import { getKarkunById } from '@/constants/mockKarkunRegistry'

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
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return subscribeToPeopleStore(() => setVersion((value) => value + 1))
  }, [])

  const karkun = getKarkunById(karkunId)
  if (!karkun) return null

  // Single shared completeness function (KC-0058.2).
  if (isKarkunProfileComplete(karkun)) return null

  const missing = getMissingMandatoryProfileFields(karkun)

  const handleSubmit = (values: PersonFormValues) => {
    setFormError('')
    setSaving(true)

    void (async () => {
      const { assignedRuknId: _ignoredConnection, referredByRuknId: _ignoredReferral, ...payload } =
        values

      const result = updateKarkun(
        karkun.id,
        payload,
        user?.displayName ?? user?.uid ?? 'Rukn',
      )

      if (!result.success) {
        setFormError(result.error ?? 'معلومات محفوظ نہیں ہو سکیں۔')
        setSaving(false)
        return
      }

      const durable = await persistKarkunDurable(karkun.id)
      if (!durable.success) {
        setFormError(durable.error ?? 'معلومات محفوظ نہیں ہو سکیں۔ براہ کرم دوبارہ کوشش کریں۔')
        setSaving(false)
        return
      }

      const refreshed = getKarkunById(karkun.id)
      if (!refreshed || !isKarkunProfileComplete(refreshed)) {
        setFormError('معلومات مکمل نہیں ہیں۔ براہ کرم تمام ضروری خانے بھریں۔')
        setSaving(false)
        return
      }

      setSaving(false)
      setEditorOpen(false)
      setVersion((value) => value + 1)
    })()
  }

  return (
    <>
      {variant === 'chip' ? (
        <button
          type="button"
          className="profile-completion-chip"
          onClick={() => {
            setFormError('')
            setEditorOpen(true)
          }}
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
            onClick={() => {
              setFormError('')
              setEditorOpen(true)
            }}
          >
            معلومات مکمل کریں
          </PrimaryButton>
        </aside>
      )}

      <PersonFormModal
        isOpen={editorOpen}
        kind="karkun"
        mode="edit"
        personLabel="Karkun"
        title="معلومات مکمل کریں"
        hideConnectionSection
        loading={saving}
        error={formError}
        initialValues={{
          name: karkun.name,
          gender: karkun.gender,
          mobile: karkun.mobile,
          whatsapp: karkun.whatsapp,
          status: karkun.status,
          fatherHusbandName: karkun.fatherHusbandName,
          address: karkun.address,
          area: karkun.area,
          place: karkun.place,
          education: karkun.education,
          profession: karkun.profession,
        }}
        onClose={() => {
          if (saving) return
          setEditorOpen(false)
          setFormError('')
        }}
        onSubmit={handleSubmit}
      />
    </>
  )
}
