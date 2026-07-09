import { NavLink, Outlet } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Logo } from '@/components/common/Logo'
import { PortalAuthActions } from '@/components/layout/PortalAuthActions'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'
import {
  formatActiveCampaignDuration,
  getActiveCampaignName,
  getCampaignTimeline,
} from '@/services/campaignService'
import { EnterpriseBadge } from '@/components/enterprise'

const navItems: { label: string; icon: IconName; to: string; end: boolean }[] = [
  { label: 'Home', icon: 'home', to: ROUTES.RUKN, end: true },
  { label: 'Connect', icon: 'search', to: ROUTES.RUKN_AVAILABLE_KARKUN, end: false },
  { label: 'Connected', icon: 'users', to: ROUTES.RUKN_MY_KARKUN, end: false },
  { label: 'Record', icon: 'chart', to: ROUTES.RUKN_CAMPAIGN_RECORD, end: false },
]

export function RuknLayout() {
  const campaignName = getActiveCampaignName()
  const duration = formatActiveCampaignDuration()
  const timeline = getCampaignTimeline()

  return (
    <div className="flex min-h-svh flex-col bg-surface-muted">
      <header className="border-b border-border bg-surface">
        <div className="enterprise-gradient-hero px-3 py-2 text-white lg:px-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <Logo size="sm" variant="light" />
            <PortalAuthActions portalLabel="Rukn Portal" />
          </div>
          <div className="mx-auto max-w-5xl">
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{campaignName}</p>
              {timeline && (
                <EnterpriseBadge variant={timeline.status === 'active' ? 'success' : 'info'}>
                  {timeline.dayLabel}
                </EnterpriseBadge>
              )}
              <p className="text-xs text-white/80">{duration}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 pb-20 lg:px-6 lg:py-6">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur-md px-2 py-2 shadow-[0_-4px_20px_rgb(0_0_0/0.06)]"
        aria-label="Rukn navigation"
      >
        <ul className="mx-auto flex max-w-5xl items-stretch justify-around">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight transition-colors sm:text-xs',
                    isActive
                      ? 'bg-primary-muted text-primary'
                      : 'text-secondary hover:bg-surface-muted hover:text-text-heading',
                  ].join(' ')
                }
              >
                <Icon name={item.icon} size="lg" className="text-current" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
