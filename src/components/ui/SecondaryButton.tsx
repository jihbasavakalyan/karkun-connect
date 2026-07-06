import type { ButtonHTMLAttributes, ReactNode } from 'react'

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  fullWidth?: boolean
}

export function SecondaryButton({
  children,
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center rounded-lg border border-border bg-surface px-5 py-3',
        'text-base font-medium text-text-heading',
        'transition-shadow hover:shadow-card-hover',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:cursor-not-allowed disabled:opacity-60',
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
