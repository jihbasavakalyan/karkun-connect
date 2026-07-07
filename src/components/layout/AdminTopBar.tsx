import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'
import { ADMIN_NAV_ITEMS } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import {
  formatActiveCampaignDuration,
  getActiveCampaignName,
  getCampaignTimeline,
} from '@/services/campaignService'
import { PortalAuthActions } from '@/components/layout/PortalAuthActions'
import type { CampaignTimelineStatus } from '@/services/campaignService'
import { EnterpriseBadge } from '@/components/enterprise'

type AdminTopBarProps = {
  alertCount?: number
  onMenuToggle?: () => void
}

function timelineBadgeVariant(status: CampaignTimelineStatus): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'upcoming') return 'info'
  if (status === 'completed') return 'neutral'
  return 'neutral'
}

export function AdminTopBar({ alertCount = 0, onMenuToggle }: AdminTopBarProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const campaignName = getActiveCampaignName()
  const duration = formatActiveCampaignDuration()
  const timeline = getCampaignTimeline()

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    navigate(ROUTES.ADMIN_KARKUN, { state: { searchQuery: query.trim() } })
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-6 lg:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-secondary lg:hidden"
            onClick={onMenuToggle}
            aria-label="Open navigation"
          >
            ☰
          </button>
          <div className="min-w-0 lg:hidden">
            <Logo size="sm" />
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold text-text-heading">{campaignName || 'Command Center'}</p>
            <p className="truncate text-xs text-secondary">{duration}</p>
          </div>
          {timeline && (
            <EnterpriseBadge variant={timelineBadgeVariant(timeline.status)}>
              {timeline.status}
            </EnterpriseBadge>
          )}
        </div>

        <form onSubmit={handleSearch} className="order-last w-full sm:order-none sm:max-w-xs lg:max-w-md lg:flex-1">
          <label htmlFor="admin-global-search" className="sr-only">
            Search Karkun
          </label>
          <input
            id="admin-global-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Karkun, Rukn, assignments…"
            className="w-full rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm text-text-heading placeholder:text-secondary-light focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-muted"
          />
        </form>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to={`${ROUTES.ADMIN}#operational-alerts`}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-lg transition-colors hover:border-primary/30 hover:bg-primary-muted"
            aria-label={`${alertCount} operational alerts`}
          >
            🔔
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Link>
          <Link
            to={ROUTES.ADMIN_SETTINGS}
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-muted text-lg transition-colors hover:border-primary/30 sm:flex"
            aria-label="Settings"
          >
            ⚙️
          </Link>
          <PortalAuthActions portalLabel="Administrator" />
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-t border-border px-4 py-2 lg:hidden" aria-label="Admin mobile navigation">
        {ADMIN_NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            className="shrink-0 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-secondary"
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
