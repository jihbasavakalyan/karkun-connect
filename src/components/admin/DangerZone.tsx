import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { authenticateMock } from '@/constants/mockAuth'
import {
  DATA_RESET_OPTIONS,
  resetApplicationData,
  type DataResetScope,
} from '@/services/dataResetService'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

const CONFIRM_PHRASE = 'DELETE ALL DATA'

const inputClassName =
  'w-full rounded-lg border border-red-300 bg-surface px-4 py-3 text-base text-text-heading focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20'

type Step = 1 | 2 | 3 | 4

export function DangerZone() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [scope, setScope] = useState<DataResetScope>('runtime')
  const [password, setPassword] = useState('')
  const [phrase, setPhrase] = useState('')
  const [error, setError] = useState('')

  if (user?.role !== 'administrator') {
    return null
  }

  const scopeLabel = DATA_RESET_OPTIONS.find((option) => option.value === scope)?.label ?? ''

  const reset = () => {
    setOpen(false)
    setStep(1)
    setPassword('')
    setPhrase('')
    setError('')
  }

  const handlePasswordNext = () => {
    setError('')
    if (!user?.email || !authenticateMock(user.email, password)) {
      setError('Incorrect administrator password.')
      return
    }
    setStep(3)
  }

  const handlePhraseNext = () => {
    setError('')
    if (phrase.trim() !== CONFIRM_PHRASE) {
      setError(`Type exactly "${CONFIRM_PHRASE}" to continue.`)
      return
    }
    setStep(4)
  }

  const handleFinalConfirm = () => {
    resetApplicationData(scope)
  }

  return (
    <section className="rounded-(--radius-card) border border-red-200 bg-red-50/40 p-6 shadow-card">
      <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
      <p className="mt-2 text-sm text-secondary">
        Permanently delete campaign data. This action is available to administrators only and cannot
        be undone.
      </p>

      {!open ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-red-300 bg-surface px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Delete Data…
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-red-200 bg-surface p-4">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-red-700">Step 1 of 4 — Warning</p>
              <p className="text-sm text-secondary">
                Choose what to delete. Deleting data is permanent and cannot be reversed.
              </p>
              <div className="space-y-2">
                {DATA_RESET_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-3"
                  >
                    <input
                      type="radio"
                      name="reset-scope"
                      value={option.value}
                      checked={scope === option.value}
                      onChange={() => setScope(option.value)}
                      className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500/20"
                    />
                    <span>
                      <span className="block text-sm font-medium text-text-heading">
                        {option.label}
                      </span>
                      <span className="block text-xs text-secondary">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <SecondaryButton type="button" onClick={reset}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="button" onClick={() => setStep(2)}>
                  Continue
                </PrimaryButton>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-red-700">Step 2 of 4 — Administrator Password</p>
              <p className="text-sm text-secondary">
                Re-enter your administrator password to confirm your identity.
              </p>
              <input
                type="password"
                className={inputClassName}
                placeholder="Administrator password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="off"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <SecondaryButton type="button" onClick={reset}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="button" onClick={handlePasswordNext} disabled={!password}>
                  Continue
                </PrimaryButton>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-red-700">Step 3 of 4 — Type to Confirm</p>
              <p className="text-sm text-secondary">
                Type <span className="font-mono font-semibold text-red-700">{CONFIRM_PHRASE}</span> to
                confirm you understand this is permanent.
              </p>
              <input
                type="text"
                className={inputClassName}
                placeholder={CONFIRM_PHRASE}
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                autoComplete="off"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <SecondaryButton type="button" onClick={reset}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="button" onClick={handlePhraseNext}>
                  Continue
                </PrimaryButton>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-red-700">Step 4 of 4 — Final Confirmation</p>
              <p className="text-sm text-secondary">
                You are about to <span className="font-semibold text-red-700">{scopeLabel}</span>. This
                cannot be undone.
              </p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <SecondaryButton type="button" onClick={reset}>
                  Cancel
                </SecondaryButton>
                <button
                  type="button"
                  onClick={handleFinalConfirm}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  {scopeLabel} — Permanently
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
