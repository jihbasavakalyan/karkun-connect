import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'
import { Icon } from '@/components/ui/Icon'
import { findActiveAdminNavItem } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import {
  formatActiveCampaignDuration,
  getActiveCampaignName,
  getCampaignTimeline,
} from '@/services/campaignService'
import { PortalAuthActions } from '@/components/layout/PortalAuthActions'
import type { CampaignTimelineStatus } from '@/services/campaignService'
import { EnterpriseBadge } from '@/components/enterprise'
import { resolveRufaqaSearchNavigation } from '@/lib/rufaqa/rufaqaSearchNavigation'
import { RUFAQA_LABEL_UR } from '@/lib/rufaqa/rufaqaNav'

type AdminTopBarProps = {
  alertCount?: number
  alertsReady?: boolean
  mobileNavOpen?: boolean
  onMenuToggle?: () => void
}

function timelineBadgeVariant(status: CampaignTimelineStatus): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'upcoming') return 'info'
  if (status === 'completed') return 'neutral'
  return 'neutral'
}

export function AdminTopBar({
  alertCount = 0,
  alertsReady = false,
  mobileNavOpen = false,
  onMenuToggle,
}: AdminTopBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const campaignName = getActiveCampaignName()
  const duration = formatActiveCampaignDuration()
  const timeline = getCampaignTimeline()
  const currentNav = findActiveAdminNavItem(location.pathname, location.search)

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    navigate(resolveRufaqaSearchNavigation(trimmed))
  }

  const alertsLabel = alertsReady
    ? `${alertCount} operational alerts`
    : 'Operational alerts, count still loading'

  return (
    <header className="kc-shell-topbar sticky top-0 z-20 border-b lg:h-16">
      <div className="flex items-center justify-between gap-2 px-3 py-2 lg:h-full lg:py-0 lg:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-kc-shell-ink lg:hidden"
            onClick={onMenuToggle}
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            aria-controls="admin-mobile-nav"
          >
            <Icon name="menu" size="md" />
          </button>
          <div className="min-w-0 lg:hidden">
            <Logo size="sm" />
            {currentNav ? (
              <p className="truncate text-xs font-medium text-secondary" aria-current="page">
                {currentNav.label}
              </p>
            ) : null}
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold text-kc-shell-ink">
              {timeline?.status === 'active' ? campaignName || 'کارکن کنیکٹ' : 'کارکن کنیکٹ'}
            </p>
            {timeline?.status === 'active' && duration ? (
              <p className="truncate text-xs text-secondary">{duration}</p>
            ) : null}
          </div>
          {timeline?.status === 'active' ? (
            <EnterpriseBadge variant={timelineBadgeVariant(timeline.status)}>
              فعال مہم
            </EnterpriseBadge>
          ) : null}
        </div>

        <form onSubmit={handleSearch} className="order-last w-full sm:order-none sm:max-w-xs lg:max-w-md lg:flex-1">
          <label htmlFor="admin-global-search" className="sr-only">
            Search {RUFAQA_LABEL_UR}
          </label>
          <input
            id="admin-global-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`${RUFAQA_LABEL_UR}…`}
            className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text-heading placeholder:text-secondary-light focus:border-kc-shell-current focus:outline-none focus:ring-2 focus:ring-kc-shell-current/40"
          />
        </form>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to={`${ROUTES.ADMIN}#operational-alerts`}
            className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-sm text-kc-shell-ink transition-colors hover:border-kc-shell/30 hover:bg-kc-canvas"
            aria-label={alertsLabel}
            aria-busy={!alertsReady}
          >
            <Icon name="bell" size="sm" />
            {alertsReady && alertCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-kc-shell-attention px-1 text-[10px] font-bold text-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            ) : null}
          </Link>
          <PortalAuthActions portalLabel="Administrator" />
        </div>
      </div>
    </header>
  )
}
