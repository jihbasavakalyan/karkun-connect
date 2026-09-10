/**
 * Increment 10 — Rukn Karkun workspace presentation.
 * Run: npx vite-node scripts/verify-increment-10-karkun.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROUTES, ruknKarkunPath } from '@/constants/routes'
import { isPathAllowedForRole } from '@/lib/auth/authorization'

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

assert.equal(ROUTES.RUKN_KARKUN, '/rukn/karkun')
assert.equal(ruknKarkunPath(), ROUTES.RUKN_KARKUN)
assert.equal(ruknKarkunPath('mine'), ROUTES.RUKN_KARKUN)
assert.equal(ruknKarkunPath('available'), '/rukn/karkun?view=available')
assert.equal(isPathAllowedForRole('/rukn/karkun', 'rukn'), true)
assert.equal(isPathAllowedForRole('/rukn/karkun', 'administrator'), false)

const layout = read('src/layouts/RuknLayout.tsx')
assert.match(layout, /label: 'Home'/)
assert.match(layout, /label: 'Karkun'/)
assert.match(layout, /label: 'Meeqati Mansooba'/)
assert.match(layout, /label: 'Responsibilities'/)
assert.match(layout, /label: 'Communication'/)
assert.match(layout, /to: ROUTES.RUKN_KARKUN/)

const page = read('src/pages/rukn/RuknKarkunPage.tsx')
assert.match(page, />Karkun</)
assert.match(page, /My Karkun/)
assert.match(page, />\s*Available\s*</)
assert.match(page, /searchParams.get\('view'\) === 'available' \? 'available' : 'mine'/)
assert.match(page, /ruknKarkunPath\('mine'\)/)
assert.match(page, /ruknKarkunPath\('available'\)/)
assert.match(page, /role="tablist"/)
assert.match(page, /role="tabpanel"/)
assert.match(page, /MyKarkunPage/)
assert.match(page, /AvailableKarkunPage/)
assert.match(page, /RuknAddPersonQuickActions/)
assert.match(page, /tone="secondary"/)
assert.doesNotMatch(page, /باہمی ربط/)
assert.doesNotMatch(page, /Mission Workspace/)
assert.doesNotMatch(page, /RuknHomePage/)
assert.doesNotMatch(page, /TarbiyatiIjtemaRuknHero/)

const mine = read('src/pages/rukn/MyKarkunPage.tsx')
assert.match(mine, /matchesKarkunRegistrySearch/)
assert.match(mine, /getAssignedKarkunanForRukn/)
assert.match(mine, /ConnectedKarkunCard/)
assert.match(mine, /KarkunSearchField/)
assert.match(mine, /No connections yet/)
assert.match(mine, /No matches/)

const available = read('src/pages/rukn/AvailableKarkunPage.tsx')
assert.match(available, /getAvailableKarkunan/)
assert.match(available, /assignKarkun/)
assert.match(available, /AvailableKarkunRow/)
assert.match(available, /ConnectKarkunConfirmModal/)
assert.match(available, /ConnectMuttafiqRequestModal/)
assert.match(available, /Link Muttafiq/)
assert.match(available, /isAvailableKarkunPoolHydrateFailed/)
assert.match(available, /humanizeAvailableKarkunStatus/)
assert.match(available, /matchesKarkunRegistrySearch/)
assert.doesNotMatch(available, /bulk/)

const add = read('src/components/relationship/RuknAddPersonQuickActions.tsx')
assert.match(add, /NewKarkunRequestModal/)
assert.match(add, /NewMuttafiqRequestModal/)
assert.match(add, /Add Karkun/)
assert.match(add, /Add Muttafiq/)

const card = read('src/components/relationship/ConnectedKarkunCard.tsx')
assert.match(card, /Record Visit/)
assert.match(card, /Call/)
assert.match(card, /WhatsApp/)
assert.match(card, /Schedule/)
assert.match(card, /Review/)
assert.match(card, /ruknVisitPath/)

const gender = read('src/validation/assignmentValidation.ts')
assert.match(gender, /export function validateGenderMatch/)
assert.match(gender, /Male Rukn can only be connected to Male Karkuns/)

assert.doesNotMatch(read('firestore.rules'), /INCREMENT 10/)
assert.doesNotMatch(page, /muttafiqRelationships\//)

console.log('OK: increment 10 Karkun workspace verification passed.')
