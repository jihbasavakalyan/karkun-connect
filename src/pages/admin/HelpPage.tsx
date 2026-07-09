import { Link } from 'react-router-dom'
import { APP_VERSION } from '@/constants/app'
import { ROUTES, adminExecutionPath } from '@/constants/routes'
import { getActiveCampaignName, formatActiveCampaignDuration } from '@/services/campaignService'
import { PageHeader, PageShell } from '@/components/ui'

export function HelpPage() {
  const campaignName = getActiveCampaignName()
  const campaignDuration = formatActiveCampaignDuration()

  return (
    <PageShell variant="narrow">
      <PageHeader
        title="Help"
        description="Guidance for using Karkun Connect during the Basavakalyan pilot."
      />

      <div className="ds-section-group">
        <section className="ds-section">
          <h2 className="ds-section-title">Administrator Workflow</h2>
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
              Connect Karkun to Rukn under{' '}
              <Link to={ROUTES.ADMIN_ASSIGNMENTS} className="font-medium text-primary hover:underline">
                Connections
              </Link>
            </li>
            <li>
              Monitor visit execution under{' '}
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

        <section className="ds-section">
          <h2 className="ds-section-title">Rukn Workflow</h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-secondary">
            <li>Sign in with your connected demo Rukn account</li>
            <li>
              Review connected Karkun under{' '}
              <Link to={ROUTES.RUKN_MY_KARKUN} className="font-medium text-primary hover:underline">
                My Karkun
              </Link>
            </li>
            <li>Open a Karkun&apos;s Connection Journey to conduct the visit</li>
            <li>Submit the meeting form and complete any follow-up work</li>
            <li>
              Review campaign activity under{' '}
              <Link to={ROUTES.RUKN_CAMPAIGN_RECORD} className="font-medium text-primary hover:underline">
                Campaign Record
              </Link>
            </li>
          </ol>
        </section>

        <section className="ds-section">
          <h2 className="ds-section-title">Active Campaign</h2>
          <p className="ds-section-subtitle">
            {campaignName} · {campaignDuration}
          </p>
          <p className="mt-2 text-sm text-secondary">Version {APP_VERSION} (Release Candidate)</p>
        </section>
      </div>
    </PageShell>
  )
}
