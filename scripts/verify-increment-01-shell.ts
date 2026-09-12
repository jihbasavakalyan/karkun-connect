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
  'رفقاء',
  'باہمی ربط',
  'ہفتہ وار اجتماع',
  'بیت المال',
  'مواصلات',
  'رپورٹس',
  'مہمات',
  'ترتیبات',
  'رہنمائی',
]

const labels = flattenAdminNavItems(ADMIN_NAV_ITEMS).map((item) => item.label)
for (const label of REQUIRED_ADMIN_LABELS) {
  assert.ok(labels.includes(label), `Admin nav must keep ${label}`)
}

assert.ok(
  !labels.includes('تربیت و رہنمائی'),
  'تربیت و رہنمائی is a Campaigns capability, not a separate primary nav product',
)
assert.ok(!flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.id === 'tarbiyah'))
/** Increment 14 — ان باکس is under مواصلات, not a separate primary destination. */
assert.ok(!flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.id === 'inbox'))
assert.ok(!labels.includes('ان باکس'))
assert.equal(findActiveAdminNavItem('/admin/inbox', '')?.id, 'communication')
assert.equal(findActiveAdminNavItem('/admin/operations', '?tab=queue')?.id, 'campaign')
assert.equal(findActiveAdminNavItem('/admin/operations', '?tab=execute')?.id, 'campaign')
assert.equal(findActiveAdminNavItem('/admin/operations', '?tab=review')?.id, 'campaign')
assert.equal(findActiveAdminNavItem('/admin/campaign', '')?.id, 'campaign')
assert.equal(findActiveAdminNavItem('/admin/reports', '')?.id, 'reports')

assert.equal(labels.filter((label) => label === 'میقاتی منصوبہ').length, 1)
assert.doesNotMatch(labels.join('\n'), /\bMeeqati\b(?! Mansooba)/)
assert.ok(!labels.some((label) => label === 'Meeqati'))
assert.ok(!flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.to === '/admin/people'))
assert.ok(!flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.id === 'karkun'))
assert.equal(flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'rufaqa')?.label, 'رفقاء')
assert.ok(!flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.to === ROUTES.ADMIN_MISSION_WORKSPACE))
assert.ok(!flattenAdminNavItems(ADMIN_NAV_ITEMS).some((item) => item.to === ROUTES.ADMIN_ACTIVITIES))

assert.ok(adminNavPathMatches(ROUTES.ADMIN, '/admin', '', true))
assert.ok(!adminNavPathMatches(ROUTES.ADMIN, '/admin/karkun', '', true))
assert.equal(findActiveAdminNavItem('/admin/karkun/abc', '')?.id, 'rufaqa')
assert.equal(findActiveAdminNavItem('/admin/a-rukn', '')?.id, 'rufaqa')
assert.equal(findActiveAdminNavItem('/admin', '')?.id, 'home')

assert.equal(colors.primary, '#0f766e')
assert.equal(shell.rail, '#0f172a')
assert.equal(shell.accentTeal, '#0f766e')
assert.equal(shell.current, '#c99700')
assert.equal(shell.canvas, '#f7f8fa')
assert.equal(shell.ink, '#0f172a')
assert.equal(shell.attention, '#b45309')

const theme = read('src/index.css')
assert.match(theme, /--color-primary: #0f766e;/)
assert.match(theme, /--color-kc-shell: #0f172a;/)
assert.match(theme, /--color-kc-shell-teal: #0f766e;/)
assert.match(theme, /--color-kc-canvas: #f7f8fa;/)
assert.match(theme, /html\[data-theme='dark'\][\s\S]*--color-kc-canvas: #f7f8fa;/)
assert.doesNotMatch(theme, /html\[data-theme='dark'\][\s\S]*--color-primary: #2dd4bf;/)
assert.match(theme, /--font-sans: 'IBM Plex Sans'/)
assert.match(theme, /--radius-card: 1rem;/)
assert.doesNotMatch(theme, /--color-kc-shell: #0b3942;/)
assert.doesNotMatch(theme, /--color-primary: #1b4332;/)

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
assert.match(rukn, /label: 'Meeqati Mansooba'/)
assert.match(rukn, /label: 'Responsibilities'/)
assert.match(rukn, /label: 'Weekly Ijtema'/)
assert.match(rukn, /label: 'Bait-ul-Maal'/)
assert.match(rukn, /label: 'Communication'/)
assert.match(rukn, /ROUTES\.RUKN_WEEKLY_IJTEMA/)
assert.match(rukn, /ROUTES\.RUKN_MONTHLY_BAITUL_MAAL/)
assert.doesNotMatch(rukn, /label: 'Connect'/)
assert.doesNotMatch(rukn, /label: 'Connected'/)
assert.doesNotMatch(rukn, /label: 'Ijtema'/)
assert.doesNotMatch(rukn, /label: 'Baitul Maal'/)
{
  const order = [
    "label: 'Home'",
    "label: 'Karkun'",
    "label: 'Meeqati Mansooba'",
    "label: 'Responsibilities'",
    "label: 'Weekly Ijtema'",
    "label: 'Bait-ul-Maal'",
    "label: 'Communication'",
  ]
  let cursor = -1
  for (const marker of order) {
    const next = rukn.indexOf(marker)
    assert.ok(next > cursor, `Rukn primary nav order must include ${marker} after prior items`)
    cursor = next
  }
  assert.equal(
    (rukn.match(/label: 'Home'/g) ?? []).length,
    1,
    'Home must appear once in Rukn primary nav',
  )
  assert.equal(
    (rukn.match(/label: 'Weekly Ijtema'/g) ?? []).length,
    1,
    'Weekly Ijtema must appear once in Rukn primary nav',
  )
  assert.equal(
    (rukn.match(/label: 'Bait-ul-Maal'/g) ?? []).length,
    1,
    'Bait-ul-Maal must appear once in Rukn primary nav',
  )
  assert.equal(
    (rukn.match(/label: 'Communication'/g) ?? []).length,
    1,
    'Communication must appear once in Rukn primary nav',
  )
}
assert.match(rukn, /kc-shell-rail/)
assert.match(rukn, /hydration.failed && connectionScoped/)
assert.match(rukn, /PortalAuthActions/)

const karkunPage = read('src/pages/rukn/RuknKarkunPage.tsx')
assert.match(karkunPage, /RuknAddPersonQuickActions/)

console.log('OK: increment 01 shell verification passed.')
