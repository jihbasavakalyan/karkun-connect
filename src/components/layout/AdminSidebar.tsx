import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'
import { ADMIN_NAV_ITEMS } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import { APP_TAGLINE } from '@/constants/app'
import { getActiveCampaignName } from '@/services/campaignService'
import { useAuth } from '@/hooks/useAuth'

type AdminSidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const { user } = useAuth()
  const campaignName = getActiveCampaignName()
  const mainNav = ADMIN_NAV_ITEMS.filter((item) => item.id !== 'help')
  const helpItem = ADMIN_NAV_ITEMS.find((item) => item.id === 'help')

  return (
    <aside
      className={[
        'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-text transition-all duration-300 lg:flex',
        collapsed ? 'w-[72px]' : 'w-60',
      ].join(' ')}
      aria-label="Administrator navigation"
    >
      <div className="border-b border-sidebar-border px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="min-w-0">
              <Logo size="sm" variant="light" />
              <p className="mt-1 truncate text-[11px] text-sidebar-text-muted">{APP_TAGLINE}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sidebar-text-muted transition-colors hover:bg-sidebar-hover hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
        {!collapsed && campaignName && (
          <p className="mt-2 truncate text-[11px] font-medium text-primary-light">{campaignName}</p>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0 overflow-y-auto p-1.5">
        {mainNav.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              [
                'group flex min-h-8 items-center gap-2 rounded-md px-2.5 py-2 text-[15px] font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-active text-white shadow-sm'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
                collapsed ? 'justify-center px-2' : '',
              ].join(' ')
            }
          >
            <span className="text-xl transition-transform group-hover:scale-110" aria-hidden="true">
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-1.5">
        {!collapsed && user && (
          <div className="enterprise-glass rounded-lg px-2.5 py-2">
            <p className="truncate text-xs font-semibold text-white">{user.email}</p>
            <p className="text-xs text-sidebar-text-muted">Administrator</p>
          </div>
        )}

        {helpItem && (
          <NavLink
            to={helpItem.to}
            title={collapsed ? helpItem.label : undefined}
            className={({ isActive }) =>
              [
                'flex min-h-8 items-center gap-2 rounded-md px-2.5 py-2 text-[15px] font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-active text-white'
                  : 'text-sidebar-text-muted hover:bg-sidebar-hover hover:text-white',
                collapsed ? 'justify-center' : '',
              ].join(' ')
            }
          >
            <span aria-hidden="true">{helpItem.icon}</span>
            {!collapsed && <span>{helpItem.label}</span>}
          </NavLink>
        )}

        {!collapsed && (
          <NavLink
            to={ROUTES.ADMIN_CAMPAIGN}
            className="block rounded-md border border-sidebar-border px-2.5 py-1.5 text-[11px] text-sidebar-text-muted transition-colors hover:border-primary-light/40 hover:text-white"
          >
            Campaign Library →
          </NavLink>
        )}
      </div>
    </aside>
  )
}
