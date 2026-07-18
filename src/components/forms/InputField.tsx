import type { InputHTMLAttributes } from 'react'
import {
  FORM_ERROR_CLASS,
  FORM_HELPER_CLASS,
  FORM_INPUT_CLASS,
  FORM_LABEL_CLASS,
} from '@/components/ui/formStyles'

type InputFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string
  onValueChange: (value: string) => void
  helperText?: string
  error?: string
  required?: boolean
}

export function InputField({
  id,
  label,
  onValueChange,
  helperText,
  error,
  required = false,
  className = '',
  ...props
}: InputFieldProps) {
  return (
    <div className="ds-form-field">
      <label htmlFor={id} className={FORM_LABEL_CLASS}>
        {label}
        {required && (
          <span className="ml-1 text-error" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        className={[FORM_INPUT_CLASS, error ? 'border-error-border ring-error-border/30' : '', className]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        enterKeyHint="next"
        {...props}
        onChange={(event) => onValueChange(event.target.value)}
      />
      {helperText && !error && (
        <p id={`${id}-helper`} className={FORM_HELPER_CLASS}>
          {helperText}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={FORM_ERROR_CLASS} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
