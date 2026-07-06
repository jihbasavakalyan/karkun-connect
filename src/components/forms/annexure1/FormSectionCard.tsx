import type { ReactNode } from 'react'

type FormSectionCardProps = {
  title: string
  children: ReactNode
}

export function FormSectionCard({ title, children }: FormSectionCardProps) {
  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
      <h2 className="text-base font-semibold text-text-heading">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

type RadioOptionProps = {
  name: string
  value: string
  checked: boolean
  label: string
  onChange: (value: string) => void
}

export function LargeRadioOption({ name, value, checked, label, onChange }: RadioOptionProps) {
  return (
    <label
      className={[
        'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3',
        checked ? 'border-primary bg-primary-muted/40' : 'border-border bg-surface',
      ].join(' ')}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="h-5 w-5 border-border text-primary focus:ring-primary/20"
      />
      <span className="text-base font-medium text-text-heading">{label}</span>
    </label>
  )
}
