import { NavLink, Outlet } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { Logo } from '@/components/common/Logo'
import { CampaignStatusBar } from '@/components/layout/CampaignStatusBar'

const navItems = [
  { label: 'Home', to: ROUTES.ADMIN, end: true },
  { label: 'Assignments', to: `${ROUTES.ADMIN}/assignments`, end: false },
  { label: 'Reviews', to: `${ROUTES.ADMIN}/reviews`, end: false },
  { label: 'Karkunan', to: ROUTES.ADMIN_KARKUNAN, end: false },
  { label: 'Rukn Master', to: ROUTES.ADMIN_RUKN_MASTER, end: false },
  { label: 'Campaigns', to: ROUTES.ADMIN_CAMPAIGNS, end: false },
] as const

export function AdminLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-surface-muted">
      <CampaignStatusBar />

      <div className="flex min-h-0 flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="border-b border-border px-6 py-5">
          <Logo size="sm" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4" aria-label="Admin navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-muted text-primary'
                    : 'text-secondary hover:bg-surface-muted hover:text-text-heading',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-surface px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="md:hidden">
              <Logo size="sm" />
            </div>
            <p className="text-sm font-medium text-secondary">Administrator Portal</p>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      </div>
    </div>
  )
}
