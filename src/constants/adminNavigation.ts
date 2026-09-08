import { adminFollowUpPath, ROUTES } from '@/constants/routes'
import type { IconName } from '@/design-system/iconNames'

/** Single destination in the admin sidebar / mobile nav. */
export type AdminNavItem = {
  id: string
  label: string
  icon: IconName
  to: string
  end?: boolean
  /** Visual weight only — does not change routing. */
  emphasis?: 'home' | 'foundation' | 'muted'
}

/**
 * Expandable nav group (KC-0115).
 * Children are the stable destinations; parent `to` is the hub / default landing.
 */
export type AdminNavGroup = {
  id: string
  label: string
  icon: IconName
  to: string
  children: AdminNavItem[]
}

export type AdminNavEntry = AdminNavItem | AdminNavGroup

export function isAdminNavGroup(entry: AdminNavEntry): entry is AdminNavGroup {
  return Array.isArray((entry as AdminNavGroup).children)
}

/**
 * Admin landing + functional modules.
 * Home is the landing surface, not a functional organisational module.
 * میقاتی منصوبہ is the permanent planning foundation.
 * Existing routes are reused — no new destinations.
 */
export const ADMIN_NAV_ITEMS: AdminNavEntry[] = [
  { id: 'home', label: 'ہوم', icon: 'home', to: ROUTES.ADMIN, end: true, emphasis: 'home' },
  {
    id: 'planning',
    label: 'میقاتی منصوبہ',
    icon: 'flag',
    to: ROUTES.ADMIN_PLANNING,
    emphasis: 'foundation',
  },
  { id: 'rukn', label: 'ارکان', icon: 'user', to: ROUTES.ADMIN_RUKN },
  { id: 'karkun', label: 'کارکنان', icon: 'users', to: ROUTES.ADMIN_KARKUN },
  { id: 'a-rukn', label: 'عازمِ رکن', icon: 'sparkles', to: ROUTES.ADMIN_A_RUKN },
  { id: 'muttafiqeen', label: 'متفقین', icon: 'heart', to: ROUTES.ADMIN_MUTTAFIQEEN },
  { id: 'assignments', label: 'باہمی ربط', icon: 'link', to: ROUTES.ADMIN_ASSIGNMENTS },
  { id: 'weekly-ijtema', label: 'ہفتہ وار اجتماع', icon: 'calendar', to: ROUTES.ADMIN_WEEKLY_IJTEMA },
  {
    id: 'monthly-baitul-maal',
    label: 'بیت المال',
    icon: 'handshake',
    to: ROUTES.ADMIN_MONTHLY_BAITUL_MAAL,
  },
  {
    id: 'tarbiyah',
    label: 'تربیت و رہنمائی',
    icon: 'sprout',
    to: adminFollowUpPath(),
  },
  { id: 'communication', label: 'مواصلات', icon: 'megaphone', to: ROUTES.ADMIN_COMMUNICATION },
  { id: 'inbox', label: 'ان باکس', icon: 'message', to: ROUTES.ADMIN_INBOX },
  { id: 'reports', label: 'رپورٹس', icon: 'file-text', to: ROUTES.ADMIN_REPORTS },
  {
    id: 'campaign',
    label: 'مہمات',
    icon: 'chart',
    to: ROUTES.ADMIN_CAMPAIGN,
    emphasis: 'muted',
  },
  { id: 'settings', label: 'ترتیبات', icon: 'settings', to: ROUTES.ADMIN_SETTINGS },
  { id: 'help', label: 'رہنمائی', icon: 'help', to: ROUTES.ADMIN_HELP },
]

/** Flat leaves for mobile strip and active-route matching. */
export function flattenAdminNavItems(entries: AdminNavEntry[] = ADMIN_NAV_ITEMS): AdminNavItem[] {
  const out: AdminNavItem[] = []
  for (const entry of entries) {
    if (isAdminNavGroup(entry)) {
      out.push({ id: entry.id, label: entry.label, icon: entry.icon, to: entry.to })
      out.push(...entry.children)
    } else {
      out.push(entry)
    }
  }
  return out
}

export function adminNavPathMatches(
  to: string,
  pathname: string,
  search: string,
  end?: boolean,
): boolean {
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

export function findActiveAdminNavItem(
  pathname: string,
  search: string,
  entries: AdminNavEntry[] = ADMIN_NAV_ITEMS,
): AdminNavItem | null {
  const leaves = flattenAdminNavItems(entries)
  const ranked = leaves
    .filter((item) => adminNavPathMatches(item.to, pathname, search, item.end))
    .sort((a, b) => b.to.length - a.to.length)
  return ranked[0] ?? null
}
