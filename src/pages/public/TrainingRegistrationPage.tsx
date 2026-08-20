import { useEffect, useMemo, useState } from 'react'
import { JihLogoMark } from '@/components/public-registration/JihLogoMark'
import { OtpBoxes } from '@/components/public-registration/OtpBoxes'
import { TRAINING_GATHERING_EVENT } from '@/lib/publicRegistration/event'
import { trainingPaymentStatusLabel } from '@/lib/publicRegistration/labels'
import {
  lookupPublicRegistration,
  savePublicRegistrationProfile,
  submitPublicRegistration,
} from '@/lib/publicRegistration/client'
import { publicRegistrationPhoneAuth } from '@/lib/publicRegistration/phoneAuth'
import type {
  PublicLookupCase,
  PublicPersonProfile,
  PublicRegistrationStep,
  TrainingCashChoice,
  TrainingRegistrationRecord,
} from '@/lib/publicRegistration/types'
import { isValidMobileFormat, normalizeMobile } from '@/lib/mobileValidation'
import { getFatherHusbandLabel } from '@/types/people.types'

const emptyProfile = (mobile = ''): PublicPersonProfile => ({
  name: '',
  fatherHusbandName: '',
  mobile,
  address: '',
  education: '',
  profession: '',
  gender: '',
})

const STEPS: PublicRegistrationStep[] = ['mobile', 'otp', 'profile', 'payment', 'confirmation']

function stepIndex(step: PublicRegistrationStep): number {
  if (step === 'rukn_blocked') return 2
  return Math.max(0, STEPS.indexOf(step))
}

