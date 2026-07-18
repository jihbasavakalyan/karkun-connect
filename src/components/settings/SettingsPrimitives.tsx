import type { ReactNode } from 'react'

type SettingsSectionProps = {
  title: string
  description: string
  children: ReactNode
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="ds-section">
      <h2 className="ds-section-title">{title}</h2>
      <p className="ds-section-subtitle">{description}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

type SettingsRowProps = {
  label: string
  hint?: string
  children: ReactNode
}

export function SettingsRow({ label, hint, children }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-heading">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-secondary">{hint}</p> : null}
      </div>
      <div className="shrink-0 sm:max-w-xs sm:text-right">{children}</div>
    </div>
  )
}

type SettingsToggleProps = {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}

export function SettingsToggle({ checked, onChange, label, disabled }: SettingsToggleProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text-heading">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="text-xs font-semibold text-secondary">
        {checked ? 'ON' : 'OFF'}
      </span>
    </label>
  )
}

type SettingsSelectProps = {
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
  disabled?: boolean
  'aria-label': string
}

export function SettingsSelect({
  value,
  onChange,
  options,
  disabled,
  'aria-label': ariaLabel,
}: SettingsSelectProps) {
  return (
    <select
      className="ds-select min-w-40"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

type SettingsReadonlyProps = {
  value: string
}

export function SettingsReadonly({ value }: SettingsReadonlyProps) {
  return <p className="text-sm font-medium text-text-heading">{value || '—'}</p>
}

type SettingsPlaceholderProps = {
  label: string
  note?: string
}

export function SettingsPlaceholder({ label, note = 'Coming soon' }: SettingsPlaceholderProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-muted/50 px-3 py-2">
      <p className="text-sm font-medium text-secondary">{label}</p>
      <p className="text-xs text-secondary/80">{note}</p>
    </div>
  )
}
