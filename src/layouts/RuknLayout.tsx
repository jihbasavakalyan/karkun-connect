import { NavLink, Outlet } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Logo } from '@/components/common/Logo'
import { CampaignStatusBar } from '@/components/layout/CampaignStatusBar'

const navItems = [
  { label: 'Home', to: ROUTES.RUKN, end: true },
  { label: 'Available Karkun', to: ROUTES.RUKN_AVAILABLE_KARKUN, end: false },
  { label: 'My Karkun', to: ROUTES.RUKN_MY_KARKUN, end: false },
  { label: 'Reports', to: `${ROUTES.RUKN}/reports`, end: false },
] as const

export function RuknLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-surface-muted">
      <CampaignStatusBar />

      <header className="border-b border-border bg-surface px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Logo size="sm" />
          <span className="text-sm font-medium text-secondary">Rukn Portal</span>
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
                    'flex flex-col items-center rounded-lg px-1 py-2 text-[10px] font-medium leading-tight transition-colors sm:text-xs',
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
