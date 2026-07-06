import type { TextareaHTMLAttributes } from 'react'

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  label: string
  onValueChange: (value: string) => void
}

export function TextAreaField({
  id,
  label,
  onValueChange,
  className = '',
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-text-heading">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        className={[
          'w-full resize-y rounded-lg border border-border bg-surface px-4 py-3',
          'text-base text-text-heading placeholder:text-secondary-light',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
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
