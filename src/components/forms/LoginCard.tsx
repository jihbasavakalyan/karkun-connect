import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHomeRouteForRole } from '@/constants/mockAuth'
import { APP_VERSION } from '@/constants/app'
import { InputField } from '@/components/forms/InputField'
import { PasswordField } from '@/components/forms/PasswordField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useAuth } from '@/hooks/useAuth'

export function LoginCard() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const result = login(email, password)

    if (!result.success) {
      setError(result.error)
      return
    }

    navigate(getHomeRouteForRole(result.user.role))
  }

  return (
    <div className="w-full max-w-md rounded-(--radius-card) bg-surface p-8 shadow-card">
      <h1 className="mb-6 text-center text-2xl font-semibold text-text-heading">
        Login
      </h1>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {error && (
          <p
            className="rounded-lg border border-error-border bg-error-bg px-4 py-3 text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <InputField
          id="email"
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="admin@demo.com"
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

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm text-text">Remember Me</span>
        </label>

        <PrimaryButton type="submit" fullWidth>
          Login
        </PrimaryButton>

        <button
          type="button"
          className="text-sm text-secondary transition-colors hover:text-primary"
          onClick={() => undefined}
        >
          Forgot Password
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-secondary-light">
        Version {APP_VERSION}
      </p>
    </div>
  )
}
