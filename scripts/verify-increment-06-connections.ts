/**
 * Increment 06 — Admin Connections (باہمی ربط) presentation.
 * Run: npx vite-node scripts/verify-increment-06-connections.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ADMIN_NAV_ITEMS, findActiveAdminNavItem, flattenAdminNavItems } from '@/constants/adminNavigation'
import { ROUTES, adminAssignmentsPath } from '@/constants/routes'
import { resolveAdminAssignmentsView } from '@/lib/connections/adminAssignmentsPresentation'
import { adminOpenConnectionHrefForPerson } from '@/lib/personProfile/ProfilePresenter'
import { isPathAllowedForRole } from '@/lib/auth/authorization'

const root = resolve(process.cwd())
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

assert.equal(findActiveAdminNavItem('/admin/assignments', '')?.id, 'assignments')
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'assignments')?.label,
  'باہمی ربط',
)
assert.equal(
  flattenAdminNavItems(ADMIN_NAV_ITEMS).find((item) => item.id === 'assignments')?.to,
  ROUTES.ADMIN_ASSIGNMENTS,
)
assert.equal(ROUTES.ADMIN_ASSIGNMENTS, '/admin/assignments')

assert.equal(resolveAdminAssignmentsView(new URLSearchParams()), 'mapping')
assert.equal(resolveAdminAssignmentsView(new URLSearchParams('view=mapping')), 'mapping')
assert.equal(resolveAdminAssignmentsView(new URLSearchParams('view=manage')), 'manage')
assert.equal(resolveAdminAssignmentsView(new URLSearchParams('view=assign')), 'manage')
assert.equal(resolveAdminAssignmentsView(new URLSearchParams('rukn=R001')), 'manage')
assert.equal(resolveAdminAssignmentsView(new URLSearchParams('rukn=R001&view=mapping')), 'mapping')
assert.equal(adminAssignmentsPath({ ruknId: 'R007' }), '/admin/assignments?rukn=R007')
assert.equal(
  adminAssignmentsPath({ ruknId: 'R007', view: 'manage' }),
  '/admin/assignments?rukn=R007&view=manage',
)

assert.equal(adminOpenConnectionHrefForPerson('__missing_person__'), ROUTES.ADMIN_ASSIGNMENTS)

const router = read('src/routes/AppRouter.tsx')
assert.match(router, /path="assignments"/)
assert.doesNotMatch(router, /path="connections"/)
assert.doesNotMatch(router, /path="admin\/connections"/)

assert.equal(isPathAllowedForRole('/admin/assignments', 'administrator'), true)
assert.equal(isPathAllowedForRole('/admin/assignments', 'rukn'), false)

const assignmentsPage = read('src/pages/admin/AssignmentManagementPage.tsx')
assert.match(assignmentsPage, /title="باہمی ربط"/)
assert.match(assignmentsPage, /changeView\('mapping'\)/)
assert.match(assignmentsPage, /changeView\('manage'\)/)
assert.match(assignmentsPage, />\s*Mapping\s*</)
assert.match(assignmentsPage, />\s*Manage\s*</)
assert.match(assignmentsPage, /AssignmentMappingView/)
assert.match(assignmentsPage, /AssignmentReviewQueue/)
assert.match(assignmentsPage, /ConnectedAssignmentDeskCard/)
assert.match(assignmentsPage, /getConnectedMuttafiqDisplayRowsForRukn/)
assert.match(assignmentsPage, /Read-only Muttafiq/)
assert.doesNotMatch(assignmentsPage, /assignMuttafiq/)
assert.doesNotMatch(assignmentsPage, /saveMuttafiq/)
assert.doesNotMatch(assignmentsPage, /muttafiqRelationships\//)

const review = read('src/components/assignment/AssignmentReviewQueue.tsx')
assert.match(review, /<details/)
assert.match(review, /Review Requests/)
assert.match(review, /decideAssignmentReviewRequest/)

const presenter = read('src/lib/personProfile/ProfilePresenter.ts')
assert.match(presenter, /adminOpenConnectionHrefForPerson/)
assert.match(presenter, /adminAssignmentsPath\(\{ ruknId \}\)/)
assert.match(presenter, /actives\.length !== 1/)

const ruknDetail = read('src/pages/admin/RuknDetailPage.tsx')
assert.match(ruknDetail, /Overview/)
assert.match(ruknDetail, /Connections/)
assert.match(ruknDetail, /ConnectedAssignmentDeskCard/)
assert.match(ruknDetail, /tab === 'connections'/)
assert.match(ruknDetail, /باہمی ربط/)

const rufaqaRukn = read('src/pages/admin/RuknModulePage.tsx')
assert.match(rufaqaRukn, /RuknConnectionsEntryRow/)
assert.match(rufaqaRukn, /Open باہمی ربط/)
assert.match(rufaqaRukn, /OfficialBriefingModal/)
assert.doesNotMatch(rufaqaRukn, /RuknAssignmentCard/)

const ruknKarkun = read('src/pages/rukn/RuknKarkunPage.tsx')
assert.match(ruknKarkun, />Karkun</)
assert.match(ruknKarkun, /MyKarkunPage/)
assert.match(ruknKarkun, /AvailableKarkunPage/)
assert.doesNotMatch(ruknKarkun, /باہمی ربط/)

const gender = read('src/validation/assignmentValidation.ts')
assert.match(gender, /export function validateGenderMatch/)
assert.match(gender, /Male Rukn can only be connected to Male Karkuns/)
assert.match(read('src/lib/peopleStore.ts'), /export function canAssignByGender/)

const engine = read('src/lib/assignmentEngine.ts')
assert.match(engine, /changeKarkunRuknAssignment/)
assert.match(read('src/stores/assignmentStore.ts'), /getActiveAssignmentsForKarkun/)

assert.match(read('src/types/assignment.ts'), /Active/)
assert.match(read('src/types/assignment.ts'), /Replaced/)
assert.match(read('src/types/assignment.ts'), /Unassigned/)

assert.doesNotMatch(read('firestore.rules'), /INCREMENT 06/)

console.log('OK: increment 06 Connections verification passed.')
