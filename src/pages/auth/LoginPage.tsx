import { LoginCard } from '@/components/forms/LoginCard'
import { BrandPanel } from '@/components/layout/BrandPanel'
import { PageContainer } from '@/components/layout/PageContainer'

export function LoginPage() {
  return (
    <PageContainer>
      <div className="flex min-h-svh flex-col lg:flex-row">
        <section className="lg:hidden" aria-label="Platform introduction">
          <BrandPanel variant="compact" />
        </section>

        <section
          className="hidden lg:block lg:w-1/2"
          aria-label="Platform introduction"
        >
          <BrandPanel variant="full" />
        </section>

        <section
          className="flex flex-1 items-center justify-center bg-surface-muted px-6 py-10 lg:w-1/2 lg:px-12"
          aria-label="Login form"
        >
          <LoginCard />
        </section>
      </div>
    </PageContainer>
  )
}