export function TrainingRegistrationPage() {
  const [step, setStep] = useState<PublicRegistrationStep>('mobile')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [lookupCase, setLookupCase] = useState<PublicLookupCase | null>(null)
  const [profile, setProfile] = useState<PublicPersonProfile>(emptyProfile())
  const [cashChoice, setCashChoice] = useState<TrainingCashChoice | null>(null)
  const [registration, setRegistration] = useState<TrainingRegistrationRecord | null>(null)
  const [savedNotice, setSavedNotice] = useState('')

  useEffect(() => {
    document.title = 'Tarbiyati Ijtema Registration'
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  const progress = useMemo(() => stepIndex(step) + 1, [step])
  const registeredName = (registration?.fullName || profile.name).trim()

  const sendOtp = async (nextMobile = mobile) => {
    setError('')
    const normalized = normalizeMobile(nextMobile)
    if (!isValidMobileFormat(normalized)) {
      setError('Enter a valid 10-digit Indian mobile number.')
      return
    }
    setBusy(true)
    const result = await publicRegistrationPhoneAuth.sendOtp(normalized)
    setBusy(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setMobile(normalized)
    setOtp('')
    setResendIn(30)
    setStep('otp')
  }

  const verifyOtp = async () => {
    setError('')
    setBusy(true)
    const verified = await publicRegistrationPhoneAuth.verifyOtp(otp)
    if (!verified.success) {
      setBusy(false)
      setError(verified.error)
      return
    }
    try {
      const lookup = await lookupPublicRegistration()
      setLookupCase(lookup.case)
      setProfile({
        ...emptyProfile(lookup.mobile),
        ...lookup.profile,
        mobile: lookup.mobile,
      })
      if (lookup.existingRegistration) {
        setRegistration(lookup.existingRegistration)
        setCashChoice(
          lookup.existingRegistration.paymentStatus === 'paid_cash' ? 'paid_cash' : 'cash_pending',
        )
        setStep('confirmation')
        return
      }
      if (lookup.case === 'rukn_blocked') {
        setStep('rukn_blocked')
        return
      }
      setStep('profile')
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'Lookup failed.')
    } finally {
      setBusy(false)
    }
  }

  const continueFromProfile = async () => {
    setError('')
    setSavedNotice('')
    setBusy(true)
    try {
      const result = await savePublicRegistrationProfile(profile)
      if (result.savedToMaster) {
        setSavedNotice('Your updated information will be saved to your existing Karkun Connect record.')
      }
      setStep('payment')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save information.')
    } finally {
      setBusy(false)
    }
  }

  const completeRegistration = async () => {
    setError('')
    if (!cashChoice) {
      setError('Choose a cash payment option.')
      return
    }
    setBusy(true)
    try {
      const result = await submitPublicRegistration({
        profile,
        paymentMethod: 'cash',
        paymentStatus: cashChoice,
      })
      setRegistration(result.registration)
      setLookupCase(result.newCandidate ? 'new_candidate' : lookupCase)
      setStep('confirmation')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not complete registration.')
    } finally {
      setBusy(false)
    }
  }

  const changeMobile = async () => {
    await publicRegistrationPhoneAuth.changeMobile()
    setOtp('')
    setError('')
    setLookupCase(null)
    setRegistration(null)
    setCashChoice(null)
    setStep('mobile')
  }

  return (
    <div className="public-reg-root min-h-dvh bg-[#f6f8f5] text-slate-700">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#d8f3dc]/70 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#fbf3d5]/80 blur-3xl" />
      </div>
      <main className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6 sm:py-10">
        <header className="overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#0f3d24_0%,#14532d_42%,#1b4332_100%)] px-6 pb-8 pt-7 text-center text-white shadow-[0_20px_50px_-20px_rgb(15_23_42_/_0.45)]">
          <div className="mx-auto mb-4 w-[10.5rem] max-w-full rounded-2xl bg-white p-2">
            <JihLogoMark />
          </div>
          <p className="font-urdu text-2xl leading-loose" dir="rtl">
            {TRAINING_GATHERING_EVENT.campaignTitleUrdu}
          </p>
          <p className="mt-2 font-urdu text-xl text-[#d8f3dc]" dir="rtl">
            {TRAINING_GATHERING_EVENT.eventTitleUrdu}
          </p>
          <p className="mt-1 text-sm tracking-wide text-[#fbf3d5]">
            {TRAINING_GATHERING_EVENT.eventTitleEn}
          </p>
          <p className="mt-4 text-sm text-[#fbf3d5]" dir="rtl">
            {TRAINING_GATHERING_EVENT.dateCombined}
          </p>
          <p className="mt-1 text-sm text-white/80">
            {TRAINING_GATHERING_EVENT.venue}
          </p>
          <p className="text-sm text-white/80">{TRAINING_GATHERING_EVENT.city}</p>
        </header>

        <div className="mt-6 mb-4 flex items-center justify-center gap-2" aria-label="Progress">
          {STEPS.map((item, index) => (
            <span
              key={item}
              className={[
                'h-2 rounded-full transition-all',
                index < progress ? 'w-8 bg-primary' : 'w-2 bg-[#d8f3dc]',
              ].join(' ')}
            />
          ))}
        </div>

        <section className="rounded-[1.75rem] border border-[#e5e7de] bg-white/95 p-5 shadow-[0_10px_40px_-12px_rgb(15_23_42_/_0.16)] sm:p-7">
          {step === 'mobile' && (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                void sendOtp()
              }}
            >
              <h1 className="text-2xl font-semibold text-primary">
                Register for {TRAINING_GATHERING_EVENT.eventTitleEn}
              </h1>
              <p className="font-urdu text-lg text-slate-700" dir="rtl">
                {TRAINING_GATHERING_EVENT.eventTitleUrdu} کے لیے اندراج
              </p>
              <p>Enter your mobile number to continue.</p>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">Mobile Number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-2xl border border-[#e5e7de] bg-[#fbfaf6] px-4 py-3.5 text-lg text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-white shadow-md disabled:opacity-60"
              >
                {busy ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold text-primary">Enter the 6-digit OTP</h1>
              <p>
                We sent a code to <strong>{mobile}</strong>
              </p>
              <OtpBoxes value={otp} onChange={setOtp} disabled={busy} error={error} />
              <button
                type="button"
                disabled={busy || otp.replace(/\D/g, '').length !== 6}
                onClick={() => void verifyOtp()}
                className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Verifying…' : 'Verify OTP'}
              </button>
              <div className="flex flex-col items-center gap-2 text-sm">
                <button
                  type="button"
                  disabled={busy || resendIn > 0}
                  onClick={() => void sendOtp(mobile)}
                  className="text-primary disabled:text-slate-400"
                >
                  {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
                </button>
                <button type="button" className="text-slate-500 underline" onClick={() => void changeMobile()}>
                  Change mobile number
                </button>
              </div>
            </div>
          )}

          {step === 'rukn_blocked' && (
            <div className="space-y-4 text-center">
              <h1 className="text-2xl font-semibold text-primary">Registration not available</h1>
              <p>
                This mobile number belongs to an active Rukn record. It is not converted into a Karkun
                or Muttafiq. Please contact the Administrator.
              </p>
              <button type="button" className="text-primary underline" onClick={() => void changeMobile()}>
                Use a different mobile number
              </button>
            </div>
          )}

          {step === 'profile' && (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void continueFromProfile()
              }}
            >
              <h1 className="text-2xl font-semibold text-primary">
                {lookupCase === 'existing_person' ? 'Your record was found' : 'Complete your information'}
              </h1>
              {lookupCase === 'existing_person' ? (
                <p>Review and complete your details. You do not need to re-enter information that is already present.</p>
              ) : (
                <p>Your information will be sent to the Admin for approval after you finish registration.</p>
              )}
              <Field
                label="Name"
                value={profile.name}
                onChange={(value) => setProfile((current) => ({ ...current, name: value }))}
              />
              <Field
                label="Father / Husband Name"
                value={profile.fatherHusbandName}
                onChange={(value) => setProfile((current) => ({ ...current, fatherHusbandName: value }))}
                placeholder={
                  profile.gender === 'Female' || profile.gender === 'Male'
                    ? getFatherHusbandLabel(profile.gender)
                    : 'Father / Husband name'
                }
              />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">Mobile Number</span>
                <input
                  value={profile.mobile}
                  readOnly
                  className="w-full rounded-2xl border border-[#e5e7de] bg-[#f3f4ef] px-4 py-3 text-slate-600"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">Gender</span>
                <select
                  value={profile.gender}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      gender: event.target.value as PublicPersonProfile['gender'],
                    }))
                  }
                  className="w-full rounded-2xl border border-[#e5e7de] bg-[#fbfaf6] px-4 py-3"
                  required
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
              <Field
                label="Address"
                value={profile.address}
                onChange={(value) => setProfile((current) => ({ ...current, address: value }))}
                multiline
              />
              <Field
                label="Education"
                value={profile.education}
                onChange={(value) => setProfile((current) => ({ ...current, education: value }))}
              />
              <Field
                label="Profession"
                value={profile.profession}
                onChange={(value) => setProfile((current) => ({ ...current, profession: value }))}
              />
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'payment' && (
            <div className="space-y-5">
              <h1 className="text-2xl font-semibold text-primary">
                ₹{TRAINING_GATHERING_EVENT.feeInr} Registration Fee
              </h1>
              {savedNotice ? <p className="rounded-2xl bg-[#d8f3dc] px-4 py-3 text-sm text-primary">{savedNotice}</p> : null}
              <div className={paymentCardClass(false, true)} aria-disabled="true">
                <strong>Online Payment</strong>
                <span className="mt-1 block text-sm">Not available yet</span>
              </div>
              <p className="text-sm text-slate-600">
                Online payment is not available yet. Please choose a cash payment option.
              </p>
              <button
                type="button"
                onClick={() => setCashChoice('cash_pending')}
                className={paymentCardClass(cashChoice === 'cash_pending')}
              >
                <strong>Cash Payment Pending</strong>
                <span className="mt-1 block text-sm">Pay ₹{TRAINING_GATHERING_EVENT.feeInr} at the Ijtema</span>
              </button>
              <button
                type="button"
                onClick={() => setCashChoice('paid_cash')}
                className={paymentCardClass(cashChoice === 'paid_cash')}
              >
                <strong>Cash Paid</strong>
                <span className="mt-1 block text-sm">₹{TRAINING_GATHERING_EVENT.feeInr} paid in cash</span>
              </button>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <button
                type="button"
                disabled={busy || !cashChoice}
                onClick={() => void completeRegistration()}
                className="w-full rounded-2xl bg-primary py-3.5 text-base font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Submitting…' : 'Confirm registration'}
              </button>
            </div>
          )}

          {step === 'confirmation' && registration && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-[8rem] max-w-full">
                <JihLogoMark />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                Acknowledgement
              </p>
              <h1 className="text-2xl font-semibold text-primary">
                {lookupCase === 'new_candidate' ? 'Registration Submitted' : 'Registration Complete'}
              </h1>
              <p className="font-urdu text-lg text-slate-700" dir="rtl">
                {TRAINING_GATHERING_EVENT.eventTitleUrdu}
              </p>
              <p className="text-sm text-slate-500">{TRAINING_GATHERING_EVENT.eventTitleEn}</p>
              {lookupCase === 'new_candidate' ? (
                <p>Your information has been sent to the Admin for approval.</p>
              ) : null}
              <div className="rounded-2xl bg-[#fbfaf6] px-4 py-5 text-left">
                <p>
                  <span className="text-sm text-slate-500">Name</span>
                  <br />
                  <strong className="break-words text-lg text-slate-900">
                    {registeredName || 'Name is not on this registration record'}
                  </strong>
                </p>
                <p className="mt-3">
                  <span className="text-sm text-slate-500">Event</span>
                  <br />
                  {TRAINING_GATHERING_EVENT.dateLabel}
                </p>
                <p className="mt-3">
                  <span className="text-sm text-slate-500">Venue</span>
                  <br />
                  {TRAINING_GATHERING_EVENT.venue}
                  <br />
                  {TRAINING_GATHERING_EVENT.city}
                </p>
                <p className="mt-3">
                  <span className="text-sm text-slate-500">Registration ID</span>
                  <br />
                  <strong className="break-all">{registration.id}</strong>
                </p>
                <p className="mt-3">
                  <span className="text-sm text-slate-500">Payment Status</span>
                  <br />
                  <strong>{trainingPaymentStatusLabel(registration.paymentStatus)}</strong>
                </p>
              </div>
            </div>
          )}
        </section>
        <div id={publicRegistrationPhoneAuth.recaptchaContainerId} />
      </main>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const className =
    'w-full rounded-2xl border border-[#e5e7de] bg-[#fbfaf6] px-4 py-3 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className={className}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
    </label>
  )
}

function paymentCardClass(selected: boolean, disabled = false): string {
  return [
    'w-full rounded-2xl border px-4 py-4 text-left transition',
    disabled ? 'cursor-not-allowed border-[#e5e7de] bg-[#eef0ea] text-slate-500' : '',
    !disabled && selected ? 'border-primary bg-[#d8f3dc]/60 ring-2 ring-primary/20' : '',
    !disabled && !selected ? 'border-[#e5e7de] bg-[#fbfaf6]' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function PublicRegistrationApp() {
  return <TrainingRegistrationPage />
}
