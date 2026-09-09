import { Link } from 'react-router-dom'
import { adminCommunicationPath } from '@/lib/communicationNavigation'
import { ruknCommunicationPath } from '@/lib/ruknCommunicationNavigation'
import { ROUTES } from '@/constants/routes'

type CommunicationDeferredSectionProps = {
  title: string
  description: string
  workspace: 'admin' | 'rukn'
}

export function CommunicationDeferredSection({
  title,
  description,
  workspace,
}: CommunicationDeferredSectionProps) {
  const backHref =
    workspace === 'admin' ? adminCommunicationPath() : ruknCommunicationPath()
  const backLabel = workspace === 'admin' ? 'Back to Overview' : 'My Connected Karkuns'

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
      aria-labelledby="communication-deferred-title"
    >
      <h2 id="communication-deferred-title" className="text-lg font-semibold text-text-heading">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-secondary">{description}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link to={backHref} className="font-medium text-primary hover:underline">
          {backLabel}
        </Link>
        {workspace === 'rukn' ? (
          <Link to={ROUTES.RUKN_KARKUN} className="font-medium text-primary hover:underline">
            Open Karkun
          </Link>
        ) : null}
      </div>
    </section>
  )
}
