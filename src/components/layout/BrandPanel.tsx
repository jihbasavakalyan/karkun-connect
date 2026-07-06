import { Link } from 'react-router-dom'
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { Logo } from '@/components/common/Logo'

type BrandPanelProps = {
  variant?: 'full' | 'compact'
}

export function BrandPanel({ variant = 'full' }: BrandPanelProps) {
  const isCompact = variant === 'compact'

  return (
    <div
      className={[
        'relative flex flex-col justify-center overflow-hidden bg-primary px-8 py-12 text-surface',
        isCompact ? 'min-h-[220px] rounded-b-3xl' : 'min-h-full lg:rounded-none',
      ].join(' ')}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        aria-hidden="true"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-surface" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary-light" />
        <div className="absolute right-1/4 top-1/3 h-32 w-32 rounded-full bg-primary-hover" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-md">
        <Logo size="lg" variant="light" showText={false} />

        <h1 className="mt-8 text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">
          {APP_NAME}
        </h1>

        <p className="mt-3 text-lg font-medium text-primary-muted">{APP_TAGLINE}</p>

        {!isCompact && (
          <p className="mt-6 text-base leading-relaxed text-primary-muted/90">
            {APP_DESCRIPTION}
          </p>
        )}

        {isCompact && (
          <Link
            to={ROUTES.HOME}
            className="mt-6 inline-block text-sm text-primary-muted underline-offset-4 hover:underline"
          >
            Back to home
          </Link>
        )}
      </div>
    </div>
  )
}
