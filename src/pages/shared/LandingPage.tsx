import { Link } from 'react-router-dom'
import { APP_DESCRIPTION, APP_TAGLINE, APP_VERSION } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { Logo } from '@/components/common/Logo'
import { PageContainer } from '@/components/layout/PageContainer'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

export function LandingPage() {
  return (
    <PageContainer>
      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-6 py-12 lg:px-8">
        <header className="flex items-center justify-between">
          <Logo size="md" />
          <Link
            to={ROUTES.LOGIN}
            className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            Login
          </Link>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-muted">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-surface">
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
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
          </div>

          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-text-heading sm:text-5xl">
            karkun-connect
          </h1>

          <p className="mt-4 text-xl font-medium text-primary">{APP_TAGLINE}</p>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-secondary">
            {APP_DESCRIPTION}
          </p>

          <div className="mt-10">
            <Link to={ROUTES.LOGIN}>
              <PrimaryButton>Login</PrimaryButton>
            </Link>
          </div>
        </main>

        <footer className="border-t border-border pt-8 text-center text-sm text-secondary-light">
          <p>Version {APP_VERSION.replace('.0', '')}</p>
          <p className="mt-1">Internal Use Only</p>
        </footer>
      </div>
    </PageContainer>
  )
}
