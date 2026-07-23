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
import { DigitalRafeeqLauncher } from '@/features/digitalRafeeq/launcher'
import { ExecutionSaveToast } from '@/components/execution/ExecutionSaveToast'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import { RuknCommandCenterProvider } from '@/providers/RuknCommandCenterProvider'

/** KC-0093 — Communication is primary workspace; Record remains route-only (workflow, not destination). */
const navItems: { label: string; icon: IconName; to: string; end: boolean }[] = [
  { label: 'Home', icon: 'home', to: ROUTES.RUKN, end: true },
  { label: 'Connect', icon: 'search', to: ROUTES.RUKN_AVAILABLE_KARKUN, end: false },
  { label: 'Connected', icon: 'users', to: ROUTES.RUKN_MY_KARKUN, end: false },
  { label: 'Communication', icon: 'message', to: ROUTES.RUKN_COMMUNICATION, end: false },
  { label: 'Ijtema', icon: 'calendar', to: ROUTES.RUKN_WEEKLY_IJTEMA, end: false },
]

export function RuknLayout() {
  const campaignName = getActiveCampaignName()
  const duration = formatActiveCampaignDuration()
  const timeline = getCampaignTimeline()
  useKeyboardInset()

  return (
    <RuknCommandCenterProvider>
    <div className="native-shell flex min-h-svh flex-col bg-surface-muted">
      <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
        <div className="enterprise-gradient-hero px-3 py-2 text-white lg:px-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <Logo size="sm" variant="light" />
            <PortalAuthActions portalLabel="Rukn Portal" tone="on-dark" />
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

      <main className="native-main mx-auto w-full max-w-5xl flex-1 px-3 py-3 lg:px-6 lg:py-5">
        <Outlet />
      </main>

      <nav
        className="native-bottom-nav fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 px-2 pt-2 shadow-[0_-4px_20px_rgb(0_0_0/0.06)] backdrop-blur-md"
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
                    'native-nav-item flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight transition-all duration-200 sm:text-xs',
                    isActive
                      ? 'bg-primary-muted text-primary native-nav-item-active'
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

      <ExecutionSaveToast />
      <DigitalRafeeqLauncher role="rukn" offsetClassName="digital-rafeeq-fab-offset-rukn" />
    </div>
    </RuknCommandCenterProvider>
  )
}
