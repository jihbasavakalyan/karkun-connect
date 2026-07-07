import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { EnterpriseProgressRing } from '@/components/enterprise'
import {
  getCampaignProgressOverview,
  getTeamPerformanceRows,
} from '@/lib/commandCenterPresentation'

type CommandCenterCampaignProgressProps = {
  showTeam?: boolean
}

function MiniBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] leading-tight">
        <span className="font-medium text-text-heading">{label}</span>
        <span className="font-semibold text-primary">{clamped}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-linear-to-r from-primary to-primary-light transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export function CommandCenterCampaignProgress({ showTeam = true }: CommandCenterCampaignProgressProps) {
  const overview = getCampaignProgressOverview()
  const team = showTeam ? getTeamPerformanceRows().slice(0, 5) : []

  return (
    <section className="cc-card-sm">
      <div className="grid gap-3 lg:grid-cols-2 lg:divide-x lg:divide-border">
        <div className="lg:pr-3">
          <h2 className="enterprise-section-title">Progress</h2>
          <div className="mt-1.5 flex items-center gap-3">
            <EnterpriseProgressRing value={overview.overall} label="" size={64} />
            <div className="min-w-0 flex-1 space-y-1">
              <MiniBar label="Execution" value={overview.execution} />
              <MiniBar label="Coverage" value={overview.coverage} />
              <MiniBar label="Follow-up" value={overview.followUp} />
              <MiniBar label="Compliance" value={overview.compliance} />
              <MiniBar label="Connection" value={overview.assignment} />
            </div>
          </div>
        </div>

        {showTeam && (
          <div className="min-w-0 lg:pl-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="enterprise-section-title">Top Rukns</h3>
              <Link to={ROUTES.ADMIN_ASSIGNMENTS} className="text-[10px] font-medium text-primary hover:underline">
                All →
              </Link>
            </div>
            {team.length === 0 ? (
              <p className="mt-1 text-xs text-secondary">No active connections yet.</p>
            ) : (
              <ul className="cc-list-md mt-1 space-y-1">
                {team.map((row, index) => (
                  <li key={row.ruknId} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 text-center text-[11px]">
                      {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                    </span>
                    <span className="w-20 shrink-0 truncate text-[11px] font-medium text-text-heading">
                      {row.ruknName}
                    </span>
                    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className="block h-full rounded-full bg-linear-to-r from-primary to-primary-light"
                        style={{ width: `${row.completionPct}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right text-[10px] font-semibold text-primary">
                      {row.completionPct}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
