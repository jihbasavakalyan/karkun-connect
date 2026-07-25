/**
 * KC-0115 — Activities hub (presentation only).
 * Lists registered activity modules so future programs can be added via
 * `ACTIVITIES_MODULES` without changing sidebar structure.
 */

import { Link } from 'react-router-dom'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import { Icon } from '@/components/ui/Icon'
import { PageHeader, PageShell } from '@/components/ui'
import { ACTIVITIES_MODULES } from '@/lib/activitiesNavigation'

export function ActivitiesHubPage() {
  return (
    <PageShell>
      <PageHeader
        title="Activities"
        description="Operational workspace for recurring organizational activities. Open a module below — workflows are unchanged."
      />
      <ActiveCampaignSubtitle />

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {ACTIVITIES_MODULES.map((mod) => (
          <li key={mod.id}>
            <Link
              to={mod.to}
              className="flex h-full flex-col gap-2 rounded-(--radius-card) border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40 hover:bg-surface-muted sm:p-5"
            >
              <span className="flex items-center gap-2 text-base font-semibold text-text-heading">
                <Icon name={mod.icon} size="md" className="text-primary" />
                {mod.label}
              </span>
              <span className="text-sm text-secondary">{mod.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  )
}
