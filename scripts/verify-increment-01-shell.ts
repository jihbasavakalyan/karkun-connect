/**
 * Increment 01 — authenticated shell foundation (nav preservation + tokens).
 * Run: npx vite-node scripts/verify-increment-01-shell.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ADMIN_NAV_ITEMS,
  adminNavPathMatches,
  findActiveAdminNavItem,
  flattenAdminNavItems,
} from '@/constants/adminNavigation'
import { colors, shell } from '@/design-system/tokens'
import { ROUTES } from '@/constants/routes'

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const REQUIRED_ADMIN_LABELS = [
  'ہوم',
  'میقاتی منصوبہ',
  'ارکان',
  'کارکنان',
  'عازمِ رکن',
  'متفقین',
  'باہمی ربط',
  'ہفتہ وار اجتماع',
  'بیت المال',
  'تربیت و رہنمائی',
  'مواصلات',
  'ان باکس',
  'رپورٹس',
  'مہمات',
  'ترتیبات',
  'رہنمائی',
]

const labels = flattenAdminNavItems(ADMIN_NAV_ITEMS).map((item) => item.label)
for (const label of REQUIRED_ADMIN_LABELS) {
  assert.ok(labels.includes(label), `Admin nav must keep ${label}`)
}

assert.equal(labels.filter((label) => label === 'میقاتی منصوبہ').length, 1)
assert.doesNotMatch(labels.join('\n'), /\bMeeqati\b(?! Mansooba)/)
assert.ok(!labels.some((label) => label === 'Meeqati'))
assert.ok(!flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.to === '/admin/people'))
assert.ok(!flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.to === ROUTES.ADMIN_MISSION_WORKSPACE))
assert.ok(!flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.to === ROUTES.ADMIN_ACTIVITIES))

assert.ok(adminNavPathMatches(ROUTES.ADMIN, '/admin', '', true))
assert.ok(!adminNavPathMatches(ROUTES.ADMIN, '/admin/karkun', '', true))
assert.equal(findActiveAdminNavItem('/admin/karkun/abc', '')?.id, 'karkun')
assert.equal(findActiveAdminNavItem('/admin', '')?.id, 'home')

assert.equal(colors.primary, '#1b4332')
assert.equal(shell.rail, '#0b3942')
assert.equal(shell.current, '#c99700')
assert.equal(shell.canvas, '#f3eee4')

const theme = read('src/index.css')
assert.match(theme, /--color-primary: #1b4332;/)
assert.match(theme, /--color-kc-shell: #0b3942;/)
assert.match(theme, /--color-kc-canvas: #f3eee4;/)

const sidebar = read('src/components/layout/AdminSidebar.tsx')
assert.match(sidebar, /variant === 'drawer'/)
assert.match(sidebar, /hidden.*lg:flex/)
assert.match(sidebar, /aria-current=\{isCurrent \? 'page' : undefined\}/)

const layout = read('src/layouts/AdminLayout.tsx')
assert.match(layout, /variant="drawer"/)
assert.match(layout, /alertsReady/)
assert.match(layout, /useRepositoryHydration/)

const topBar = read('src/components/layout/AdminTopBar.tsx')
assert.doesNotMatch(topBar, /overflow-x-auto/)
assert.match(topBar, /alertsReady/)
assert.match(topBar, /count still loading/)
assert.match(topBar, /timeline\?\.status === 'active' \? campaignName/)
assert.match(topBar, /کارکن کنیکٹ/)

const account = read('src/components/layout/PortalAuthActions.tsx')
assert.match(account, /section=profile/)
assert.match(account, /Account menu/)
assert.match(account, /ADMIN_HELP/)
assert.match(account, /handleLogout/)

const rukn = read('src/layouts/RuknLayout.tsx')
assert.match(rukn, /label: 'Home'/)
assert.match(rukn, /label: 'Karkun'/)
assert.doesNotMatch(rukn, /label: 'Connect'/)
assert.doesNotMatch(rukn, /label: 'Connected'/)
assert.match(rukn, /label: 'Communication'/)
assert.match(rukn, /label: 'Ijtema'/)
assert.match(rukn, /label: 'Baitul Maal'/)
assert.match(rukn, /kc-shell-rail/)
assert.match(rukn, /hydration.failed && connectionScoped/)
assert.match(rukn, /PortalAuthActions/)

const karkunPage = read('src/pages/rukn/RuknKarkunPage.tsx')
assert.match(karkunPage, /RuknAddPersonQuickActions/)

console.log('OK: increment 01 shell verification passed.')
