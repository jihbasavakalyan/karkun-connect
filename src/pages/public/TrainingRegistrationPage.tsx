import { useEffect, useMemo, useRef, useState } from 'react'
import { ReferringRuknSearchField } from '@/components/forms/people/ReferringRuknSearchField'
import { JihLogoMark } from '@/components/public-registration/JihLogoMark'
import { OtpBoxes } from '@/components/public-registration/OtpBoxes'
import { listEligibleReferringRukns } from '@/lib/referringRukn'
import {
  buildTarbiyatiIjtemaUpiAppUri,
  buildTarbiyatiIjtemaUpiPayUri,
  detectTarbiyatiUpiLaunchPlatform,
  TARBIYATI_IJTEMA_POSTER_ALT,
  TARBIYATI_IJTEMA_POSTER_SRC,
  TARBIYATI_IJTEMA_UPI_APP_OPTIONS,
  TARBIYATI_IJTEMA_UPI_DESKTOP_MESSAGE,
  TARBIYATI_IJTEMA_UPI_NO_APP_MESSAGE,
  TARBIYATI_IJTEMA_UPI_QR_FALLBACK_INTRO,
  TARBIYATI_IJTEMA_UPI_QR_SRC,
  TRAINING_GATHERING_EVENT,
  type TarbiyatiUpiLaunchPlatform,
} from '@/lib/publicRegistration/event'
import {
  trainingAcknowledgementPaymentLabel,
  trainingOrganisationalCategoryLabel,
  trainingPaymentMethodLabel,
} from '@/lib/publicRegistration/labels'
import {
  lookupPublicRegistration,
  savePublicRegistrationProfile,
  submitPublicRegistration,
} from '@/lib/publicRegistration/client'
import { isRestorableRegistration } from '@/lib/publicRegistration/adminTracking'
import { publicRegistrationPhoneAuth } from '@/lib/publicRegistration/phoneAuth'
import { clearPublicRegistrationServiceWorkers } from '@/lib/publicRegistration/swCleanup'
import type {
  PublicLookupCase,
  PublicPersonProfile,
  PublicRegistrationStep,
  TrainingCashCollector,
  TrainingPublicPaymentChoice,
  TrainingReferringRuknOption,
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
  const [paymentChoice, setPaymentChoice] = useState<TrainingPublicPaymentChoice | null>(null)
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(true)
  const [cashCollectors, setCashCollectors] = useState<TrainingCashCollector[]>([])
  const [referringRukns, setReferringRukns] = useState<TrainingReferringRuknOption[]>([])
  const [referredByRuknId, setReferredByRuknId] = useState('')
  const [cashPaidToId, setCashPaidToId] = useState('')
  const [utr, setUtr] = useState('')
  const [registration, setRegistration] = useState<TrainingRegistrationRecord | null>(null)
  const [savedNotice, setSavedNotice] = useState('')
  const [upiLaunchNotice, setUpiLaunchNotice] = useState('')
  const upiFallbackTimer = useRef<number | null>(null)
  const upiPlatform = useMemo<TarbiyatiUpiLaunchPlatform>(
    () =>
      typeof navigator === 'undefined' ? 'desktop' : detectTarbiyatiUpiLaunchPlatform(navigator.userAgent),
    [],
  )
  const upiAppUris = useMemo(
    () => ({
      gpay: buildTarbiyatiIjtemaUpiAppUri('gpay'),
      phonepe: buildTarbiyatiIjtemaUpiAppUri('phonepe'),
      paytm: buildTarbiyatiIjtemaUpiAppUri('paytm'),
    }),
    [],
  )
  const androidGenericUpiUri = useMemo(() => buildTarbiyatiIjtemaUpiPayUri(), [])

  useEffect(() => {
    document.title = 'Tarbiyati Ijtema Registration'
    void clearPublicRegistrationServiceWorkers()
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  useEffect(() => {
    return () => {
      if (upiFallbackTimer.current != null) window.clearTimeout(upiFallbackTimer.current)
    }
  }, [])

  const progress = useMemo(() => stepIndex(step) + 1, [step])
  const registeredName = (registration?.fullName || profile.name).trim()
  const publicReferringOptions = useMemo(() => {
    return listEligibleReferringRukns(
      referringRukns.map((row) => ({
        id: row.id,
        name: row.name,
        mobile: row.mobile,
        gender: row.gender || undefined,
        officerKind: row.category === 'A Rukn' ? 'a_rukn' : 'rukn',
      })),
      profile.gender === 'Male' || profile.gender === 'Female'
        ? { gender: profile.gender }
        : undefined,
    )
  }, [referringRukns, profile.gender])

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
      setOnlinePaymentEnabled(lookup.onlinePaymentEnabled !== false)
      setCashCollectors(lookup.cashCollectors ?? [])
      setReferringRukns(lookup.referringRukns ?? [])
      setReferredByRuknId(lookup.submittedReferredByRuknId ?? '')
      setProfile({
        ...emptyProfile(lookup.mobile),
        ...lookup.profile,
        mobile: lookup.mobile,
      })
      if (isRestorableRegistration(lookup.existingRegistration)) {
        setRegistration(lookup.existingRegistration)
        setUtr(lookup.existingRegistration.utr ?? '')
        setCashPaidToId(lookup.existingRegistration.cashPaidToId ?? '')
        setStep('confirmation')
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
    if (lookupCase === 'new_candidate' && !referredByRuknId.trim()) {
      setError('Referred By Rukn is required.')
      return
    }
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
    if (!paymentChoice) {
      setError('Choose a payment method.')
      return
    }
    if (paymentChoice === 'online' && !onlinePaymentEnabled) {
      setError('Online payment is currently unavailable. Please choose a cash option.')
      return
    }
    if (paymentChoice === 'online' && !utr.trim()) {
      setError('Enter your UTR / Transaction Reference Number.')
      return
    }
    if (paymentChoice === 'cash_paid_to' && !cashPaidToId) {
      setError('Select who received the cash payment.')
      return
    }
    setBusy(true)
    try {
      const result = await submitPublicRegistration({
        profile,
        paymentChoice,
        utr: paymentChoice === 'online' ? utr : undefined,
        cashPaidToId: paymentChoice === 'cash_paid_to' ? cashPaidToId : undefined,
        referredByRuknId: lookupCase === 'new_candidate' ? referredByRuknId : undefined,
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

  const launchUpiPayment = (event: { preventDefault: () => void }) => {
    setUpiLaunchNotice('')
    const platform = detectTarbiyatiUpiLaunchPlatform(navigator.userAgent)
    if (platform === 'desktop') {
      event.preventDefault()
      setUpiLaunchNotice(TARBIYATI_IJTEMA_UPI_DESKTOP_MESSAGE)
      return
    }
    if (upiFallbackTimer.current != null) window.clearTimeout(upiFallbackTimer.current)
    upiFallbackTimer.current = window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        setUpiLaunchNotice(TARBIYATI_IJTEMA_UPI_NO_APP_MESSAGE)
      }
    }, 2000)
  }

  const changeMobile = async () => {
    await publicRegistrationPhoneAuth.changeMobile()
    setOtp('')
    setError('')
    setLookupCase(null)
    setRegistration(null)
    setPaymentChoice(null)
    setCashPaidToId('')
    setReferredByRuknId('')
    setReferringRukns([])
    setUtr('')
    setUpiLaunchNotice('')
    setStep('mobile')
  }

  return (
    <div className="public-reg-root min-h-dvh bg-[#f6f8f5] text-slate-700">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#d8f3dc]/70 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#fbf3d5]/80 blur-3xl" />
      </div>
      <main className="relative mx-auto flex min-h-dvh w-full max-w-[40rem] flex-col px-4 py-6 sm:py-10">
        <article className="overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_50px_-20px_rgb(15_23_42_/_0.45)]">
          <header className="bg-[#0f3d24]">
            <img
              src={TARBIYATI_IJTEMA_POSTER_SRC}
              alt={TARBIYATI_IJTEMA_POSTER_ALT}
              width={819}
              height={1024}
              decoding="async"
              fetchPriority="high"
              className="block h-auto w-full object-contain"
            />
          </header>

          <div className="flex items-center justify-center gap-2 px-5 pt-5 sm:px-7 sm:pt-6" aria-label="Progress">
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

          <section className="bg-white p-5 pt-4 sm:p-7 sm:pt-5">
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

          {step === 'profile' && (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void continueFromProfile()
              }}
            >
              <h1 className="text-2xl font-semibold text-primary">
                {lookupCase === 'existing_person' || lookupCase === 'existing_rukn'
                  ? 'Your record was found'
                  : 'Complete your information'}
              </h1>
              {lookupCase === 'existing_rukn' ? (
                <p>Your Rukn record was found. Confirm your details to register for this event. A Karkun record will not be created.</p>
              ) : lookupCase === 'existing_person' ? (
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
                  onChange={(event) => {
                    const nextGender = event.target.value as PublicPersonProfile['gender']
                    setProfile((current) => ({
                      ...current,
                      gender: nextGender,
                    }))
                    const selected = referringRukns.find((row) => row.id === referredByRuknId)
                    if (selected?.gender && nextGender && selected.gender !== nextGender) {
                      setReferredByRuknId('')
                    }
                  }}
                  className="w-full rounded-2xl border border-[#e5e7de] bg-[#fbfaf6] px-4 py-3"
                  required
                  disabled={
                    (lookupCase === 'existing_person' || lookupCase === 'existing_rukn') &&
                    (profile.gender === 'Male' || profile.gender === 'Female')
                  }
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>
              {lookupCase === 'new_candidate' ? (
                <ReferringRuknSearchField
                  id="public-referred-by-rukn"
                  label="Referred By Rukn *"
                  value={referredByRuknId}
                  onChange={setReferredByRuknId}
                  options={publicReferringOptions}
                  required
                  variant="public"
                />
              ) : null}
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
              {onlinePaymentEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentChoice('online')
                    setUpiLaunchNotice('')
                  }}
                  className={paymentCardClass(paymentChoice === 'online')}
                >
                  <strong>Online Payment</strong>
                  <span className="mt-1 block text-sm">
                    Pay ₹{TRAINING_GATHERING_EVENT.feeInr} using UPI
                  </span>
                </button>
              ) : (
                <div className={paymentCardClass(false, true)} aria-disabled="true">
                  <strong>Online Payment</strong>
                  <span className="mt-1 block text-sm">Currently unavailable</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setPaymentChoice('cash_at_ijtema')}
                className={paymentCardClass(paymentChoice === 'cash_at_ijtema')}
              >
                <strong>Cash Payment</strong>
                <span className="mt-1 block text-sm">
                  Pay ₹{TRAINING_GATHERING_EVENT.feeInr} at the Ijtema Gah
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentChoice('cash_paid_to')}
                className={paymentCardClass(paymentChoice === 'cash_paid_to')}
              >
                <strong>Cash Paid To</strong>
                <span className="mt-1 block text-sm">
                  {cashCollectors.find((collector) => collector.id === cashPaidToId)?.name ||
                    'Select Person'}
                </span>
              </button>
              {paymentChoice === 'online' && onlinePaymentEnabled ? (
                <div className="space-y-4 rounded-2xl border border-[#e5e7de] bg-[#fbfaf6] p-4">
                  <p className="text-base font-semibold text-slate-900">
                    ₹{TRAINING_GATHERING_EVENT.feeInr} Registration Fee
                  </p>
                  {upiPlatform !== 'desktop' ? (
                    <div className="space-y-3">
                      {TARBIYATI_IJTEMA_UPI_APP_OPTIONS.map((app) => (
                        <a
                          key={app.id}
                          href={upiAppUris[app.id]}
                          onClick={launchUpiPayment}
                          className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3.5 text-center text-base font-semibold text-white shadow-md"
                        >
                          {app.label}
                        </a>
                      ))}
                      {upiPlatform === 'android' ? (
                        <a
                          href={androidGenericUpiUri}
                          onClick={launchUpiPayment}
                          className="flex w-full items-center justify-center rounded-2xl border border-primary bg-white px-4 py-3.5 text-center text-base font-semibold text-primary"
                        >
                          Pay ₹{TRAINING_GATHERING_EVENT.feeInr} using UPI on this phone
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  {upiPlatform !== 'desktop' ? (
                    <p className="text-sm font-medium text-slate-800">{TARBIYATI_IJTEMA_UPI_QR_FALLBACK_INTRO}</p>
                  ) : (
                    <p className="text-sm text-slate-700">{TARBIYATI_IJTEMA_UPI_DESKTOP_MESSAGE}</p>
                  )}
                  <div className="mx-auto w-full max-w-[22rem]">
                    <img
                      src={TARBIYATI_IJTEMA_UPI_QR_SRC}
                      alt="Official UPI QR code for Tarbiyati Ijtema registration"
                      className="h-auto w-full object-contain"
                    />
                  </div>
                  <p className="text-center text-sm font-medium text-slate-800">
                    Scan this QR code using another phone
                  </p>
                  {upiLaunchNotice ? (
                    <p className="rounded-2xl bg-[#fbf3d5] px-4 py-3 text-sm text-slate-800">{upiLaunchNotice}</p>
                  ) : null}
                  <p className="text-sm text-slate-700">
                    Opening your UPI app does not complete payment or confirm registration. Complete the ₹
                    {TRAINING_GATHERING_EVENT.feeInr} payment, return to this page, and enter your UTR / Transaction
                    Reference Number. Only then can you submit your registration.
                  </p>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-800">
                      UTR / Transaction Reference Number
                    </span>
                    <input
                      value={utr}
                      onChange={(event) => setUtr(event.target.value)}
                      placeholder="Enter UTR / Transaction Reference Number"
                      autoComplete="off"
                      className="w-full rounded-2xl border border-[#e5e7de] bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </label>
                </div>
              ) : null}
              {paymentChoice === 'cash_paid_to' ? (
                <label className="block rounded-2xl border border-[#e5e7de] bg-[#fbfaf6] p-4">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Cash Paid To</span>
                  <select
                    value={cashPaidToId}
                    onChange={(event) => setCashPaidToId(event.target.value)}
                    className="w-full rounded-2xl border border-[#e5e7de] bg-white px-4 py-3"
                    required
                  >
                    <option value="">Select Person</option>
                    {cashCollectors.map((collector) => (
                      <option key={collector.id} value={collector.id}>
                        {collector.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <button
                type="button"
                disabled={
                  busy ||
                  !paymentChoice ||
                  (paymentChoice === 'online' && (!onlinePaymentEnabled || !utr.trim())) ||
                  (paymentChoice === 'cash_paid_to' && !cashPaidToId)
                }
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
                  <span className="text-sm text-slate-500">Registration ID</span>
                  <br />
                  <strong className="break-all">{registration.id}</strong>
                </p>
                <p className="mt-3">
                  <span className="text-sm text-slate-500">Date</span>
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
                  <span className="text-sm text-slate-500">Category</span>
                  <br />
                  <strong>
                    {registration.organisationalCategory
                      ? trainingOrganisationalCategoryLabel(registration.organisationalCategory)
                      : lookupCase === 'existing_rukn'
                        ? 'Rukn'
                        : lookupCase === 'existing_person'
                          ? 'Karkun / Muttafiq'
                          : 'Other'}
                  </strong>
                </p>
                <p className="mt-3">
                  <span className="text-sm text-slate-500">Gender</span>
                  <br />
                  <strong>{profile.gender || '—'}</strong>
                </p>
                <p className="mt-3">
                  <span className="text-sm text-slate-500">Payment method</span>
                  <br />
                  <strong>{trainingPaymentMethodLabel(registration.paymentMethod)}</strong>
                </p>
                <p className="mt-3">
                  <span className="text-sm text-slate-500">Payment status</span>
                  <br />
                  <strong>
                    {trainingAcknowledgementPaymentLabel(
                      registration.paymentStatus,
                      registration.cashPaidToName,
                    )}
                  </strong>
                </p>
                {registration.utr ? (
                  <p className="mt-3">
                    <span className="text-sm text-slate-500">UTR</span>
                    <br />
                    <strong className="break-all">{registration.utr}</strong>
                  </p>
                ) : null}
              </div>
            </div>
          )}
          </section>
        </article>
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
