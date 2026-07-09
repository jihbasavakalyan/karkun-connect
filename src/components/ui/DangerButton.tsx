import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { BUTTON_BASE_CLASS, BUTTON_SIZE_CLASS, buttonLoadingSpinner, type ButtonSize } from './buttonBase'

type DangerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  fullWidth?: boolean
  size?: ButtonSize
  loading?: boolean
}

export function DangerButton({
  children,
  fullWidth = false,
  size = 'md',
  loading = false,
  className = '',
  type = 'button',
  disabled,
  ...props
}: DangerButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        BUTTON_BASE_CLASS,
        BUTTON_SIZE_CLASS[size],
        'border border-error-border bg-error-bg text-error hover:bg-red-100',
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
