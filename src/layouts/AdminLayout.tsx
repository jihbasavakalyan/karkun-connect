import { NavLink, Outlet } from 'react-router-dom'
import { ADMIN_NAV_ITEMS } from '@/constants/adminNavigation'
import { Logo } from '@/components/common/Logo'
import { CampaignStatusBar } from '@/components/layout/CampaignStatusBar'
import { PortalAuthActions } from '@/components/layout/PortalAuthActions'

export function AdminLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-surface-muted">
      <CampaignStatusBar />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
          <div className="border-b border-border px-6 py-5">
            <Logo size="sm" />
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4" aria-label="Admin navigation">
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'flex min-h-10 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-muted text-primary'
                      : 'text-secondary hover:bg-surface-muted hover:text-text-heading',
                  ].join(' ')
                }
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-border bg-surface px-4 py-4 lg:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="lg:hidden">
                <Logo size="sm" />
              </div>
              <p className="text-sm font-medium text-secondary lg:hidden">Administrator Portal</p>
              <PortalAuthActions portalLabel="Administrator Portal" />
            </div>

            <nav
              className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden"
              aria-label="Admin mobile navigation"
            >
              {ADMIN_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'shrink-0 rounded-full px-3 py-2 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-primary-muted text-primary'
                        : 'bg-surface-muted text-secondary',
                    ].join(' ')
                  }
                >
                  {item.icon} {item.label}
                </NavLink>
              ))}
            </nav>
          </header>

          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
