/**
 * Increment 05 — Person Detail + Add/Edit presentation.
 * Run: npx vite-node scripts/verify-increment-05-person-detail.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isPathAllowedForRole } from '@/lib/auth/authorization'
import { ROUTES, adminARuknDetailPath, adminKarkunProfilePath, adminRuknDetailPath } from '@/constants/routes'
import { adminPersonProfilePath } from '@/lib/personProfile/ProfilePresenter'
import {
  rufaqaBackLabel,
  rufaqaCategoryFromPathname,
  rufaqaCategoryPath,
  RUFAQA_LABEL_UR,
} from '@/lib/rufaqa/rufaqaPresentation'

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

assert.equal(RUFAQA_LABEL_UR, 'رفقاء')
assert.equal(adminPersonProfilePath('kr-1'), adminKarkunProfilePath('kr-1'))
assert.equal(adminKarkunProfilePath('kr-1'), '/admin/karkun/kr-1')
assert.equal(adminRuknDetailPath('R001'), '/admin/rukn/R001')
assert.equal(adminARuknDetailPath('AR01'), '/admin/a-rukn/AR01')
assert.equal(rufaqaCategoryFromPathname('/admin/karkun/kr-1'), 'karkun')
assert.equal(rufaqaCategoryFromPathname('/admin/rukn/R001'), 'rukn')
assert.equal(rufaqaCategoryFromPathname('/admin/a-rukn/AR01'), 'a-rukn')
assert.equal(rufaqaBackLabel('karkun'), 'Rufaqa → Karkun')
assert.equal(rufaqaCategoryPath('muttafiqeen'), ROUTES.ADMIN_MUTTAFIQEEN)

const router = read('src/routes/AppRouter.tsx')
assert.match(router, /path="karkun\/:karkunId"/)
assert.match(router, /path="rukn\/:ruknId"/)
assert.match(router, /path="a-rukn\/:ruknId"/)
assert.doesNotMatch(router, /path="rufaqa\/:id"/)
assert.doesNotMatch(router, /path="people\/:id"/)
assert.match(router, /allowedRole="administrator"/)

assert.equal(isPathAllowedForRole('/admin/karkun/kr-1', 'administrator'), true)
assert.equal(isPathAllowedForRole('/admin/karkun/kr-1', 'rukn'), false)
assert.equal(isPathAllowedForRole('/admin/rukn/R001', 'rukn'), false)
assert.equal(isPathAllowedForRole('/rukn', 'rukn'), true)

const profile = read('src/pages/admin/KarkunProfilePage.tsx')
assert.match(profile, /PersonFormModal/)
assert.match(profile, /PersonIdentityChrome/)
assert.match(profile, /PersonOrganisationalReporting/)
assert.match(profile, /markWeeklyIjtemaAttendance|PersonOrganisationalReporting/)
assert.match(profile, /RegistryMaintenancePanel/)
assert.match(profile, /PromoteToARuknAction/)
assert.match(profile, /CommunicationActions/)
assert.match(profile, /Referred By:/)
assert.match(profile, /getMuttafiqConnectedRuknDisplayForPerson/)
assert.match(profile, /MuttafiqRuknConnectionRow/)
assert.match(profile, /isSoftRemoved/)
assert.match(profile, /Removed by:/)
assert.match(profile, /useRepositoryHydrationStatus/)
assert.match(profile, /Identity saved/)
assert.doesNotMatch(profile, /KarkunProfileForm/)
assert.doesNotMatch(profile, /Back to People/)
assert.doesNotMatch(profile, /People registry/)
assert.match(read('src/components/personDetail/PersonOrganisationalReporting.tsx'), /markWeeklyIjtemaAttendance/)
assert.match(read('src/components/personDetail/PersonOrganisationalReporting.tsx'), /updateJihRegistration/)
assert.match(read('src/components/personDetail/PersonOrganisationalReporting.tsx'), /updateMonthlyBaitulMaalContribution/)

const ruknDetail = read('src/pages/admin/RuknDetailPage.tsx')
assert.match(ruknDetail, /Overview/)
assert.match(ruknDetail, /Connections/)
assert.match(ruknDetail, /PersonFormModal/)
assert.match(ruknDetail, /updateRukn/)
assert.match(ruknDetail, /ConnectedAssignmentDeskCard/)
assert.match(ruknDetail, /Connected Karkuns/)
assert.match(ruknDetail, /ADMIN_A_RUKN/)
assert.match(ruknDetail, /sourcePersonId/)
assert.match(ruknDetail, /tab === 'connections'/)
assert.doesNotMatch(ruknDetail, /persistRuknDurable/)

const aRuknPage = read('src/pages/admin/ARuknRegistryPage.tsx')
assert.match(aRuknPage, /PersonFormModal/)
assert.match(aRuknPage, /updateRukn/)
assert.match(aRuknPage, /Edit/)

const overview = read('src/components/personProfile/Person360Overview.tsx')
assert.match(overview, /Campaign Journey/)
assert.match(overview, /ContinuousKarkunJourneyStrip/)
assert.match(overview, /relationshipDisplay/)
assert.doesNotMatch(overview, /360° Person Profile/)
assert.doesNotMatch(overview, /getActiveAssignmentsForKarkun/)

const actions = read('src/components/communication/CommunicationActions.tsx')
assert.match(actions, /Compose WhatsApp message/)
assert.doesNotMatch(actions, /Coming in a future sprint/)

const form = read('src/components/forms/people/PersonFormModal.tsx')
assert.match(form, /Referred By Rukn/)
assert.match(form, /personLabel !== 'Muttafiq'/)

const karkunan = read('src/pages/admin/KarkunanPage.tsx')
assert.match(karkunan, /PersonFormModal/)
assert.match(karkunan, /\{ requireReferral: true \}/)

const muttafiq = read('src/pages/admin/MuttafiqeenPage.tsx')
assert.match(muttafiq, /personLabel="Muttafiq"/)
assert.doesNotMatch(muttafiq, /requireReferral: true/)

const gender = read('src/validation/assignmentValidation.ts')
assert.match(gender, /validateGenderMatch/)
assert.match(gender, /Male Rukn can only be connected to Male Karkuns/)

const peopleStore = read('src/lib/peopleStore.ts')
assert.match(peopleStore, /export function canAssignByGender/)

assert.doesNotMatch(read('firestore.rules').slice(0, 40), /INCREMENT 05/)

console.log('OK: increment 05 Person Detail verification passed.')
