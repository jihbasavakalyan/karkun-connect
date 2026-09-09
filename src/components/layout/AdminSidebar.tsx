import { NavLink, useLocation } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'
import { Icon } from '@/components/ui/Icon'
import {
  ADMIN_NAV_ITEMS,
  adminNavItemMatches,
  adminNavPathMatches,
  isAdminNavGroup,
  type AdminNavEntry,
  type AdminNavGroup,
  type AdminNavItem,
} from '@/constants/adminNavigation'
import { useAuth } from '@/hooks/useAuth'

type AdminSidebarProps = {
  collapsed: boolean
  onToggle: () => void
  /** Desktop rail is hidden below lg; the drawer variant must stay visible. */
  variant?: 'desktop' | 'drawer'
  onNavigate?: () => void
}

function groupHasActiveChild(group: AdminNavGroup, pathname: string, search: string): boolean {
  return group.children.some((child) => adminNavPathMatches(child.to, pathname, search))
}

function navItemClass(item: AdminNavItem, isCurrent: boolean, collapsed: boolean): string {
  const muted = item.emphasis === 'muted'
  return [
    'kc-shell-nav-item group',
    isCurrent
      ? 'kc-shell-nav-item-current'
      : muted
        ? 'kc-shell-nav-item-muted'
        : 'kc-shell-nav-item-idle',
    collapsed ? 'justify-center px-2' : '',
  ].join(' ')
}

function NavLeafLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: AdminNavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()
  const isCurrent = adminNavItemMatches(item, location.pathname, location.search)

  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      aria-current={isCurrent ? 'page' : undefined}
      className={navItemClass(item, isCurrent, collapsed)}
      onClick={onNavigate}
    >
      <Icon name={item.icon} size="lg" className="text-current" />
      {!collapsed && <span className="min-w-0 text-start leading-snug">{item.label}</span>}
    </NavLink>
  )
}

function NavGroupBlock({
  group,
  collapsed,
  onNavigate,
}: {
  group: AdminNavGroup
  collapsed: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()
  const childActive = groupHasActiveChild(group, location.pathname, location.search)
  const hubActive = adminNavPathMatches(group.to, location.pathname, location.search)
  const current = childActive || hubActive

  if (collapsed) {
    return (
      <NavLink
        to={group.to}
        title={group.label}
        aria-current={current ? 'page' : undefined}
        className={[
          'kc-shell-nav-item justify-center px-2',
          current ? 'kc-shell-nav-item-current' : 'kc-shell-nav-item-idle',
        ].join(' ')}
        onClick={onNavigate}
      >
        <Icon name={group.icon} size="lg" className="text-current" />
      </NavLink>
    )
  }

  return (
    <div className="space-y-0.5">
      <NavLink
        to={group.to}
        aria-current={hubActive && !childActive ? 'page' : undefined}
        className={[
          'kc-shell-nav-item',
          hubActive && !childActive ? 'kc-shell-nav-item-current' : 'kc-shell-nav-item-idle',
        ].join(' ')}
        onClick={onNavigate}
      >
        <Icon name={group.icon} size="lg" className="text-current" />
        <span className="min-w-0 text-start leading-snug">{group.label}</span>
      </NavLink>
      <ul
        className="ms-3 space-y-0.5 border-s border-kc-shell-border ps-2"
        aria-label={`${group.label} modules`}
      >
        {group.children.map((child) => (
          <li key={child.id}>
            <NavLink
              to={child.to}
              aria-current={
                adminNavPathMatches(child.to, location.pathname, location.search)
                  ? 'page'
                  : undefined
              }
              className={[
                'kc-shell-nav-item min-h-10 py-1.5 text-sm',
                adminNavPathMatches(child.to, location.pathname, location.search)
                  ? 'kc-shell-nav-item-current'
                  : 'kc-shell-nav-item-muted',
              ].join(' ')}
              onClick={onNavigate}
            >
              <Icon name={child.icon} size="sm" className="text-current" />
              <span className="min-w-0 text-start leading-snug">{child.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function renderNavEntry(
  entry: AdminNavEntry,
  collapsed: boolean,
  onNavigate?: () => void,
) {
  if (isAdminNavGroup(entry)) {
    return (
      <NavGroupBlock key={entry.id} group={entry} collapsed={collapsed} onNavigate={onNavigate} />
    )
  }
  return <NavLeafLink key={entry.id} item={entry} collapsed={collapsed} onNavigate={onNavigate} />
}

export function AdminSidebar({
  collapsed,
  onToggle,
  variant = 'desktop',
  onNavigate,
}: AdminSidebarProps) {
  const { user } = useAuth()
  const isDrawer = variant === 'drawer'
  const mainNav = ADMIN_NAV_ITEMS.filter((item) => item.id !== 'help' && item.id !== 'settings')
  const settingsItem = ADMIN_NAV_ITEMS.find((item) => item.id === 'settings')
  const helpItem = ADMIN_NAV_ITEMS.find((item) => item.id === 'help')

  return (
    <aside
      className={[
        'min-h-0 shrink-0 flex-col border-e kc-shell-rail',
        isDrawer ? 'flex h-full w-full' : 'hidden transition-all duration-300 lg:flex',
        !isDrawer && collapsed ? 'w-[72px]' : '',
        !isDrawer && !collapsed ? 'w-60' : '',
      ].join(' ')}
      aria-label="منتظم نیویگیشن"
      dir="rtl"
      lang="ur"
    >
      <div className="border-b border-kc-shell-border px-2.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="min-w-0">
              <Logo size="sm" variant="light" />
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-kc-shell-text-muted transition-colors hover:bg-kc-shell-hover hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kc-shell-current"
            aria-label={
              isDrawer ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'
            }
          >
            {isDrawer ? <Icon name="x" size="md" /> : collapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {mainNav.map((entry) => renderNavEntry(entry, collapsed, onNavigate))}
      </nav>

      <div className="space-y-1 border-t border-kc-shell-border p-2">
        {settingsItem && !isAdminNavGroup(settingsItem) ? (
          <NavLeafLink item={settingsItem} collapsed={collapsed} onNavigate={onNavigate} />
        ) : null}
        {helpItem && !isAdminNavGroup(helpItem) ? (
          <NavLeafLink item={helpItem} collapsed={collapsed} onNavigate={onNavigate} />
        ) : null}
        {!collapsed && user && (
          <div className="rounded-lg px-2.5 py-2">
            <p className="truncate text-xs font-semibold text-white">{user.email}</p>
            <p className="text-xs text-kc-shell-text-muted">منتظم</p>
          </div>
        )}
      </div>
    </aside>
  )
}
