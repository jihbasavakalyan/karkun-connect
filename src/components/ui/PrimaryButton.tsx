import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { BUTTON_BASE_CLASS, BUTTON_SIZE_CLASS, buttonLoadingSpinner, type ButtonSize } from './buttonBase'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  fullWidth?: boolean
  size?: ButtonSize
  loading?: boolean
}

export function PrimaryButton({
  children,
  fullWidth = false,
  size = 'md',
  loading = false,
  className = '',
  type = 'button',
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        BUTTON_BASE_CLASS,
        BUTTON_SIZE_CLASS[size],
        'bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-card-hover',
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
