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
import { useAuth } from '@/hooks/useAuth'

type AdminSidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

function pathMatches(to: string, pathname: string, search: string, end?: boolean): boolean {
  const url = new URL(to, 'https://kc.local')
  const targetPath = url.pathname.replace(/\/$/, '') || '/'
  const currentPath = pathname.replace(/\/$/, '') || '/'
  const pathOk = end
    ? currentPath === targetPath
    : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
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

function leafClassName(item: AdminNavItem, isActive: boolean, collapsed: boolean): string {
  const emphasis = item.emphasis
  return [
    'group flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[15px] font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300',
    isActive
      ? emphasis === 'foundation'
        ? 'bg-teal-700 text-white shadow-sm'
        : 'bg-sidebar-active text-white shadow-sm'
      : emphasis === 'foundation'
        ? 'text-teal-100 hover:bg-teal-800/70 hover:text-white'
        : emphasis === 'muted'
          ? 'text-sidebar-text-muted hover:bg-sidebar-hover hover:text-white'
          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
    emphasis === 'home' && !isActive ? 'text-white' : '',
    collapsed ? 'justify-center px-2' : '',
  ].join(' ')
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
      className={({ isActive }) => leafClassName(item, isActive, collapsed)}
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
            'group flex min-h-11 items-center justify-center rounded-lg px-2 py-2 text-[15px] font-medium transition-all duration-200',
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
            'group flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[15px] font-medium transition-all duration-200',
            hubActive && !childActive
              ? 'bg-sidebar-active text-white shadow-sm'
              : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
          ].join(' ')
        }
      >
        <Icon name={group.icon} size="lg" className="text-current" />
        <span>{group.label}</span>
      </NavLink>
      <ul
        className="ms-3 space-y-0.5 border-s border-sidebar-border ps-2"
        aria-label={`${group.label} modules`}
      >
        {group.children.map((child) => (
          <li key={child.id}>
            <NavLink
              to={child.to}
              className={() =>
                [
                  'flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-200',
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
  const mainNav = ADMIN_NAV_ITEMS.filter((item) => item.id !== 'help' && item.id !== 'settings')
  const settingsItem = ADMIN_NAV_ITEMS.find((item) => item.id === 'settings')
  const helpItem = ADMIN_NAV_ITEMS.find((item) => item.id === 'help')

  return (
    <aside
      className={[
        'hidden min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-text transition-all duration-300 lg:flex',
        collapsed ? 'w-[72px]' : 'w-60',
      ].join(' ')}
      aria-label="منتظم نیویگیشن"
      dir="rtl"
      lang="ur"
    >
      <div className="border-b border-sidebar-border px-2.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="min-w-0">
              <Logo size="sm" variant="light" />
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sidebar-text-muted transition-colors hover:bg-sidebar-hover hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {mainNav.map((entry) => renderNavEntry(entry, collapsed))}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-2">
        {settingsItem && !isAdminNavGroup(settingsItem) ? (
          <NavLeafLink item={settingsItem} collapsed={collapsed} />
        ) : null}
        {helpItem && !isAdminNavGroup(helpItem) ? (
          <NavLeafLink item={helpItem} collapsed={collapsed} />
        ) : null}
        {!collapsed && user && (
          <div className="rounded-lg px-2.5 py-2">
            <p className="truncate text-xs font-semibold text-white">{user.email}</p>
            <p className="text-xs text-sidebar-text-muted">منتظم</p>
          </div>
        )}
      </div>
    </aside>
  )
}
