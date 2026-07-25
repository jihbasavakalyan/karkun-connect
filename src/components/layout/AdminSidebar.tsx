import { NavLink, useLocation } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'
import { Icon } from '@/components/ui/Icon'
import {
  ADMIN_NAV_ITEMS,
  isAdminNavGroup,
  type AdminNavEntry,
  type AdminNavGroup,
  type AdminNavItem,
} from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import { APP_TAGLINE } from '@/constants/app'
import { getActiveCampaignName } from '@/services/campaignService'
import { useAuth } from '@/hooks/useAuth'

type AdminSidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

function pathMatches(to: string, pathname: string, search: string, end?: boolean): boolean {
  const url = new URL(to, 'https://kc.local')
  const targetPath = url.pathname.replace(/\/$/, '') || '/'
  const currentPath = pathname.replace(/\/$/, '') || '/'
  const pathOk = end ? currentPath === targetPath : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
  if (!pathOk) return false
  if (!url.search) return true
  const want = new URLSearchParams(url.search)
  const have = new URLSearchParams(search)
  for (const [key, value] of want.entries()) {
    if (have.get(key) !== value) return false
  }
  return true
}

function groupHasActiveChild(group: AdminNavGroup, pathname: string, search: string): boolean {
  return group.children.some((child) => pathMatches(child.to, pathname, search))
}

function NavLeafLink({
  item,
  collapsed,
}: {
  item: AdminNavItem
  collapsed: boolean
}) {
  return (
    <NavLink
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
      <Icon name={item.icon} size="lg" className="text-current" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

function NavGroupBlock({
  group,
  collapsed,
}: {
  group: AdminNavGroup
  collapsed: boolean
}) {
  const location = useLocation()
  const childActive = groupHasActiveChild(group, location.pathname, location.search)
  const hubActive = pathMatches(group.to, location.pathname, location.search)

  if (collapsed) {
    return (
      <NavLink
        to={group.to}
        title={group.label}
        className={() =>
          [
            'group flex min-h-8 items-center justify-center rounded-md px-2 py-2 text-[15px] font-medium transition-all duration-200',
            childActive || hubActive
              ? 'bg-sidebar-active text-white shadow-sm'
              : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
          ].join(' ')
        }
      >
        <Icon name={group.icon} size="lg" className="text-current" />
      </NavLink>
    )
  }

  return (
    <div className="space-y-0.5">
      <NavLink
        to={group.to}
        className={() =>
          [
            'group flex min-h-8 items-center gap-2 rounded-md px-2.5 py-2 text-[15px] font-medium transition-all duration-200',
            hubActive && !childActive
              ? 'bg-sidebar-active text-white shadow-sm'
              : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
          ].join(' ')
        }
      >
        <Icon name={group.icon} size="lg" className="text-current" />
        <span>{group.label}</span>
      </NavLink>
      <ul className="ms-3 space-y-0.5 border-s border-sidebar-border ps-2" aria-label={`${group.label} modules`}>
        {group.children.map((child) => (
          <li key={child.id}>
            <NavLink
              to={child.to}
              className={() =>
                [
                  'flex min-h-8 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200',
                  pathMatches(child.to, location.pathname, location.search)
                    ? 'bg-sidebar-active text-white shadow-sm'
                    : 'text-sidebar-text-muted hover:bg-sidebar-hover hover:text-white',
                ].join(' ')
              }
            >
              <Icon name={child.icon} size="sm" className="text-current" />
              <span>{child.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function renderNavEntry(entry: AdminNavEntry, collapsed: boolean) {
  if (isAdminNavGroup(entry)) {
    return <NavGroupBlock key={entry.id} group={entry} collapsed={collapsed} />
  }
  return <NavLeafLink key={entry.id} item={entry} collapsed={collapsed} />
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const { user } = useAuth()
  const campaignName = getActiveCampaignName()
  const mainNav = ADMIN_NAV_ITEMS.filter((item) => item.id !== 'help')
  const helpItem = ADMIN_NAV_ITEMS.find((item) => item.id === 'help')

  return (
    <aside
      className={[
        'hidden min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-text transition-all duration-300 lg:flex',
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

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
        {mainNav.map((entry) => renderNavEntry(entry, collapsed))}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-1.5">
        {!collapsed && user && (
          <div className="enterprise-glass rounded-lg px-2.5 py-2">
            <p className="truncate text-xs font-semibold text-white">{user.email}</p>
            <p className="text-xs text-sidebar-text-muted">Administrator</p>
          </div>
        )}

        {helpItem && !isAdminNavGroup(helpItem) ? (
          <NavLeafLink item={helpItem} collapsed={collapsed} />
        ) : null}

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
