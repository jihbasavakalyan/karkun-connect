import { Link } from 'react-router-dom'
import { APP_VERSION } from '@/constants/app'
import { ROUTES, adminExecutionPath } from '@/constants/routes'
import { getActiveCampaignName, formatActiveCampaignDuration } from '@/services/campaignService'

export function HelpPage() {
  const campaignName = getActiveCampaignName()
  const campaignDuration = formatActiveCampaignDuration()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Help</h1>
        <p className="mt-2 text-secondary">Guidance for using Karkun Connect during the Basavakalyan pilot.</p>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Administrator Workflow</h2>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-secondary">
          <li>
            Confirm the active campaign under{' '}
            <Link to={ROUTES.ADMIN_CAMPAIGN} className="font-medium text-primary hover:underline">
              Campaign
            </Link>
          </li>
          <li>
            Manage Rukn records under{' '}
            <Link to={ROUTES.ADMIN_RUKN} className="font-medium text-primary hover:underline">
              Rukn
            </Link>
          </li>
          <li>
            Manage Karkun records under{' '}
            <Link to={ROUTES.ADMIN_KARKUN} className="font-medium text-primary hover:underline">
              Karkun
            </Link>
          </li>
          <li>
            Assign Karkun to Rukn under{' '}
            <Link to={ROUTES.ADMIN_ASSIGNMENTS} className="font-medium text-primary hover:underline">
              Assignments
            </Link>
          </li>
          <li>
            Monitor Annexure-1 execution under{' '}
            <Link to={ROUTES.ADMIN_EXECUTION} className="font-medium text-primary hover:underline">
              Execution
            </Link>
          </li>
          <li>
            Track compliance under{' '}
            <Link to={ROUTES.ADMIN_COMPLIANCE} className="font-medium text-primary hover:underline">
              Compliance
            </Link>
          </li>
          <li>
            Review follow-ups under{' '}
            <Link to={ROUTES.ADMIN_FOLLOW_UP} className="font-medium text-primary hover:underline">
              Follow-up
            </Link>
          </li>
          <li>
            View submitted reports under{' '}
            <Link to={adminExecutionPath('reports')} className="font-medium text-primary hover:underline">
              Execution → Reports
            </Link>
          </li>
        </ol>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Rukn Workflow</h2>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-secondary">
          <li>Sign in with your assigned demo Rukn account</li>
          <li>
            Review assigned Karkun under{' '}
            <Link to={ROUTES.RUKN_MY_KARKUN} className="font-medium text-primary hover:underline">
              My Karkun
            </Link>
          </li>
          <li>Open Annexure-1 from a Karkun card to conduct the visit</li>
          <li>Submit the meeting form and complete any follow-up work</li>
          <li>
            Review campaign activity under{' '}
            <Link to={ROUTES.RUKN_CAMPAIGN_RECORD} className="font-medium text-primary hover:underline">
              Campaign Record
            </Link>
          </li>
        </ol>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Active Campaign</h2>
        <p className="mt-2 text-sm text-secondary">
          {campaignName} · {campaignDuration}
        </p>
        <p className="mt-2 text-sm text-secondary">Version {APP_VERSION} (Release Candidate)</p>
      </section>
    </div>
  )
}
