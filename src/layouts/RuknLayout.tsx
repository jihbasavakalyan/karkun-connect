import { NavLink, Outlet } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Logo } from '@/components/common/Logo'
import { CampaignStatusBar } from '@/components/layout/CampaignStatusBar'
import { PortalAuthActions } from '@/components/layout/PortalAuthActions'

const navItems = [
  { label: 'Home', to: ROUTES.RUKN, end: true },
  { label: 'Available', to: ROUTES.RUKN_AVAILABLE_KARKUN, end: false },
  { label: 'My Karkun', to: ROUTES.RUKN_MY_KARKUN, end: false },
  { label: 'Record', to: ROUTES.RUKN_CAMPAIGN_RECORD, end: false },
] as const

export function RuknLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-surface-muted">
      <CampaignStatusBar />

      <header className="border-b border-border bg-surface px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Logo size="sm" />
          <PortalAuthActions portalLabel="Rukn Portal" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-24">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 border-t border-border bg-surface px-2 py-2"
        aria-label="Rukn navigation"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'flex min-h-11 flex-col items-center justify-center rounded-lg px-1 py-2 text-[10px] font-medium leading-tight transition-colors sm:text-xs',
                    isActive ? 'text-primary' : 'text-secondary hover:text-text-heading',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
