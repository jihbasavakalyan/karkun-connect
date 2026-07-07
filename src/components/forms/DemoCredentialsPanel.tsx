import { DEMO_CREDENTIALS_DISPLAY } from '@/constants/mockAuth'

type DemoCredentialsPanelProps = {
  onSelect: (email: string, password: string) => void
}

export function DemoCredentialsPanel({ onSelect }: DemoCredentialsPanelProps) {
  if (!import.meta.env.DEV) {
    return null
  }

  return (
    <aside
      className="mt-6 rounded-lg border border-dashed border-border bg-surface-muted px-4 py-4 text-left"
      aria-label="Demo credentials"
    >
      <h2 className="text-sm font-semibold text-text-heading">Demo Credentials</h2>
      <p className="mt-1 text-xs text-secondary">Development mode only</p>

      <ul className="mt-3 space-y-3">
        {DEMO_CREDENTIALS_DISPLAY.map((credential) => (
          <li key={credential.email}>
            <button
              type="button"
              onClick={() => onSelect(credential.email, credential.password)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                {credential.roleLabel}
              </p>
              <p className="mt-1 text-sm font-medium text-text-heading">{credential.email}</p>
              <p className="text-sm text-secondary">{credential.password}</p>
              {credential.detail && (
                <p className="mt-1 text-xs text-secondary">{credential.detail}</p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
