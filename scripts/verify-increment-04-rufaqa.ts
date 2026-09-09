/**
 * Increment 04 — Rufaqa presentation/navigation unification.
 * Run: npx vite-node scripts/verify-increment-04-rufaqa.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ADMIN_NAV_ITEMS, findActiveAdminNavItem, flattenAdminNavItems } from '@/constants/adminNavigation'
import { ROUTES } from '@/constants/routes'
import {
  parseRufaqaGenderView,
  rufaqaCategoryFromPathname,
  rufaqaCategoryPath,
  storedGenderFromView,
  RUFAQA_LABEL_UR,
} from '@/lib/rufaqa/rufaqaPresentation'
import { matchesKarkunRegistrySearch } from '@/lib/peopleSearch'

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

assert.equal(RUFAQA_LABEL_UR, 'رفقاء')
assert.notEqual(RUFAQA_LABEL_UR, 'رفقا')

const nav = flattenAdminNavItems(ADMIN_NAV_ITEMS)
assert.equal(nav.filter((item) => item.id === 'rufaqa').length, 1)
assert.ok(!nav.some((item) => item.to === '/admin/people'))
assert.ok(!nav.some((item) => item.to === '/admin/rufaqa'))
assert.ok(!nav.some((item) => ['rukn', 'karkun', 'a-rukn', 'muttafiqeen'].includes(item.id)))
assert.equal(findActiveAdminNavItem('/admin/rukn', '')?.id, 'rufaqa')
assert.equal(findActiveAdminNavItem('/admin/karkun', '')?.id, 'rufaqa')
assert.equal(findActiveAdminNavItem('/admin/muttafiqeen', '')?.id, 'rufaqa')
assert.equal(findActiveAdminNavItem('/admin/a-rukn/AR01', '')?.id, 'rufaqa')
assert.equal(findActiveAdminNavItem('/admin/assignments', '')?.id, 'assignments')

assert.equal(rufaqaCategoryFromPathname('/admin/rukn'), 'rukn')
assert.equal(rufaqaCategoryFromPathname('/admin/a-rukn'), 'a-rukn')
assert.equal(rufaqaCategoryFromPathname('/admin/karkun/kr-1'), 'karkun')
assert.equal(rufaqaCategoryFromPathname('/admin/muttafiqeen'), 'muttafiqeen')

assert.equal(parseRufaqaGenderView(new URLSearchParams()), 'all')
assert.equal(parseRufaqaGenderView(new URLSearchParams('gender=Male')), 'men')
assert.equal(parseRufaqaGenderView(new URLSearchParams('gender=Female')), 'women')
assert.equal(storedGenderFromView('all'), '')
assert.equal(storedGenderFromView('men'), 'Male')
assert.equal(storedGenderFromView('women'), 'Female')

assert.equal(rufaqaCategoryPath('karkun', { search: '7795' }), `${ROUTES.ADMIN_KARKUN}?search=7795`)
assert.match(rufaqaCategoryPath('rukn', { gender: 'Male' }), /\/admin\/rukn\?gender=Male/)

const router = read('src/routes/AppRouter.tsx')
assert.match(router, /path="rukn"/)
assert.match(router, /path="a-rukn"/)
assert.match(router, /path="karkun"/)
assert.match(router, /path="muttafiqeen"/)
assert.doesNotMatch(router, /path="people"/)
assert.doesNotMatch(router, /path="rufaqa"/)

assert.ok(
  matchesKarkunRegistrySearch(
    {
      id: 'kr-1',
      name: 'Test Person',
      mobile: '9876543210',
      fatherHusbandName: 'Father Name',
      area: 'Ward 4',
      place: 'Basavakalyan',
      address: 'Line 1',
      gender: 'Male',
      status: 'active',
      assignmentStatus: 'Available',
      assignedRukn: '',
      assignedRuknId: '',
    } as never,
    'Father',
  ),
)

const navSource = read('src/constants/adminNavigation.ts')
assert.match(navSource, /id: 'rufaqa'/)
assert.match(navSource, /RUFAQA_LABEL_UR/)
assert.doesNotMatch(navSource, /id: 'karkun'/)
assert.match(read('src/lib/rufaqa/rufaqaNav.ts'), /رفقاء/)
assert.match(read('src/components/admin/RufaqaDirectoryShell.tsx'), /RUFAQA_LABEL_UR/)

console.log('OK: increment 04 Rufaqa verification passed.')
