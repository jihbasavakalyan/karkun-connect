import type { InputHTMLAttributes } from 'react'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> & {
  label: string
  onValueChange: (value: string) => void
}

export function PasswordField({
  id,
  label,
  onValueChange,
  className = '',
  ...props
}: PasswordFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-text-heading">
        {label}
      </label>
      <input
        id={id}
        type="password"
        className={[
          'w-full rounded-lg border border-border bg-surface px-4 py-3',
          'text-base text-text-heading placeholder:text-secondary-light',
          'transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        onChange={(event) => onValueChange(event.target.value)}
        {...props}
      />
    </div>
  )
}
