import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'
import { Icon } from '@/components/ui/Icon'
import { ADMIN_NAV_ITEMS, flattenAdminNavItems } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import {
  formatActiveCampaignDuration,
  getActiveCampaignName,
  getCampaignTimeline,
} from '@/services/campaignService'
import { PortalAuthActions } from '@/components/layout/PortalAuthActions'
import type { CampaignTimelineStatus } from '@/services/campaignService'
import { EnterpriseBadge } from '@/components/enterprise'
import { resolveUniquePersonProfilePath } from '@/lib/personProfile'
import { adminKarkunRegistryPath } from '@/lib/peopleRegistryNavigation'

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
    const trimmed = query.trim()
    if (!trimmed) return
    const profilePath = resolveUniquePersonProfilePath(trimmed)
    if (profilePath) {
      navigate(profilePath)
      return
    }
    navigate(adminKarkunRegistryPath({ search: trimmed }))
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-md lg:h-16">
      <div className="flex items-center justify-between gap-2 px-3 py-2 lg:h-full lg:py-0 lg:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-secondary lg:hidden"
            onClick={onMenuToggle}
            aria-label="Open navigation"
          >
            <Icon name="menu" size="md" />
          </button>
          <div className="min-w-0 lg:hidden">
            <Logo size="sm" />
          </div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold text-text-heading">
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
            Search Karkun
          </label>
          <input
            id="admin-global-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ارکان، کارکنان…"
            className="w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-sm text-text-heading placeholder:text-secondary-light focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-muted"
          />
        </form>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to={`${ROUTES.ADMIN}#operational-alerts`}
            className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-muted text-sm transition-colors hover:border-primary/30 hover:bg-primary-muted"
            aria-label={`${alertCount} operational alerts`}
          >
            <Icon name="bell" size="sm" />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Link>
          <Link
            to={ROUTES.ADMIN_SETTINGS}
            className="hidden h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-muted text-sm transition-colors hover:border-primary/30 sm:flex"
            aria-label="Settings"
          >
            <Icon name="settings" size="sm" />
          </Link>
          <PortalAuthActions portalLabel="Administrator" />
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-t border-border px-4 py-2 lg:hidden" aria-label="Admin mobile navigation">
        {flattenAdminNavItems(ADMIN_NAV_ITEMS.filter((entry) => entry.id !== 'help')).map((item) => (
          <Link
            key={item.id}
            to={item.to}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-secondary"
          >
            <Icon name={item.icon} size="sm" />
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
