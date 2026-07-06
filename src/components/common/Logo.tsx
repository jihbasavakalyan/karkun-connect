type LogoProps = {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  variant?: 'default' | 'light'
  className?: string
}

const sizeClasses = {
  sm: { icon: 'h-8 w-8', text: 'text-lg' },
  md: { icon: 'h-10 w-10', text: 'text-xl' },
  lg: { icon: 'h-14 w-14', text: 'text-2xl' },
} as const

export function Logo({
  size = 'md',
  showText = true,
  variant = 'default',
  className = '',
}: LogoProps) {
  const sizes = sizeClasses[size]
  const isLight = variant === 'light'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={[
          sizes.icon,
          'flex shrink-0 items-center justify-center rounded-xl',
          isLight ? 'bg-surface text-primary' : 'bg-primary text-surface',
        ].join(' ')}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-3/5 w-3/5" role="presentation">
          <path
            d="M12 3L4 9v12h16V9L12 3z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M9 21v-6h6v6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showText && (
        <span
          className={[
            sizes.text,
            'font-semibold tracking-tight',
            isLight ? 'text-surface' : 'text-text-heading',
          ].join(' ')}
        >
          karkun-connect
        </span>
      )}
    </div>
  )
}
