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
          <h2 className="ds-section-title">Start Here</h2>
          <p className="ds-section-subtitle">
            Sign in with your pilot credentials. Administrators use the email and password from your
            onboarding pack. Demo: <span className="font-medium text-text-heading">admin@demo.com</span>{' '}
            / <span className="font-medium text-text-heading">password</span>.
          </p>
          <p className="mt-3 text-sm text-secondary">
            Open{' '}
            <Link to={ROUTES.ADMIN} className="font-medium text-primary hover:underline">
              Home
            </Link>{' '}
            first — Campaign Pulse, today&apos;s priority, and Today&apos;s Work tell you where to begin.
          </p>
        </section>

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
              View submitted visit reports under{' '}
              <Link to={adminExecutionPath('reports')} className="font-medium text-primary hover:underline">
                Execution → Reports
              </Link>{' '}
              (not Campaign Lists)
            </li>
            <li>
              Send messages under{' '}
              <Link to={ROUTES.ADMIN_COMMUNICATION} className="font-medium text-primary hover:underline">
                Communication
              </Link>{' '}
              — start from{' '}
              <Link to={ROUTES.ADMIN_LISTS} className="font-medium text-primary hover:underline">
                Campaign Lists
              </Link>{' '}
              or Karkun bulk actions for broadcasts
            </li>
            <li>
              Review pilot settings under{' '}
              <Link to={ROUTES.ADMIN_SETTINGS} className="font-medium text-primary hover:underline">
                Settings
              </Link>
            </li>
          </ol>
        </section>

        <section className="ds-section">
          <h2 className="ds-section-title">Rukn Workflow</h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-secondary">
            <li>
              Open{' '}
              <Link to={ROUTES.RUKN} className="font-medium text-primary hover:underline">
                Home
              </Link>{' '}
              — &quot;Who needs you today&quot; shows your priority people
            </li>
            <li>
              Connect a new Karkun under{' '}
              <Link to={ROUTES.RUKN_AVAILABLE_KARKUN} className="font-medium text-primary hover:underline">
                Connect
              </Link>
            </li>
            <li>
              Review connected Karkuns under{' '}
              <Link to={ROUTES.RUKN_MY_KARKUN} className="font-medium text-primary hover:underline">
                Connected
              </Link>
            </li>
            <li>
              Open a Karkun to record a visit — tap <span className="font-medium text-text-heading">Record Visit</span> to open the form, then <span className="font-medium text-text-heading">Save Visit</span> to submit
            </li>
            <li>
              Review your history under{' '}
              <Link to={ROUTES.RUKN_CAMPAIGN_RECORD} className="font-medium text-primary hover:underline">
                Record
              </Link>
            </li>
          </ol>
        </section>

        <section className="ds-section">
          <h2 className="ds-section-title">Terminology</h2>
          <dl className="mt-4 space-y-3 text-sm text-secondary">
            <div>
              <dt className="font-medium text-text-heading">Connection</dt>
              <dd>The link between a Rukn and a Karkun.</dd>
            </div>
            <div>
              <dt className="font-medium text-text-heading">Release</dt>
              <dd>End a connection and return the Karkun to the available pool.</dd>
            </div>
            <div>
              <dt className="font-medium text-text-heading">Replace</dt>
              <dd>Release the current Karkun and connect a different one.</dd>
            </div>
            <div>
              <dt className="font-medium text-text-heading">Visit</dt>
              <dd>A meeting with a Karkun, recorded in Visit Details.</dd>
            </div>
          </dl>
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
