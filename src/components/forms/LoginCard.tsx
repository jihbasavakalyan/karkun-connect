import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatPhoneForDisplay } from '@/lib/auth/roleResolver'
import { getAuthorizedRedirect, getHomeRouteForRole } from '@/lib/auth/authorization'
import { authenticationService } from '@/services/authenticationService'
import { APP_VERSION } from '@/constants/app'
import { InputField } from '@/components/forms/InputField'
import { PasswordField } from '@/components/forms/PasswordField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/auth.types'

type LoginMode = UserRole
type RuknStep = 'phone' | 'otp'

const OTP_RESEND_SECONDS = 60

export function LoginCard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithEmail, sendOtp, verifyOtp, resendOtp, resetPassword, status } = useAuth()

  const [loginMode, setLoginMode] = useState<LoginMode>('administrator')
  const [ruknStep, setRuknStep] = useState<RuknStep>('phone')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)

  const isBusy =
    status === 'signing-in' || status === 'sending-otp' || status === 'verifying-otp'

  useEffect(() => {
    if (resendCountdown <= 0) {
      return
    }

    const timer = window.setTimeout(() => {
      setResendCountdown((value) => value - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [resendCountdown])

  const navigateAfterLogin = (role: UserRole) => {
    const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
    const destination = fromPath
      ? getAuthorizedRedirect(fromPath, role)
      : getHomeRouteForRole(role)
    navigate(destination, { replace: true })
  }

  const handleAdminSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setInfo(null)

    const result = await loginWithEmail(email, password, rememberMe)
    if (!result.success) {
      setError(result.error)
      return
    }

    navigateAfterLogin(result.user.role)
  }

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setInfo(null)

    const result = await sendOtp(mobile)
    if (!result.success) {
      setError(result.error)
      return
    }

    setRuknStep('otp')
    setResendCountdown(OTP_RESEND_SECONDS)
    setInfo('OTP sent to your mobile number.')
  }

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setInfo(null)

    const result = await verifyOtp(otp, rememberMe)
    if (!result.success) {
      setError(result.error)
      return
    }

    navigateAfterLogin(result.user.role)
  }

  const handleResendOtp = async () => {
    if (resendCountdown > 0) {
      return
    }

    setError(null)
    setInfo(null)
    const result = await resendOtp(mobile)
    if (!result.success) {
      setError(result.error)
      return
    }

    setResendCountdown(OTP_RESEND_SECONDS)
    setInfo('A new OTP has been sent.')
  }

  const handleForgotPassword = async () => {
    setError(null)
    setInfo(null)

    if (!email.trim()) {
      setError('Enter your email address first, then choose Forgot Password.')
      return
    }

    const result = await resetPassword(email)
    if (!result.success) {
      setError(result.error)
      return
    }

    setInfo('Password reset email sent. Check your inbox.')
  }

  const switchMode = (mode: LoginMode) => {
    setLoginMode(mode)
    setRuknStep('phone')
    setError(null)
    setInfo(null)
    authenticationService.clearOtpSession()
  }

  if (!authenticationService.isConfigured()) {
    return (
      <div className="w-full max-w-md rounded-(--radius-card) bg-surface p-8 shadow-card">
        <h1 className="mb-4 text-center text-2xl font-semibold text-text-heading">Login</h1>
        <p className="rounded-lg border border-error-border bg-error-bg px-4 py-3 text-sm text-error" role="alert">
          Firebase authentication is not configured. Add VITE_FIREBASE_* variables from `.env.example`.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-(--radius-card) bg-surface p-8 shadow-card">
      <h1 className="mb-6 text-center text-2xl font-semibold text-text-heading">Login</h1>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-surface-muted p-1">
        <button
          type="button"
          onClick={() => switchMode('administrator')}
          className={[
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            loginMode === 'administrator'
              ? 'bg-surface text-text-heading shadow-sm'
              : 'text-secondary hover:text-text-heading',
          ].join(' ')}
        >
          Administrator
        </button>
        <button
          type="button"
          onClick={() => switchMode('rukn')}
          className={[
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            loginMode === 'rukn'
              ? 'bg-surface text-text-heading shadow-sm'
              : 'text-secondary hover:text-text-heading',
          ].join(' ')}
        >
          Rukn
        </button>
      </div>

      {error && (
        <p
          className="mb-4 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-sm text-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {info && (
        <p className="mb-4 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-secondary">
          {info}
        </p>
      )}

      {status === 'offline' && (
        <p className="mb-4 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-sm text-error" role="alert">
          You appear to be offline. Check your connection and try again.
        </p>
      )}

      {loginMode === 'administrator' ? (
        <form className="flex flex-col gap-5" onSubmit={handleAdminSubmit} noValidate>
          <InputField
            id="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="admin@example.com"
            value={email}
            onValueChange={setEmail}
          />

          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onValueChange={setPassword}
          />

          <div className="flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-text">Remember Me</span>
            </label>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm font-medium text-primary hover:text-primary-hover"
            >
              Forgot Password?
            </button>
          </div>

          <PrimaryButton type="submit" fullWidth loading={status === 'signing-in'} disabled={isBusy}>
            Login
          </PrimaryButton>
        </form>
      ) : ruknStep === 'phone' ? (
        <form className="flex flex-col gap-5" onSubmit={handleSendOtp} noValidate>
          <InputField
            id="mobile"
            label="Mobile Number"
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            placeholder="10-digit mobile number"
            value={mobile}
            onValueChange={setMobile}
          />

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <span className="text-sm text-text">Remember Me</span>
          </label>

          <PrimaryButton type="submit" fullWidth loading={status === 'sending-otp'} disabled={isBusy}>
            Send OTP
          </PrimaryButton>
        </form>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={handleVerifyOtp} noValidate>
          <p className="text-sm text-secondary">
            OTP sent to {formatPhoneForDisplay(mobile) ?? mobile}
          </p>

          <InputField
            id="otp"
            label="One-Time Password"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onValueChange={setOtp}
          />

          <div className="flex items-center justify-between gap-3 text-sm">
            <SecondaryButton
              type="button"
              onClick={() => {
                setRuknStep('phone')
                setOtp('')
                authenticationService.clearOtpSession()
              }}
            >
              Change Number
            </SecondaryButton>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCountdown > 0 || isBusy}
              className="font-medium text-primary hover:text-primary-hover disabled:cursor-not-allowed disabled:text-secondary"
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
            </button>
          </div>

          <PrimaryButton type="submit" fullWidth loading={status === 'verifying-otp'} disabled={isBusy}>
            Verify & Login
          </PrimaryButton>
        </form>
      )}

      <div id="kc-recaptcha-container" className="hidden" aria-hidden="true" />

      <p className="mt-8 text-center text-xs text-secondary-light">Version {APP_VERSION}</p>
    </div>
  )
}
