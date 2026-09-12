import { ROUTES } from '@/constants/routes'
import { RUFAQA_LABEL_UR, RUFAQA_PATH_PREFIXES } from '@/lib/rufaqa/rufaqaNav'
import type { IconName } from '@/design-system/iconNames'

/** Single destination in the admin sidebar / mobile nav. */
export type AdminNavItem = {
  id: string
  label: string
  icon: IconName
  to: string
  end?: boolean
  /** Extra path prefixes that keep this item current (presentation only). */
  matchPrefixes?: readonly string[]
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
 * Paths that belong to the مہمات product surface while using existing ops routes.
 * Presentation matching only — does not change Follow-up / Execution / Review modules.
 */
export const CAMPAIGN_PRODUCT_PATH_PREFIXES = [
  ROUTES.ADMIN_CAMPAIGN,
  ROUTES.ADMIN_OPERATIONS,
  ROUTES.ADMIN_ACTIVITIES,
  ROUTES.ADMIN_FOLLOW_UP,
  ROUTES.ADMIN_EXECUTION,
  ROUTES.ADMIN_COMPLIANCE,
  ROUTES.ADMIN_REVIEW,
] as const

/**
 * Admin landing + functional modules.
 * Home is the landing surface, not a functional organisational module.
 * میقاتی منصوبہ is the permanent planning foundation.
 * Existing registry routes remain valid deep links under Rufaqa.
 * Follow-up (تربیت و رہنمائی) is a capability inside مہمات — not a separate product.
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
  {
    id: 'rufaqa',
    label: RUFAQA_LABEL_UR,
    icon: 'users',
    to: ROUTES.ADMIN_RUKN,
    matchPrefixes: RUFAQA_PATH_PREFIXES,
  },
  { id: 'assignments', label: 'باہمی ربط', icon: 'link', to: ROUTES.ADMIN_ASSIGNMENTS },
  { id: 'weekly-ijtema', label: 'ہفتہ وار اجتماع', icon: 'calendar', to: ROUTES.ADMIN_WEEKLY_IJTEMA },
  {
    id: 'monthly-baitul-maal',
    label: 'بیت المال',
    icon: 'handshake',
    to: ROUTES.ADMIN_MONTHLY_BAITUL_MAAL,
  },
  {
    id: 'campaign',
    label: 'مہمات',
    icon: 'chart',
    to: ROUTES.ADMIN_CAMPAIGN,
    matchPrefixes: CAMPAIGN_PRODUCT_PATH_PREFIXES,
  },
  /**
   * Increment 14 — مواصلات is the primary Communication product.
   * ان باکس remains at /admin/inbox (deep link) and is matched under مواصلات.
   */
  {
    id: 'communication',
    label: 'مواصلات',
    icon: 'megaphone',
    to: ROUTES.ADMIN_COMMUNICATION,
    matchPrefixes: [ROUTES.ADMIN_COMMUNICATION, ROUTES.ADMIN_INBOX, ROUTES.ADMIN_LISTS, ROUTES.ADMIN_COMMUNICATION_HISTORY],
  },
  { id: 'reports', label: 'رپورٹس', icon: 'file-text', to: ROUTES.ADMIN_REPORTS },
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

export function adminNavItemMatches(
  item: AdminNavItem,
  pathname: string,
  search: string,
): boolean {
  const prefixes = item.matchPrefixes?.length ? item.matchPrefixes : [item.to]
  return prefixes.some((prefix) => adminNavPathMatches(prefix, pathname, search, item.end))
}

export function findActiveAdminNavItem(
  pathname: string,
  search: string,
  entries: AdminNavEntry[] = ADMIN_NAV_ITEMS,
): AdminNavItem | null {
  const leaves = flattenAdminNavItems(entries)
  const ranked = leaves
    .filter((item) => adminNavItemMatches(item, pathname, search))
    .sort((a, b) => {
      const aLen = Math.max(
        a.to.length,
        ...(a.matchPrefixes ?? []).map((prefix) => prefix.length),
      )
      const bLen = Math.max(
        b.to.length,
        ...(b.matchPrefixes ?? []).map((prefix) => prefix.length),
      )
      return bLen - aLen
    })
  return ranked[0] ?? null
}
