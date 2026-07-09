import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { BUTTON_BASE_CLASS, BUTTON_SIZE_CLASS, buttonLoadingSpinner, type ButtonSize } from './buttonBase'

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  fullWidth?: boolean
  size?: ButtonSize
  loading?: boolean
}

export function SecondaryButton({
  children,
  fullWidth = false,
  size = 'md',
  loading = false,
  className = '',
  type = 'button',
  disabled,
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        BUTTON_BASE_CLASS,
        BUTTON_SIZE_CLASS[size],
        'border border-border bg-surface text-text-heading hover:border-primary/30 hover:bg-surface-muted',
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading && <span className={buttonLoadingSpinner()} aria-hidden="true" />}
      {children}
    </button>
  )
}
